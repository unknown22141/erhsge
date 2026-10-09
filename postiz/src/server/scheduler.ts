import { AuthError, Credentials, getServerProvider, PostValue } from './providers';
import { readJson, writeJson } from './storage';

export interface Job {
  postId: string;
  group: string;
  publishDate: string;
  identifier: string;
  integrationId: string;
  integrationName: string;
  credentials: Credentials;
  values: PostValue[];
  settings: Record<string, any>;
}

export interface Result {
  postId: string;
  state: 'PUBLISHED' | 'ERROR';
  releaseURL?: string;
  error?: string;
  authError?: boolean;
  integrationId: string;
  at: string;
  // refreshed tokens, saved back in the browser
  credentials?: Credentials;
}

interface WebhookTarget {
  url: string;
  integrations: string[];
}

interface SchedulerState {
  running: Set<string>;
  busy: boolean;
  timer?: ReturnType<typeof setInterval>;
}

// survives hot reloads in dev
const state: SchedulerState = ((globalThis as any).__postizScheduler ||= { running: new Set<string>(), busy: false });

const JOBS = 'jobs.json';
const RESULTS = 'results.json';
const WEBHOOKS = 'webhooks.json';
const SETTINGS = 'settings.json';
const TOKENS = 'tokens.json';

let lock: Promise<unknown> = Promise.resolve();
// serializes reads and writes of the json files
const locked = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
};

export const syncJobs = (jobs: Job[], webhooks: WebhookTarget[], settings: { publicUrl?: string } = {}) =>
  locked(async () => {
    const results = await readJson<Result[]>(RESULTS, []);
    const done = new Set(results.map((r) => r.postId));
    // never queue again a post that is being published or waits for the browser to see its result
    const pending = jobs.filter((j) => !state.running.has(j.postId) && !done.has(j.postId));
    await writeJson(JOBS, pending);
    await writeJson(WEBHOOKS, webhooks);
    await writeJson(SETTINGS, settings);
    return pending.length;
  });

export const getResults = () => locked(() => readJson<Result[]>(RESULTS, []));

export const ackResults = (ids: string[]) =>
  locked(async () => {
    const results = await readJson<Result[]>(RESULTS, []);
    await writeJson(RESULTS, results.filter((r) => !ids.includes(r.postId)));
  });

const callWebhooks = async (job: Job, result: Result) => {
  const webhooks = await readJson<WebhookTarget[]>(WEBHOOKS, []);
  await Promise.all(
    webhooks
      .filter((w) => !w.integrations.length || w.integrations.includes(job.integrationId))
      .map((w) =>
        fetch(w.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: result.state === 'PUBLISHED' ? 'post.published' : 'post.failed',
            postId: job.postId,
            channel: { id: job.integrationId, name: job.integrationName, provider: job.identifier },
            releaseURL: result.releaseURL,
            error: result.error,
            content: job.values.map((v) => v.content),
            publishedAt: result.at,
          }),
        }).catch(() => {})
      )
  );
};

const newer = (a?: Credentials, b?: Credentials) => (Number(a?.savedAt || 0) >= Number(b?.savedAt || 0) ? a : b);

const publish = async (job: Job) => {
  let result: Result;
  let refreshed: Credentials | undefined;
  try {
    const { publicUrl } = await readJson<{ publicUrl?: string }>(SETTINGS, {});
    const tokens = await readJson<Record<string, Credentials>>(TOKENS, {});
    // a token refreshed by an earlier post is newer than the one the browser sent
    const credentials = newer(tokens[job.integrationId], job.credentials) || job.credentials;
    const { releaseURL } = await getServerProvider(job.identifier).publish(credentials, job.values, job.settings || {}, {
      publicUrl,
      updateCredentials: (c) => {
        refreshed = { ...c, savedAt: String(Date.now()) };
        locked(async () => {
          const all = await readJson<Record<string, Credentials>>(TOKENS, {});
          await writeJson(TOKENS, { ...all, [job.integrationId]: refreshed! });
        });
      },
    });
    result = { postId: job.postId, integrationId: job.integrationId, state: 'PUBLISHED', releaseURL, at: new Date().toISOString(), credentials: refreshed };
    console.log(`[postiz] published ${job.postId} on ${job.identifier}: ${releaseURL}`);
  } catch (e: any) {
    result = {
      postId: job.postId,
      integrationId: job.integrationId,
      state: 'ERROR',
      error: e?.message || String(e),
      authError: e instanceof AuthError,
      at: new Date().toISOString(),
      credentials: refreshed,
    };
    console.log(`[postiz] failed ${job.postId} on ${job.identifier}: ${result.error}`);
  }
  await locked(async () => {
    const results = await readJson<Result[]>(RESULTS, []);
    await writeJson(RESULTS, [...results.filter((r) => r.postId !== job.postId), result]);
  });
  state.running.delete(job.postId);
  callWebhooks(job, result);
};

export const runDue = async () => {
  if (state.busy) return;
  state.busy = true;
  try {
    const due = await locked(async () => {
      const jobs = await readJson<Job[]>(JOBS, []);
      const now = Date.now();
      const ready = jobs.filter((j) => new Date(j.publishDate).getTime() <= now && !state.running.has(j.postId));
      // claim them before posting, so a crash never posts twice
      await writeJson(JOBS, jobs.filter((j) => !ready.includes(j)));
      return ready;
    });
    due.forEach((job) => {
      state.running.add(job.postId);
      publish(job);
    });
  } finally {
    state.busy = false;
  }
};

export const startScheduler = () => {
  if (state.timer) return;
  state.timer = setInterval(() => runDue().catch(() => {}), 10000);
  runDue().catch(() => {});
  console.log('[postiz] scheduler started, checking for due posts every 10 seconds');
};
