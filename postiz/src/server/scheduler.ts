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

let lock: Promise<unknown> = Promise.resolve();
// serializes reads and writes of the json files
const locked = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
};

export const syncJobs = (jobs: Job[], webhooks: WebhookTarget[]) =>
  locked(async () => {
    const results = await readJson<Result[]>(RESULTS, []);
    const done = new Set(results.map((r) => r.postId));
    // never queue again a post that is being published or waits for the browser to see its result
    const pending = jobs.filter((j) => !state.running.has(j.postId) && !done.has(j.postId));
    await writeJson(JOBS, pending);
    await writeJson(WEBHOOKS, webhooks);
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

const publish = async (job: Job) => {
  let result: Result;
  try {
    const { releaseURL } = await getServerProvider(job.identifier).publish(job.credentials, job.values, job.settings || {});
    result = { postId: job.postId, integrationId: job.integrationId, state: 'PUBLISHED', releaseURL, at: new Date().toISOString() };
    console.log(`[postiz] published ${job.postId} on ${job.identifier}: ${releaseURL}`);
  } catch (e: any) {
    result = {
      postId: job.postId,
      integrationId: job.integrationId,
      state: 'ERROR',
      error: e?.message || String(e),
      authError: e instanceof AuthError,
      at: new Date().toISOString(),
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
