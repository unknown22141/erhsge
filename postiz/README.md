# Postiz clone (frontend)

A standalone recreation of the [Postiz](https://github.com/gitroomhq/postiz-app) social media scheduler UI/UX: layout, design tokens, animations and the main flows. It runs without a backend: all data lives in `localStorage` and a small in-browser "publisher" plays the role of the Postiz workers.

```bash
cd postiz
npm install
npm run dev   # http://localhost:4200
```

What works:
- Calendar: day / week / month / list views, current time line, drag and drop to reschedule, customer and channel filters
- Post composer: global vs per-channel editing, threads/comments with delays, character limits per platform, bold/underline, emoji, media library, signatures, tags, repeat, date picker, per-provider settings and validation, draft / schedule / post now, live previews (X, LinkedIn, Facebook, Instagram, YouTube)
- Channels: add (simulated OAuth), rename, picture, groups/customers, time slots, preferences, disable, delete, reconnect
- Analytics, Media library (upload, drag and drop), Settings (profile, team, webhooks, sets, signatures, API key), Billing, Agent chat, login/register, public post preview page with comments
- Dark/light mode, notifications, posting streak, mobile layout

Screenshots are in `preview/`. Use "Reset demo data" in the account menu to restore the seed data.

Design tokens, icons and platform assets come from Postiz, which is licensed under AGPL-3.0 (see `LICENSE`).
