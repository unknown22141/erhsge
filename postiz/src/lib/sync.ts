'use client';

// Keeps the server scheduler in sync with the scheduled posts of this browser,
// and brings back what the server published.

import { useDb } from './db';
import { toast } from '@/components/ui/toaster';
import { getProvider } from './providers';

const buildJobs = () => {
  const { posts, integrations, webhooks } = useDb.getState();
  const jobs = posts
    .filter((p) => p.state === 'QUEUE')
    .map((post) => {
      const integration = integrations.find((i) => i.id === post.integrationId);
      if (!integration || integration.disabled || !integration.credentials) return null;
      return {
        postId: post.id,
        group: post.group,
        publishDate: post.publishDate,
        identifier: integration.identifier,
        integrationId: integration.id,
        integrationName: integration.name,
        credentials: integration.credentials,
        values: post.values.map((v) => ({
          content: v.content,
          delay: v.delay || 0,
          media: v.media.map((m) => ({ path: m.path, type: m.type, name: m.name })),
        })),
        settings: post.settings,
      };
    })
    .filter(Boolean);
  return {
    jobs,
    webhooks: webhooks.map((w) => ({ url: w.url, integrations: w.integrations })),
  };
};

let lastPayload = '';
let timeout: ReturnType<typeof setTimeout> | undefined;

export const pushJobs = async (force = false) => {
  const payload = JSON.stringify(buildJobs());
  if (!force && payload === lastPayload) return;
  lastPayload = payload;
  try {
    await fetch('/api/jobs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload });
  } catch {
    lastPayload = '';
  }
};

const pullResults = async () => {
  try {
    const { results } = await (await fetch('/api/jobs', { cache: 'no-store' })).json();
    if (!results?.length) return;
    const ours = results.filter((r: any) => useDb.getState().posts.some((p) => p.id === r.postId));
    const applied = useDb.getState().applyResults(ours);
    const { integrations, addNotification } = useDb.getState();
    applied.forEach((post) => {
      const integration = integrations.find((i) => i.id === post.integrationId);
      const name = integration ? `${integration.name} (${getProvider(integration.identifier).name.split('\n')[0]})` : 'a channel';
      if (post.state === 'PUBLISHED') {
        addNotification(`Your post has been published on ${name}`);
        toast(`Your post has been published on ${name}`, 'success');
      } else {
        addNotification(`Error posting to ${name}: ${post.error}`);
        toast(`Error posting to ${name}`, 'warning');
      }
    });
    await fetch('/api/jobs/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: results.map((r: any) => r.postId) }),
    });
  } catch {}
};

export const startSync = () => {
  pushJobs(true);
  const unsubscribe = useDb.subscribe((state, prev) => {
    if (state.posts === prev.posts && state.integrations === prev.integrations && state.webhooks === prev.webhooks) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => pushJobs(), 300);
  });
  pullResults();
  const interval = setInterval(pullResults, 4000);
  return () => {
    unsubscribe();
    clearInterval(interval);
  };
};
