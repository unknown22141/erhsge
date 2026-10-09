import dayjs from 'dayjs';
import {
  Customer,
  Integration,
  MediaItem,
  Notification,
  Post,
  PostSet,
  Signature,
  Tag,
  TeamMember,
  User,
  Webhook,
} from './types';
import { avatar, makeId, placeholderImage, textToHtml } from './utils';

const defaultTimes = [{ time: 120 }, { time: 400 }, { time: 700 }];

export const createIntegration = (
  identifier: string,
  name: string,
  display: string,
  customer?: Customer
): Integration => ({
  id: makeId(12),
  internalId: makeId(8),
  name,
  display,
  identifier,
  picture: avatar(name),
  disabled: false,
  refreshNeeded: false,
  inBetweenSteps: false,
  customer,
  time: defaultTimes.map((p) => ({ ...p })),
  preferences: {},
});

export const seed = () => {
  const acme: Customer = { id: makeId(8), name: 'Acme Inc.' };

  const integrations: Integration[] = [
    createIntegration('x', 'Postiz Demo', '@postizdemo'),
    createIntegration('linkedin', 'Jordan Rivera', 'jordan-rivera'),
    createIntegration('instagram', 'Postiz Studio', '@postiz.studio'),
    createIntegration('facebook', 'Postiz Community', 'postiz.community'),
    createIntegration('threads', 'Postiz Threads', '@postiz.threads'),
    createIntegration('bluesky', 'Postiz Sky', '@postiz.bsky.social'),
    createIntegration('youtube', 'Acme Channel', '@acmechannel', acme),
    createIntegration('tiktok', 'Acme Clips', '@acme.clips', acme),
  ];
  integrations[5].refreshNeeded = true;

  const tags: Tag[] = [
    { name: 'Marketing', color: '#612BD3' },
    { name: 'Product', color: '#D82D7E' },
    { name: 'Launch', color: '#32D583' },
  ];

  const media: MediaItem[] = [
    'Launch Day',
    'New Feature',
    'Team Photo',
    'Product Shot',
    'Webinar',
    'Behind the Scenes',
    'Roadmap',
    'Thank You',
  ].map((label, index) => ({
    id: makeId(10),
    name: label.toLowerCase().replace(/\s+/g, '-') + '.png',
    path: placeholderImage(label, index + 3),
    type: 'image' as const,
    createdAt: dayjs().subtract(index, 'day').toISOString(),
  }));

  const texts = [
    'Big news! Our new scheduling engine is live 🚀 Plan a whole month of content in one sitting.',
    'Pro tip: batch your content on Mondays, schedule it with Postiz and spend the rest of the week engaging with your audience.',
    'We just crossed 20,000 creators using Postiz. Thank you for being part of the journey 💜',
    'Behind the scenes of our product team planning the next quarter. What feature should we build next?',
    'Join our live webinar on Thursday: "Growing on LinkedIn without burning out".',
    'Thread 🧵 5 lessons we learned from scheduling 1M posts:',
    'Weekend reading: how open source companies grow their community.',
    'New integration alert: you can now post directly to Bluesky and Threads!',
    'Consistency beats intensity. Show up every day, even with small posts.',
    'Our roadmap for the next release is public. Vote on the features you want.',
    'Happy Friday! What are you shipping this week?',
    'Case study: how Acme Inc. doubled their reach in 30 days.',
  ];

  const posts: Post[] = [];
  const now = dayjs();
  const startOfWeek = now.startOf('week').add(1, 'day');
  const offsets: Array<[number, number, number]> = [
    // [day offset from monday, hour, minute]
    [0, 9, 0],
    [0, 14, 30],
    [1, 10, 0],
    [1, 17, 0],
    [2, 8, 30],
    [2, 12, 0],
    [3, 9, 0],
    [3, 15, 0],
    [4, 11, 0],
    [4, 18, 0],
    [5, 10, 30],
    [6, 13, 0],
    [8, 9, 0],
    [9, 16, 0],
    [11, 10, 0],
    [-3, 10, 0],
    [-5, 15, 0],
    [15, 12, 0],
    [20, 9, 30],
  ];

  offsets.forEach(([day, hour, minute], index) => {
    const date = startOfWeek.add(day, 'day').hour(hour).minute(minute).second(0);
    const isPast = date.isBefore(now);
    const group = makeId(10);
    const channels =
      index % 4 === 0
        ? [integrations[0], integrations[1]]
        : [integrations[index % integrations.length]];
    channels.forEach((integration, channelIndex) => {
      const state: Post['state'] = isPast
        ? index % 7 === 3
          ? 'ERROR'
          : 'PUBLISHED'
        : index % 6 === 5
        ? 'DRAFT'
        : 'QUEUE';
      posts.push({
        id: makeId(12),
        group,
        integrationId: integration.id,
        publishDate: date.toISOString(),
        state,
        values: [
          {
            id: makeId(10),
            content: textToHtml(texts[index % texts.length]),
            media:
              index % 3 === 0 || ['instagram', 'youtube', 'tiktok'].includes(integration.identifier)
                ? [media[index % media.length]]
                : [],
          },
          ...(index === 5
            ? [
                {
                  id: makeId(10),
                  content: textToHtml('1. Pick a posting schedule and stick to it.'),
                  media: [],
                },
                {
                  id: makeId(10),
                  content: textToHtml('2. Repurpose your best content across channels.'),
                  media: [],
                },
              ]
            : []),
        ],
        tags: index % 3 === 0 ? ['Marketing'] : index % 3 === 1 ? ['Product'] : [],
        settings:
          integration.identifier === 'x'
            ? { who_can_reply_post: 'everyone' }
            : integration.identifier === 'youtube'
            ? { title: 'Weekly update', type: 'public' }
            : {},
        releaseURL:
          state === 'PUBLISHED'
            ? `https://example.com/${integration.identifier}/${makeId(8)}`
            : undefined,
        error:
          state === 'ERROR'
            ? 'The channel token expired, please reconnect the channel and try again.'
            : undefined,
        createdAt: date.subtract(2, 'day').toISOString(),
      });
      void channelIndex;
    });
  });

  const user: User = {
    id: makeId(10),
    name: 'Jordan Rivera',
    email: 'jordan@postiz.demo',
    picture: avatar('Jordan Rivera'),
    role: 'ADMIN',
    orgId: makeId(10),
    orgName: 'Postiz Demo',
    tier: 'PRO',
    totalChannels: 30,
  };

  const signatures: Signature[] = [
    {
      id: makeId(10),
      content: textToHtml('—\nScheduled with Postiz 💜'),
      autoAdd: false,
    },
  ];

  const sets: PostSet[] = [];

  const webhooks: Webhook[] = [];

  const team: TeamMember[] = [
    { id: user.id, name: user.name, email: user.email, role: 'ADMIN' },
    { id: makeId(10), name: 'Sam Lee', email: 'sam@postiz.demo', role: 'USER' },
  ];

  const notifications: Notification[] = [
    {
      id: makeId(10),
      content: 'Your post has been published on X',
      createdAt: now.subtract(2, 'hour').toISOString(),
      read: false,
    },
    {
      id: makeId(10),
      content: 'Channel Postiz Sky needs to be reconnected',
      createdAt: now.subtract(1, 'day').toISOString(),
      read: false,
    },
    {
      id: makeId(10),
      content: 'Welcome to Postiz! Add your first channel to get started.',
      createdAt: now.subtract(3, 'day').toISOString(),
      read: true,
    },
  ];

  return {
    user,
    customers: [acme],
    integrations,
    posts,
    tags,
    media,
    signatures,
    sets,
    webhooks,
    team,
    notifications,
  };
};
