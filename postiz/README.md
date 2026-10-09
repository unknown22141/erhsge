# Postiz (local)

A local social media scheduler with the [Postiz](https://github.com/gitroomhq/postiz-app) interface. It starts empty, you connect your own accounts, and scheduled posts are published for real by the local server.

## Start

Requires Node.js 20.9 or newer.

```bash
npm install
npm start
```

`npm start` builds the app once (about 30 seconds) and then serves it. Pages load instantly after that. Open http://localhost:3000.

`npm run dev` also works, but every page is compiled the first time you open it, so it feels slow.

## Channels that publish for real

| Platform | What you need |
| --- | --- |
| Bluesky | Your handle and an app password (bsky.app → Settings → Privacy and security → App passwords) |
| Mastodon | Your server URL and an access token (Preferences → Development → New application, scopes `read:accounts write:statuses write:media`) |
| Telegram | A bot token from @BotFather, with the bot added as admin of your channel or group |
| Discord | A channel webhook URL (Channel settings → Integrations → Webhooks) |

The other platforms (X, LinkedIn, Instagram, Facebook, TikTok, YouTube...) need a developer app registered with each platform and approved API keys, so they are greyed out. The self-hosted Postiz supports them once you have those keys.

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
