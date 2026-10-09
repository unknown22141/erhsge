// The big platforms. The API calls follow the Postiz providers
// (libraries/nestjs-libraries/src/integrations/social/*.provider.ts).

import { TwitterApi, ApiResponseError } from 'twitter-api-v2';
import { AuthError, ChannelInfo, check, Credentials, json, PublishContext, sleep } from './http';
import { loadMedia, MediaRef } from './media';
import { toPlainText } from './text';

interface PostValue {
  content: string;
  media: MediaRef[];
  delay?: number;
}

type Provider = {
  verify?: (c: Credentials) => Promise<ChannelInfo>;
  oauth?: {
    authUrl: (c: Credentials, redirectUri: string, state: string) => string;
    exchange: (c: Credentials, code: string, redirectUri: string) => Promise<ChannelInfo>;
  };
  publish: (c: Credentials, values: PostValue[], settings: Record<string, any>, ctx: PublishContext) => Promise<{ releaseURL: string }>;
};

const META = 'v25.0';
const form = (data: Record<string, string | number | boolean | undefined>) => {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => v !== undefined && v !== '' && body.append(k, String(v)));
  return body;
};
const waitDelay = async (index: number, value: PostValue) => {
  if (index > 0 && value.delay) await sleep(value.delay * 60000);
};
const firstUrl = (text: string) => /https?:\/\/[^\s]+/.exec(text)?.[0];

// Instagram and Threads download the pictures themselves, so they need a public link
const publicMediaUrl = (ref: MediaRef, ctx: PublishContext, platform: string) => {
  if (/^https?:\/\//.test(ref.path)) return ref.path;
  if (ref.path.startsWith('/api/uploads/') && ctx.publicUrl) {
    return ctx.publicUrl.replace(/\/$/, '') + ref.path;
  }
  throw new Error(
    `${platform} downloads the media from a public link: set the Public URL in Settings (see the instructions there) and try again`
  );
};

// ---------- X ----------
const xClient = (c: Credentials) =>
  new TwitterApi({
    appKey: c.apiKey?.trim(),
    appSecret: c.apiSecret?.trim(),
    accessToken: c.accessToken?.trim(),
    accessSecret: c.accessSecret?.trim(),
  });

const xError = (e: any, what: string) => {
  if (e instanceof ApiResponseError) {
    const detail = e.data?.detail || e.data?.title || (e.data as any)?.errors?.[0]?.message || e.message;
    const message = `${what}: ${detail}`;
    if (e.code === 401 || e.code === 403) return new AuthError(message);
    return new Error(message);
  }
  return e;
};

const x: Provider = {
  async verify(c) {
    try {
      const { data } = await xClient(c).v2.me({ 'user.fields': ['profile_image_url', 'username', 'name'] });
      return {
        internalId: data.id,
        name: data.name,
        display: '@' + data.username,
        picture: data.profile_image_url,
        credentials: { ...c, username: data.username },
      };
    } catch (e) {
      throw xError(e, 'X login failed');
    }
  },
  async publish(c, values, settings) {
    const client = xClient(c);
    let replyTo: string | undefined;
    let url = '';
    const replySettings: Record<string, string> = {
      following: 'following',
      mentionedUsers: 'mentionedUsers',
      subscribers: 'subscribers',
      verified: 'verified',
    };
    const community = /communities\/(\d+)/.exec(settings?.community || '')?.[1];
    try {
      for (const [index, value] of values.entries()) {
        await waitDelay(index, value);
        const mediaIds: string[] = [];
        for (const ref of value.media.slice(0, 4)) {
          const media = await loadMedia(ref);
          const id = await client.v2.uploadMedia(media.buffer, {
            media_type: media.mime as any,
            ...(media.type === 'video' ? { media_category: 'tweet_video' as any } : {}),
          });
          if (media.type === 'video') {
            // wait for X to process the video before tweeting it
            for (let i = 0; i < 60; i++) {
              const status: any = await client.v2.get('media/upload', { command: 'STATUS', media_id: id }).catch(() => null);
              const state = status?.data?.processing_info?.state;
              if (!state || state === 'succeeded') break;
              if (state === 'failed') throw new Error('X could not process the video');
              await sleep((status.data.processing_info.check_after_secs || 3) * 1000);
            }
          }
          mediaIds.push(id);
        }
        const { data } = await client.v2.tweet({
          text: toPlainText(value.content),
          ...(mediaIds.length ? { media: { media_ids: mediaIds as any } } : {}),
          ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}),
          ...(!replyTo && replySettings[settings?.who_can_reply_post] ? { reply_settings: replySettings[settings.who_can_reply_post] as any } : {}),
          ...(!replyTo && community ? { community_id: community } : {}),
        } as any);
        replyTo = data.id;
        url = url || `https://x.com/${c.username || 'i/web'}/status/${data.id}`;
      }
    } catch (e) {
      throw xError(e, 'X post failed');
    }
    return { releaseURL: url };
  },
};

// ---------- Instagram (Instagram Login) ----------
const igGet = (path: string, token: string, fields?: string) =>
  fetch(`https://graph.instagram.com/${META}/${path}?${fields ? `fields=${fields}&` : ''}access_token=${encodeURIComponent(token)}`);

const igRefresh = async (c: Credentials, ctx: PublishContext) => {
  // long lived tokens last 60 days, refresh them once a week
  if (c.refreshedAt && Date.now() - Number(c.refreshedAt) < 7 * 86400000) return c.accessToken;
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c.accessToken)}`);
  if (!res.ok) return c.accessToken;
  const { access_token } = await res.json();
  if (access_token) ctx.updateCredentials({ ...c, accessToken: access_token, refreshedAt: String(Date.now()) });
  return access_token || c.accessToken;
};

const waitForContainer = async (url: (id: string) => string, id: string, platform: string) => {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(url(id));
    const data = await res.json().catch(() => ({}));
    const status = data.status_code || data.status;
    if (!status || status === 'FINISHED' || status === 'PUBLISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`${platform} could not process the media: ${data.error_message || status}`);
    await sleep(3000);
  }
  throw new Error(`${platform} took too long to process the media`);
};

const instagram: Provider = {
  async verify(c) {
    const token = c.accessToken?.trim();
    const me = await json(await igGet('me', token, 'user_id,username,name,profile_picture_url'), 'Instagram login failed');
    return {
      internalId: String(me.user_id || me.id),
      name: me.name || me.username,
      display: '@' + me.username,
      picture: me.profile_picture_url,
      credentials: { accessToken: token, userId: String(me.user_id || me.id), username: me.username, refreshedAt: String(Date.now()) },
    };
  },
  async publish(c, values, settings, ctx) {
    const token = await igRefresh(c, ctx);
    const [first, ...comments] = values;
    if (!first?.media.length) throw new Error('Instagram needs at least one picture or video');
    const caption = toPlainText(first.content);
    const story = settings?.post_type === 'story';
    const createContainer = async (ref: MediaRef, carousel: boolean) => {
      const mediaUrl = publicMediaUrl(ref, ctx, 'Instagram');
      const data = await json(
        await fetch(`https://graph.instagram.com/${META}/${c.userId}/media`, {
          method: 'POST',
          body: form({
            ...(ref.type === 'video'
              ? { video_url: mediaUrl, media_type: story ? 'STORIES' : carousel ? 'VIDEO' : 'REELS' }
              : { image_url: mediaUrl, ...(story ? { media_type: 'STORIES' } : {}) }),
            ...(carousel ? { is_carousel_item: true } : { caption }),
            access_token: token,
          }),
        }),
        'Instagram upload failed'
      );
      await waitForContainer((id) => `https://graph.instagram.com/${META}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`, data.id, 'Instagram');
      return data.id as string;
    };

    let creationId: string;
    if (first.media.length === 1 || story) {
      creationId = await createContainer(first.media[0], false);
    } else {
      const children = [];
      for (const ref of first.media.slice(0, 10)) children.push(await createContainer(ref, true));
      const carousel = await json(
        await fetch(`https://graph.instagram.com/${META}/${c.userId}/media`, {
          method: 'POST',
          body: form({ media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token }),
        }),
        'Instagram carousel failed'
      );
      await waitForContainer((id) => `https://graph.instagram.com/${META}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`, carousel.id, 'Instagram');
      creationId = carousel.id;
    }
    const published = await json(
      await fetch(`https://graph.instagram.com/${META}/${c.userId}/media_publish`, {
        method: 'POST',
        body: form({ creation_id: creationId, access_token: token }),
      }),
      'Instagram publish failed'
    );
    for (const [index, comment] of comments.entries()) {
      await waitDelay(index + 1, comment);
      await check(
        await fetch(`https://graph.instagram.com/${META}/${published.id}/comments`, {
          method: 'POST',
          body: form({ message: toPlainText(comment.content), access_token: token }),
        }),
        'Instagram comment failed'
      );
    }
    const { permalink } = await (await igGet(published.id, token, 'permalink')).json().catch(() => ({}));
    return { releaseURL: permalink || `https://www.instagram.com/${c.username}/` };
  },
};

// ---------- Facebook Page ----------
const fbForm = async (url: string, fields: Record<string, string>, file?: { buffer: Buffer; mime: string; filename: string }) => {
  const body = new FormData();
  Object.entries(fields).forEach(([k, v]) => body.append(k, v));
  if (file) body.append('source', new Blob([new Uint8Array(file.buffer)], { type: file.mime }), file.filename);
  return fetch(url, { method: 'POST', body });
};

const facebook: Provider = {
  async verify(c) {
    const appId = c.appId?.trim();
    const appSecret = c.appSecret?.trim();
    // a user token from the Graph API Explorer lasts one hour: exchange it for a long lived one,
    // the page tokens it gives never expire
    const long = await json(
      await fetch(
        `https://graph.facebook.com/${META}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(c.userToken?.trim())}`
      ),
      'Facebook login failed'
    );
    const pages = await json(
      await fetch(`https://graph.facebook.com/${META}/me/accounts?fields=id,name,access_token,picture.type(large)&limit=100&access_token=${encodeURIComponent(long.access_token)}`),
      'Could not load your Facebook pages'
    );
    const wanted = c.pageId?.trim();
    const page = (pages.data || []).find((p: any) => !wanted || p.id === wanted || p.name.toLowerCase() === wanted.toLowerCase());
    if (!page) {
      throw new Error(
        pages.data?.length
          ? `Page not found, your pages are: ${pages.data.map((p: any) => `${p.name} (${p.id})`).join(', ')}`
          : 'This account has no Facebook page, or the token is missing the pages_show_list permission'
      );
    }
    return {
      internalId: page.id,
      name: page.name,
      display: page.name,
      picture: page.picture?.data?.url,
      credentials: { appId, appSecret, pageId: page.id, pageToken: page.access_token },
    };
  },
  async publish(c, values, settings) {
    const base = `https://graph.facebook.com/${META}`;
    const token = c.pageToken;
    const [first, ...comments] = values;
    const message = toPlainText(first.content);
    let postId: string;
    const media = [];
    for (const ref of first.media.slice(0, 10)) media.push(await loadMedia(ref));
    const video = media.find((m) => m.type === 'video');
    if (video) {
      const data = await json(
        await fbForm(`https://graph-video.facebook.com/${META}/${c.pageId}/videos`, { description: message, access_token: token }, video),
        'Facebook video upload failed'
      );
      return { releaseURL: `https://www.facebook.com/${c.pageId}/videos/${data.id}` };
    } else if (media.length === 1) {
      const data = await json(await fbForm(`${base}/${c.pageId}/photos`, { caption: message, access_token: token }, media[0]), 'Facebook photo upload failed');
      postId = data.post_id || data.id;
    } else if (media.length > 1) {
      const ids = [];
      for (const m of media) {
        const data = await json(await fbForm(`${base}/${c.pageId}/photos`, { published: 'false', access_token: token }, m), 'Facebook photo upload failed');
        ids.push(data.id);
      }
      const body = form({ message, access_token: token });
      ids.forEach((id, i) => body.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
      postId = (await json(await fetch(`${base}/${c.pageId}/feed`, { method: 'POST', body }), 'Facebook post failed')).id;
    } else {
      const link = settings?.url || undefined;
      postId = (await json(await fetch(`${base}/${c.pageId}/feed`, { method: 'POST', body: form({ message, link, access_token: token }) }), 'Facebook post failed')).id;
    }
    for (const [index, comment] of comments.entries()) {
      await waitDelay(index + 1, comment);
      await check(
        await fetch(`${base}/${postId}/comments`, { method: 'POST', body: form({ message: toPlainText(comment.content), access_token: token }) }),
        'Facebook comment failed'
      );
    }
    return { releaseURL: `https://www.facebook.com/${postId}` };
  },
};

// ---------- Threads ----------
const threadsRefresh = async (c: Credentials, ctx: PublishContext) => {
  if (c.refreshedAt && Date.now() - Number(c.refreshedAt) < 7 * 86400000) return c.accessToken;
  const res = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(c.accessToken)}`);
  if (!res.ok) return c.accessToken;
  const { access_token } = await res.json();
  if (access_token) ctx.updateCredentials({ ...c, accessToken: access_token, refreshedAt: String(Date.now()) });
  return access_token || c.accessToken;
};

const threads: Provider = {
  async verify(c) {
    const token = c.accessToken?.trim();
    const me = await json(
      await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${encodeURIComponent(token)}`),
      'Threads login failed'
    );
    return {
      internalId: me.id,
      name: me.name || me.username,
      display: '@' + me.username,
      picture: me.threads_profile_picture_url,
      credentials: { accessToken: token, userId: me.id, username: me.username, refreshedAt: String(Date.now()) },
    };
  },
  async publish(c, values, _settings, ctx) {
    const token = await threadsRefresh(c, ctx);
    const base = `https://graph.threads.net/v1.0`;
    const status = (id: string) => `${base}/${id}?fields=status,error_message&access_token=${encodeURIComponent(token)}`;
    const container = async (params: Record<string, any>) => {
      const data = await json(await fetch(`${base}/${c.userId}/threads`, { method: 'POST', body: form({ ...params, access_token: token }) }), 'Threads upload failed');
      return data.id as string;
    };
    let replyTo: string | undefined;
    let url = '';
    for (const [index, value] of values.entries()) {
      await waitDelay(index, value);
      const text = toPlainText(value.content);
      let creationId: string;
      if (!value.media.length) {
        creationId = await container({ media_type: 'TEXT', text, reply_to_id: replyTo });
      } else if (value.media.length === 1) {
        const ref = value.media[0];
        const mediaUrl = publicMediaUrl(ref, ctx, 'Threads');
        creationId = await container({
          media_type: ref.type === 'video' ? 'VIDEO' : 'IMAGE',
          ...(ref.type === 'video' ? { video_url: mediaUrl } : { image_url: mediaUrl }),
          text,
          reply_to_id: replyTo,
        });
      } else {
        const children = [];
        for (const ref of value.media.slice(0, 20)) {
          const mediaUrl = publicMediaUrl(ref, ctx, 'Threads');
          const id = await container({
            media_type: ref.type === 'video' ? 'VIDEO' : 'IMAGE',
            ...(ref.type === 'video' ? { video_url: mediaUrl } : { image_url: mediaUrl }),
            is_carousel_item: true,
          });
          await waitForContainer(status, id, 'Threads');
          children.push(id);
        }
        creationId = await container({ media_type: 'CAROUSEL', children: children.join(','), text, reply_to_id: replyTo });
      }
      await waitForContainer(status, creationId, 'Threads');
      const published = await json(
        await fetch(`${base}/${c.userId}/threads_publish`, { method: 'POST', body: form({ creation_id: creationId, access_token: token }) }),
        'Threads publish failed'
      );
      replyTo = published.id;
      if (!url) {
        const { permalink } = await (await fetch(`${base}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({}));
        url = permalink || `https://www.threads.net/@${c.username}`;
      }
    }
    return { releaseURL: url };
  },
};

// ---------- LinkedIn ----------
const liHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'LinkedIn-Version': '202601',
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
});

// LinkedIn "little text" needs these characters escaped
const liText = (text: string) => text.replace(/[\\<>#~_|[\]*(){}@]/g, (m) => '\\' + m);

const linkedin: Provider = {
  async verify(c) {
    const token = c.accessToken?.trim();
    const me = await json(await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } }), 'LinkedIn login failed');
    return {
      internalId: me.sub,
      name: me.name,
      display: me.email || me.name,
      picture: me.picture,
      credentials: { accessToken: token, personId: me.sub },
    };
  },
  async publish(c, values) {
    const token = c.accessToken;
    const owner = `urn:li:person:${c.personId}`;
    const [first, ...comments] = values;
    const mediaIds: string[] = [];
    for (const ref of first.media.slice(0, 20)) {
      const media = await loadMedia(ref);
      if (media.type === 'video') {
        const init = await json(
          await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
            method: 'POST',
            headers: liHeaders(token),
            body: JSON.stringify({ initializeUploadRequest: { owner, fileSizeBytes: media.buffer.length, uploadCaptions: false, uploadThumbnail: false } }),
          }),
          'LinkedIn video upload failed'
        );
        const etags = [];
        for (const part of init.value.uploadInstructions) {
          const res = await check(
            await fetch(part.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: new Uint8Array(media.buffer.subarray(part.firstByte, part.lastByte + 1)),
            }),
            'LinkedIn video upload failed'
          );
          etags.push(res.headers.get('etag'));
        }
        await check(
          await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
            method: 'POST',
            headers: liHeaders(token),
            body: JSON.stringify({ finalizeUploadRequest: { video: init.value.video, uploadToken: init.value.uploadToken || '', uploadedPartIds: etags } }),
          }),
          'LinkedIn video upload failed'
        );
        mediaIds.push(init.value.video);
      } else {
        const init = await json(
          await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
            method: 'POST',
            headers: liHeaders(token),
            body: JSON.stringify({ initializeUploadRequest: { owner } }),
          }),
          'LinkedIn image upload failed'
        );
        await check(
          await fetch(init.value.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': media.mime }, body: new Uint8Array(media.buffer) }),
          'LinkedIn image upload failed'
        );
        mediaIds.push(init.value.image);
      }
    }
    const content =
      mediaIds.length === 1
        ? { content: { media: { id: mediaIds[0] } } }
        : mediaIds.length > 1
        ? { content: { multiImage: { images: mediaIds.map((id) => ({ id })) } } }
        : {};
    const res = await check(
      await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: liHeaders(token),
        body: JSON.stringify({
          author: owner,
          commentary: liText(toPlainText(first.content)),
          visibility: 'PUBLIC',
          distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
          ...content,
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      }),
      'LinkedIn post failed'
    );
    const postUrn = res.headers.get('x-restli-id')!;
    for (const [index, comment] of comments.entries()) {
      await waitDelay(index + 1, comment);
      await check(
        await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`, {
          method: 'POST',
          headers: liHeaders(token),
          body: JSON.stringify({ actor: owner, object: postUrn, message: { text: toPlainText(comment.content) } }),
        }),
        'LinkedIn comment failed'
      );
    }
    return { releaseURL: `https://www.linkedin.com/feed/update/${postUrn}` };
  },
};

// ---------- TikTok ----------
const tiktokToken = async (c: Credentials, ctx: PublishContext) => {
  if (Number(c.expiresAt) > Date.now() + 60000) return c.accessToken;
  const data = await json(
    await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ client_key: c.clientId, client_secret: c.clientSecret, grant_type: 'refresh_token', refresh_token: c.refreshToken }),
    }),
    'TikTok token refresh failed'
  );
  if (!data.access_token) throw new AuthError(`TikTok token refresh failed: ${data.error_description || data.error}`);
  ctx.updateCredentials({ ...c, accessToken: data.access_token, refreshToken: data.refresh_token || c.refreshToken, expiresAt: String(Date.now() + data.expires_in * 1000) });
  return data.access_token;
};

const tiktokApi = async (token: string, path: string, body?: any) => {
  const res = await fetch(`https://open.tiktokapis.com/v2/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (data.error?.code && data.error.code !== 'ok') {
    const message = `TikTok: ${data.error.message || data.error.code}`;
    if (res.status === 401 || data.error.code === 'access_token_invalid') throw new AuthError(message);
    throw new Error(message);
  }
  return data.data;
};

const tiktok: Provider = {
  oauth: {
    authUrl: (c, redirectUri, state) =>
      'https://www.tiktok.com/v2/auth/authorize/' +
      `?client_key=${encodeURIComponent(c.clientId.trim())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}&response_type=code` +
      `&scope=${encodeURIComponent('user.info.basic,user.info.profile,video.publish,video.upload')}`,
    async exchange(c, code, redirectUri) {
      const token = await json(
        await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ client_key: c.clientId.trim(), client_secret: c.clientSecret.trim(), code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
        }),
        'TikTok login failed'
      );
      if (!token.access_token) throw new Error(`TikTok login failed: ${token.error_description || token.error}`);
      const user = await json(
        await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username', { headers: { Authorization: `Bearer ${token.access_token}` } }),
        'TikTok profile failed'
      );
      const u = user.data.user;
      return {
        internalId: u.open_id,
        name: u.display_name,
        display: '@' + (u.username || u.display_name),
        picture: u.avatar_url,
        credentials: {
          clientId: c.clientId.trim(),
          clientSecret: c.clientSecret.trim(),
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: String(Date.now() + token.expires_in * 1000),
          username: u.username || '',
        },
      };
    },
  },
  async publish(c, values, settings, ctx) {
    const token = await tiktokToken(c, ctx);
    const [first] = values;
    const ref = first.media.find((m) => m.type === 'video');
    if (!ref) throw new Error('TikTok needs a video (photo posts need a verified domain on TikTok)');
    const video = await loadMedia(ref);
    const creator = await tiktokApi(token, 'post/publish/creator_info/query/');
    const options: string[] = creator.privacy_level_options || ['SELF_ONLY'];
    const privacy = options.includes(settings?.privacy_level) ? settings.privacy_level : options.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : options[0];
    const size = video.buffer.length;
    const chunkSize = size <= 64 * 1024 * 1024 ? size : 10 * 1024 * 1024;
    const totalChunkCount = size <= 64 * 1024 * 1024 ? 1 : Math.floor(size / chunkSize);
    const init = await tiktokApi(token, 'post/publish/video/init/', {
      post_info: {
        title: toPlainText(first.content).slice(0, 2200),
        privacy_level: privacy,
        disable_duet: !settings?.duet,
        disable_comment: !settings?.comment,
        disable_stitch: !settings?.stitch,
        brand_content_toggle: !!settings?.brand_content_toggle,
        brand_organic_toggle: false,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunkSize, total_chunk_count: totalChunkCount },
    });
    for (let i = 0; i < totalChunkCount; i++) {
      const start = i * chunkSize;
      const end = i === totalChunkCount - 1 ? size - 1 : start + chunkSize - 1;
      await check(
        await fetch(init.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': video.mime, 'Content-Range': `bytes ${start}-${end}/${size}` },
          body: new Uint8Array(video.buffer.subarray(start, end + 1)),
        }),
        'TikTok video upload failed'
      );
    }
    for (let i = 0; i < 100; i++) {
      await sleep(5000);
      const status = await tiktokApi(token, 'post/publish/status/fetch/', { publish_id: init.publish_id });
      if (status.status === 'FAILED') throw new Error(`TikTok rejected the video: ${status.fail_reason}`);
      if (status.status === 'PUBLISH_COMPLETE') {
        const id = status.publicaly_available_post_id?.[0];
        return { releaseURL: id ? `https://www.tiktok.com/@${c.username}/video/${id}` : `https://www.tiktok.com/@${c.username}` };
      }
    }
    return { releaseURL: `https://www.tiktok.com/@${c.username}` };
  },
};

// ---------- YouTube ----------
const googleToken = async (c: Credentials, ctx: PublishContext) => {
  if (Number(c.expiresAt) > Date.now() + 60000) return c.accessToken;
  const data = await json(
    await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: form({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: 'refresh_token' }),
    }),
    'YouTube token refresh failed'
  ).catch((e) => {
    throw new AuthError(e.message);
  });
  ctx.updateCredentials({ ...c, accessToken: data.access_token, expiresAt: String(Date.now() + data.expires_in * 1000) });
  return data.access_token;
};

const youtube: Provider = {
  oauth: {
    authUrl: (c, redirectUri, state) =>
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${encodeURIComponent(c.clientId.trim())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&access_type=offline&prompt=consent&state=${state}` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}`,
    async exchange(c, code, redirectUri) {
      const token = await json(
        await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: form({ code, client_id: c.clientId.trim(), client_secret: c.clientSecret.trim(), redirect_uri: redirectUri, grant_type: 'authorization_code' }),
        }),
        'YouTube login failed'
      );
      const channels = await json(
        await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${token.access_token}` } }),
        'Could not load your YouTube channel'
      );
      const channel = channels.items?.[0];
      if (!channel) throw new Error('This Google account has no YouTube channel');
      return {
        internalId: channel.id,
        name: channel.snippet.title,
        display: channel.snippet.customUrl || channel.snippet.title,
        picture: channel.snippet.thumbnails?.default?.url,
        credentials: {
          clientId: c.clientId.trim(),
          clientSecret: c.clientSecret.trim(),
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: String(Date.now() + token.expires_in * 1000),
        },
      };
    },
  },
  async publish(c, values, settings, ctx) {
    const token = await googleToken(c, ctx);
    const [first] = values;
    const ref = first.media.find((m) => m.type === 'video');
    if (!ref) throw new Error('YouTube needs a video');
    const video = await loadMedia(ref);
    const description = toPlainText(first.content);
    const init = await check(
      await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(video.buffer.length),
          'X-Upload-Content-Type': video.mime,
        },
        body: JSON.stringify({
          snippet: {
            title: (settings?.title || description.split('\n')[0] || 'Video').slice(0, 100),
            description,
            tags: (settings?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
            categoryId: '22',
          },
          status: { privacyStatus: settings?.type || 'public', selfDeclaredMadeForKids: settings?.selfDeclaredMadeForKids === 'yes' },
        }),
      }),
      'YouTube upload failed'
    );
    const uploaded = await json(
      await fetch(init.headers.get('location')!, { method: 'PUT', headers: { 'Content-Type': video.mime }, body: new Uint8Array(video.buffer) }),
      'YouTube upload failed'
    );
    return { releaseURL: `https://www.youtube.com/watch?v=${uploaded.id}` };
  },
};

// ---------- Pinterest ----------
const pinterestHost = (c: Credentials) => (c.sandbox === 'yes' ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com');
const basic = (c: Credentials) => 'Basic ' + Buffer.from(`${c.clientId.trim()}:${c.clientSecret.trim()}`).toString('base64');

const pinterestToken = async (c: Credentials, ctx: PublishContext) => {
  if (Number(c.expiresAt) > Date.now() + 60000) return c.accessToken;
  const data = await json(
    await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: { Authorization: basic(c), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ grant_type: 'refresh_token', refresh_token: c.refreshToken }),
    }),
    'Pinterest token refresh failed'
  ).catch((e) => {
    throw new AuthError(e.message);
  });
  ctx.updateCredentials({ ...c, accessToken: data.access_token, expiresAt: String(Date.now() + data.expires_in * 1000) });
  return data.access_token;
};

const pinterest: Provider = {
  oauth: {
    authUrl: (c, redirectUri, state) =>
      'https://www.pinterest.com/oauth/' +
      `?client_id=${encodeURIComponent(c.clientId.trim())}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&state=${state}` +
      `&scope=${encodeURIComponent('boards:read,pins:read,pins:write,user_accounts:read')}`,
    async exchange(c, code, redirectUri) {
      const token = await json(
        await fetch('https://api.pinterest.com/v5/oauth/token', {
          method: 'POST',
          headers: { Authorization: basic(c), 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
        }),
        'Pinterest login failed'
      );
      const auth = { Authorization: `Bearer ${token.access_token}` };
      const user = await json(await fetch('https://api.pinterest.com/v5/user_account', { headers: auth }), 'Pinterest profile failed');
      const boards = await json(await fetch(`${pinterestHost(c)}/v5/boards?page_size=250`, { headers: auth }), 'Could not load your boards');
      return {
        internalId: user.username,
        name: user.business_name || user.username,
        display: '@' + user.username,
        picture: user.profile_image,
        credentials: {
          clientId: c.clientId.trim(),
          clientSecret: c.clientSecret.trim(),
          sandbox: c.sandbox || 'no',
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: String(Date.now() + token.expires_in * 1000),
        },
        options: { board: (boards.items || []).map((b: any) => ({ value: b.id, label: b.name })) },
      };
    },
  },
  async publish(c, values, settings, ctx) {
    const token = await pinterestToken(c, ctx);
    const [first] = values;
    const images = [];
    for (const ref of first.media.slice(0, 5)) {
      const media = await loadMedia(ref);
      if (media.type === 'video') throw new Error('Pinterest video pins are not supported yet, use pictures');
      images.push({ content_type: media.mime === 'image/png' ? 'image/png' : 'image/jpeg', data: media.buffer.toString('base64') });
    }
    if (!images.length) throw new Error('Pinterest needs at least one picture');
    if (!settings?.board) throw new Error('Pick a board in the Pinterest settings of the post');
    const description = toPlainText(first.content);
    const pin = await json(
      await fetch(`${pinterestHost(c)}/v5/pins`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_id: settings.board,
          title: (settings.title || description.split('\n')[0]).slice(0, 100),
          description: description.slice(0, 500),
          ...(settings.link || firstUrl(description) ? { link: settings.link || firstUrl(description) } : {}),
          media_source:
            images.length === 1
              ? { source_type: 'image_base64', ...images[0] }
              : { source_type: 'multiple_image_base64', items: images },
        }),
      }),
      'Pinterest pin failed'
    );
    return { releaseURL: `https://www.pinterest.com/pin/${pin.id}` };
  },
};

// ---------- Reddit (personal "script" app) ----------
const redditAgent = (c: Credentials) => `web:postiz-local:1.0 (by /u/${c.username})`;

const redditToken = async (c: Credentials) => {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: basic(c), 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': redditAgent(c) },
    body: form({ grant_type: 'password', username: c.username?.trim(), password: c.password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new AuthError(`Reddit login failed: ${data.error_description || data.error || res.statusText}`);
  return data.access_token as string;
};

const redditPost = async (c: Credentials, token: string, path: string, body: Record<string, any>) => {
  const data = await json(
    await fetch(`https://oauth.reddit.com${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': redditAgent(c) },
      body: form({ api_type: 'json', ...body }),
    }),
    'Reddit post failed'
  );
  if (data.json?.errors?.length) throw new Error(`Reddit: ${data.json.errors.map((e: any[]) => e[1]).join(', ')}`);
  return data.json?.data || {};
};

const reddit: Provider = {
  async verify(c) {
    const token = await redditToken(c);
    const me = await json(await fetch('https://oauth.reddit.com/api/v1/me', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': redditAgent(c) } }), 'Reddit login failed');
    return {
      internalId: me.id,
      name: me.name,
      display: 'u/' + me.name,
      picture: (me.icon_img || '').split('?')[0] || undefined,
      credentials: { clientId: c.clientId.trim(), clientSecret: c.clientSecret.trim(), username: c.username.trim(), password: c.password },
    };
  },
  async publish(c, values, settings) {
    const token = await redditToken(c);
    const [first, ...comments] = values;
    const sr = String(settings?.subreddit || '').replace(/^\/?r\//i, '').trim();
    if (!sr) throw new Error('Set the subreddit in the Reddit settings of the post');
    if (!settings?.title) throw new Error('Set the title in the Reddit settings of the post');
    const text = toPlainText(first.content);
    const link = settings?.type === 'link' ? firstUrl(text) : undefined;
    if (settings?.type === 'link' && !link) throw new Error('A Reddit link post needs a link in the text');
    if (first.media.length && settings?.type !== 'link') throw new Error('Reddit picture posts are not supported yet, use a text or link post');
    const data = await redditPost(c, token, '/api/submit', {
      sr,
      title: settings.title,
      kind: link ? 'link' : 'self',
      ...(link ? { url: link } : { text }),
      resubmit: true,
    });
    let parent = data.name;
    for (const [index, comment] of comments.entries()) {
      await waitDelay(index + 1, comment);
      const reply = await redditPost(c, token, '/api/comment', { thing_id: parent, text: toPlainText(comment.content) });
      parent = reply.things?.[0]?.data?.name || parent;
    }
    return { releaseURL: data.url || `https://www.reddit.com/r/${sr}` };
  },
};

export const socialProviders: Record<string, Provider> = {
  x,
  'instagram-standalone': instagram,
  facebook,
  threads,
  linkedin,
  tiktok,
  youtube,
  pinterest,
  reddit,
};
