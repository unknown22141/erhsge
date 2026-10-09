# Postiz (local)

A local social media scheduler with the [Postiz](https://github.com/gitroomhq/postiz-app) interface. It starts empty, you connect your own accounts on 13 platforms, and scheduled posts are published for real by the local server.

## Start

Requires Node.js 20.9 or newer.

```bash
npm install
npm start
```

`npm start` builds the app once (about 30 seconds) and then serves it. Pages load instantly after that. Open http://localhost:3000.

`npm run dev` also works, but every page is compiled the first time you open it, so it feels slow.

## Channels that publish for real

Each platform only lets an app post if you register it with them, so you create a free developer app once and paste its keys. The Add Channel window shows the exact steps for each one.

| Platform | How it connects | Notes |
| --- | --- | --- |
| X | API Key + Secret, Access Token + Secret | Free plan works. Set the app permissions to "Read and write" before generating the access token |
| Instagram | Access token from the Meta app dashboard (Instagram Login) | Business or Creator account. Needs the Public URL to post media |
| Facebook Page | App ID + secret + a Graph API Explorer token | Exchanged for a page token that does not expire |
| Threads | Access token from the Meta app dashboard | Needs the Public URL to post pictures |
| LinkedIn | Access token from LinkedIn's OAuth Token Tools | Lasts 60 days, then use "Reconnect channel" |
| TikTok | Sign in with TikTok (client key + secret) | Videos only. Posts are private until TikTok audits your app |
| YouTube | Sign in with Google (client ID + secret) | Videos only. Unverified Google projects upload as private |
| Pinterest | Sign in with Pinterest (app ID + secret) | Pictures. Pick the board in the post settings |
| Reddit | Personal "script" app + your username and password | Text and link posts |
| Bluesky | Handle + app password | |
| Mastodon | Server URL + access token | |
| Telegram | Bot token + channel | |
| Discord | Channel webhook URL | |

## Public URL (Instagram, Threads, TikTok)

Instagram and Threads download your media from a public link, and TikTok only accepts https sign in addresses. Give the app a free public https address with a tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Paste the `https://….trycloudflare.com` address in Settings → Public URL and click Test. Quick tunnels get a new address each time they start.

## How publishing works

- The server checks for due posts every 10 seconds and publishes them, even when the browser is closed, as long as `npm start` is running.
- If the computer was off when a post was due, it is published as soon as you start the app again.
- Threads and comments, pictures and videos, delays between comments and repeated posts are supported.
- Webhooks (Settings → Webhooks) receive a POST for every published or failed post.

## Where your data is

- Channels, posts and settings: in your browser (the same browser you use to open the app).
- Uploaded media and the publishing queue: in the `.data/` folder of the project.
- Your keys never leave your computer except to go to the platform they belong to.

Design, icons and platform assets come from Postiz, licensed under AGPL-3.0 (see `LICENSE`).
