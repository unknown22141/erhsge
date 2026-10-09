import { loadMedia, MediaRef } from './media';
import { toMarkdown, toPlainText, toTelegramHtml } from './text';

import { AuthError, ChannelInfo, check, Credentials, PublishContext, sleep } from './http';
import { socialProviders } from './social';

export { AuthError };
export type { Credentials };

export interface PostValue {
  content: string;
  media: MediaRef[];
  delay?: number;
}

// ---------- Bluesky (AT Protocol) ----------
const bskyService = (c: Credentials) => (c.service || 'https://bsky.social').replace(/\/$/, '');

const bskySession = async (c: Credentials) => {
  const res = await fetch(`${bskyService(c)}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: c.identifier?.trim().replace(/^@/, ''), password: c.password?.trim() }),
  });
  await check(res, 'Bluesky login failed');
  return (await res.json()) as { accessJwt: string; did: string; handle: string };
};

// links, mentions and hashtags need "facets" with byte offsets to be clickable
const bskyFacets = (text: string) => {
  const encoder = new TextEncoder();
  const facets: any[] = [];
  const byteIndex = (i: number) => encoder.encode(text.slice(0, i)).length;
  for (const m of text.matchAll(/https?:\/\/[^\s]+[^\s.,!?;:)'"]/g)) {
    facets.push({
      index: { byteStart: byteIndex(m.index!), byteEnd: byteIndex(m.index! + m[0].length) },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }],
    });
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const start = m.index! + m[1].length;
    facets.push({
      index: { byteStart: byteIndex(start), byteEnd: byteIndex(start + m[2].length + 1) },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }],
    });
  }
  return facets;
};

const bluesky = {
  async verify(c: Credentials): Promise<ChannelInfo> {
    const session = await bskySession(c);
    const res = await fetch(`${bskyService(c)}/xrpc/app.bsky.actor.getProfile?actor=${session.did}`, {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    });
    const profile = res.ok ? await res.json() : {};
    return {
      internalId: session.did,
      name: profile.displayName || session.handle,
      display: '@' + session.handle,
      picture: profile.avatar,
    };
  },
  async publish(c: Credentials, values: PostValue[]) {
    const session = await bskySession(c);
    const auth = { Authorization: `Bearer ${session.accessJwt}` };
    let root: { uri: string; cid: string } | undefined;
    let parent: { uri: string; cid: string } | undefined;
    let firstUrl = '';
    for (const value of values) {
      if (parent && value.delay) await sleep(value.delay * 60000);
      const text = toPlainText(value.content);
      const images = [];
      for (const ref of value.media.slice(0, 4)) {
        const media = await loadMedia(ref);
        if (media.type === 'video') throw new Error('Videos are not supported for Bluesky yet, use pictures');
        const res = await fetch(`${bskyService(c)}/xrpc/com.atproto.repo.uploadBlob`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': media.mime },
          body: new Uint8Array(media.buffer),
        });
        await check(res, 'Bluesky image upload failed');
        images.push({ alt: '', image: (await res.json()).blob });
      }
      const record: any = {
        $type: 'app.bsky.feed.post',
        text,
        facets: bskyFacets(text),
        createdAt: new Date().toISOString(),
        ...(images.length ? { embed: { $type: 'app.bsky.embed.images', images } } : {}),
        ...(root && parent ? { reply: { root, parent } } : {}),
      };
      const res = await fetch(`${bskyService(c)}/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record }),
      });
      await check(res, 'Bluesky post failed');
      const created = (await res.json()) as { uri: string; cid: string };
      parent = created;
      root = root || created;
      if (!firstUrl) firstUrl = `https://bsky.app/profile/${session.handle}/post/${created.uri.split('/').pop()}`;
    }
    return { releaseURL: firstUrl };
  },
};

// ---------- Mastodon ----------
const mastoBase = (c: Credentials) => (c.instance || 'https://mastodon.social').trim().replace(/\/$/, '');
const mastoAuth = (c: Credentials) => ({ Authorization: `Bearer ${c.token?.trim()}` });

const mastodon = {
  async verify(c: Credentials): Promise<ChannelInfo> {
    const res = await fetch(`${mastoBase(c)}/api/v1/accounts/verify_credentials`, { headers: mastoAuth(c) });
    await check(res, 'Mastodon login failed');
    const account = await res.json();
    return {
      internalId: `${mastoBase(c)}#${account.id}`,
      name: account.display_name || account.username,
      display: '@' + account.acct,
      picture: account.avatar,
    };
  },
  async publish(c: Credentials, values: PostValue[], settings: Record<string, any>) {
    let replyTo: string | undefined;
    let firstUrl = '';
    for (const value of values) {
      if (replyTo && value.delay) await sleep(value.delay * 60000);
      const mediaIds: string[] = [];
      for (const ref of value.media.slice(0, 4)) {
        const media = await loadMedia(ref);
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(media.buffer)], { type: media.mime }), media.filename);
        const res = await fetch(`${mastoBase(c)}/api/v2/media`, { method: 'POST', headers: mastoAuth(c), body: form });
        await check(res, 'Mastodon media upload failed');
        let attachment = await res.json();
        // videos are processed asynchronously
        for (let i = 0; i < 60 && !attachment.url; i++) {
          await sleep(2000);
          attachment = await (await fetch(`${mastoBase(c)}/api/v1/media/${attachment.id}`, { headers: mastoAuth(c) })).json();
        }
        mediaIds.push(attachment.id);
      }
      const res = await fetch(`${mastoBase(c)}/api/v1/statuses`, {
        method: 'POST',
        headers: { ...mastoAuth(c), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: toPlainText(value.content),
          media_ids: mediaIds,
          visibility: settings?.visibility || 'public',
          ...(replyTo ? { in_reply_to_id: replyTo } : {}),
        }),
      });
      await check(res, 'Mastodon post failed');
      const status = await res.json();
      replyTo = status.id;
      firstUrl = firstUrl || status.url;
    }
    return { releaseURL: firstUrl };
  },
};

// ---------- Telegram ----------
const tgApi = (c: Credentials, method: string) => `https://api.telegram.org/bot${c.token?.trim()}/${method}`;

const tgCall = async (c: Credentials, method: string, body: FormData | Record<string, any>) => {
  const res = await fetch(tgApi(c, method), {
    method: 'POST',
    ...(body instanceof FormData ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    const message = `Telegram ${method} failed: ${json.description || res.statusText}`;
    if (res.status === 401) throw new AuthError(message);
    throw new Error(message);
  }
  return json.result;
};

const tgLink = (chat: any, messageId: number) =>
  chat.username ? `https://t.me/${chat.username}/${messageId}` : `https://t.me/c/${String(chat.id).replace(/^-100/, '')}/${messageId}`;

const telegram = {
  async verify(c: Credentials): Promise<ChannelInfo> {
    const bot = await tgCall(c, 'getMe', {});
    const chat = await tgCall(c, 'getChat', { chat_id: c.chat?.trim() });
    return {
      internalId: `${bot.id}:${chat.id}`,
      name: chat.title || chat.username || bot.first_name,
      display: chat.username ? '@' + chat.username : `via @${bot.username}`,
    };
  },
  async publish(c: Credentials, values: PostValue[]) {
    const chatId = c.chat?.trim();
    const chat = await tgCall(c, 'getChat', { chat_id: chatId });
    let replyTo: number | undefined;
    let firstUrl = '';
    for (const value of values) {
      if (replyTo && value.delay) await sleep(value.delay * 60000);
      const text = toTelegramHtml(value.content);
      const reply = replyTo ? { reply_parameters: JSON.stringify({ message_id: replyTo }) } : {};
      let message: any;
      if (!value.media.length) {
        message = await tgCall(c, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}) });
      } else if (value.media.length === 1) {
        const media = await loadMedia(value.media[0]);
        const form = new FormData();
        const field = media.type === 'video' ? 'video' : 'photo';
        form.append('chat_id', chatId);
        form.append(field, new Blob([new Uint8Array(media.buffer)], { type: media.mime }), media.filename);
        if (text) {
          form.append('caption', text);
          form.append('parse_mode', 'HTML');
        }
        Object.entries(reply).forEach(([k, v]) => form.append(k, v));
        message = await tgCall(c, media.type === 'video' ? 'sendVideo' : 'sendPhoto', form);
      } else {
        const form = new FormData();
        const group = [];
        for (const [i, ref] of value.media.slice(0, 10).entries()) {
          const media = await loadMedia(ref);
          form.append(`file${i}`, new Blob([new Uint8Array(media.buffer)], { type: media.mime }), media.filename);
          group.push({
            type: media.type === 'video' ? 'video' : 'photo',
            media: `attach://file${i}`,
            ...(i === 0 && text ? { caption: text, parse_mode: 'HTML' } : {}),
          });
        }
        form.append('chat_id', chatId);
        form.append('media', JSON.stringify(group));
        Object.entries(reply).forEach(([k, v]) => form.append(k, v));
        message = (await tgCall(c, 'sendMediaGroup', form))[0];
      }
      replyTo = message.message_id;
      firstUrl = firstUrl || tgLink(chat, message.message_id);
    }
    return { releaseURL: firstUrl };
  },
};

// ---------- Discord (webhook) ----------
const discord = {
  async verify(c: Credentials): Promise<ChannelInfo> {
    const res = await fetch(c.webhook.trim());
    await check(res, 'Discord webhook is not valid');
    const hook = await res.json();
    return {
      internalId: hook.id,
      name: hook.name || 'Discord',
      display: `#${hook.channel_id}`,
      picture: hook.avatar ? `https://cdn.discordapp.com/avatars/${hook.id}/${hook.avatar}.png` : undefined,
    };
  },
  async publish(c: Credentials, values: PostValue[]) {
    const url = c.webhook.trim();
    const hook = await (await check(await fetch(url), 'Discord webhook is not valid')).json();
    let firstUrl = '';
    let first = true;
    for (const value of values) {
      if (!first && value.delay) await sleep(value.delay * 60000);
      first = false;
      const content = toMarkdown(value.content).slice(0, 2000);
      let res: Response;
      if (!value.media.length) {
        res = await fetch(`${url}?wait=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      } else {
        const form = new FormData();
        const attachments = [];
        for (const [i, ref] of value.media.slice(0, 10).entries()) {
          const media = await loadMedia(ref);
          form.append(`files[${i}]`, new Blob([new Uint8Array(media.buffer)], { type: media.mime }), media.filename);
          attachments.push({ id: i, filename: media.filename });
        }
        form.append('payload_json', JSON.stringify({ content, attachments }));
        res = await fetch(`${url}?wait=true`, { method: 'POST', body: form });
      }
      await check(res, 'Discord post failed');
      const message = await res.json();
      firstUrl = firstUrl || `https://discord.com/channels/${hook.guild_id}/${message.channel_id}/${message.id}`;
    }
    return { releaseURL: firstUrl };
  },
};

export interface ServerProvider {
  // keys typed by the user, checked against the platform
  verify?: (c: Credentials) => Promise<ChannelInfo>;
  // "Sign in with ..." flow
  oauth?: {
    authUrl: (c: Credentials, redirectUri: string, state: string) => string;
    exchange: (c: Credentials, code: string, redirectUri: string) => Promise<ChannelInfo>;
  };
  publish: (
    c: Credentials,
    values: PostValue[],
    settings: Record<string, any>,
    ctx: PublishContext
  ) => Promise<{ releaseURL: string }>;
}

const registry: Record<string, ServerProvider> = { bluesky, mastodon, telegram, discord, ...socialProviders };

export const realProviders = Object.keys(registry);

export const getServerProvider = (identifier: string) => {
  const provider = registry[identifier];
  if (!provider) throw new Error(`${identifier} can't publish from this app`);
  return provider;
};
