// Provider catalog, mirroring the providers Postiz ships with
// (libraries/nestjs-libraries/src/integrations/social/*.provider.ts)

export type EditorType = 'normal' | 'markdown' | 'html';

export interface SettingField {
  key: string;
  label: string;
  type: 'input' | 'select' | 'checkbox' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

export interface ProviderDefinition {
  identifier: string;
  name: string;
  editor: EditorType;
  maxChars: number;
  // whether the provider supports comments / threads
  comments: boolean | 'no-media';
  toolTip?: string;
  isExternal?: boolean;
  customFields?: { key: string; label: string; type: 'text' | 'password' }[];
  // can connect and publish for real from this app
  real?: boolean;
  connect?: { key: string; label: string; type: 'text' | 'password'; placeholder?: string; default?: string }[];
  help?: string[];
  settings?: SettingField[];
  // a video is required to post
  requiresMedia?: boolean;
}

export const providers: ProviderDefinition[] = [
  {
    identifier: 'x',
    name: 'X',
    editor: 'html',
    maxChars: 280,
    comments: true,
    settings: [
      {
        key: 'who_can_reply_post',
        label: 'Who can reply to this post?',
        type: 'select',
        required: true,
        options: [
          { value: 'everyone', label: 'Everyone' },
          { value: 'following', label: 'Accounts you follow' },
          { value: 'mentionedUsers', label: 'Mentioned accounts' },
          { value: 'subscribers', label: 'Subscribers' },
          { value: 'verified', label: 'Verified accounts' },
        ],
      },
      {
        key: 'community',
        label: 'Post to a community, URL (Ex: https://x.com/i/communities/1493446837214187523)',
        type: 'input',
      },
      {
        key: 'made_with_ai',
        label: 'Made with AI',
        type: 'checkbox',
      },
    ],
  },
  {
    identifier: 'linkedin',
    name: 'LinkedIn',
    editor: 'normal',
    maxChars: 3000,
    comments: true,
    settings: [
      {
        key: 'post_as_images_carousel',
        label: 'Post as images carousel',
        type: 'checkbox',
      },
    ],
  },
  {
    identifier: 'linkedin-page',
    name: 'LinkedIn Page',
    editor: 'normal',
    maxChars: 3000,
    comments: true,
    settings: [
      {
        key: 'post_as_images_carousel',
        label: 'Post as images carousel',
        type: 'checkbox',
      },
    ],
  },
  {
    identifier: 'reddit',
    name: 'Reddit',
    editor: 'normal',
    maxChars: 10000,
    comments: true,
    settings: [
      {
        key: 'subreddit',
        label: 'Subreddit',
        type: 'input',
        required: true,
        placeholder: 'r/socialmedia',
      },
      { key: 'title', label: 'Title', type: 'input', required: true },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'self', label: 'Text' },
          { value: 'link', label: 'Link' },
          { value: 'media', label: 'Media' },
        ],
      },
    ],
  },
  {
    identifier: 'instagram',
    name: 'Instagram\n(Facebook Business)',
    editor: 'normal',
    maxChars: 2200,
    comments: 'no-media',
    requiresMedia: true,
    settings: [
      {
        key: 'post_type',
        label: 'Post Type',
        type: 'select',
        options: [
          { value: 'post', label: 'Post / Reel' },
          { value: 'story', label: 'Story' },
        ],
      },
      { key: 'collaborators', label: 'Collaborators', type: 'input' },
    ],
  },
  {
    identifier: 'instagram-standalone',
    name: 'Instagram\n(Standalone)',
    editor: 'normal',
    maxChars: 2200,
    comments: 'no-media',
    requiresMedia: true,
    settings: [
      {
        key: 'post_type',
        label: 'Post Type',
        type: 'select',
        options: [
          { value: 'post', label: 'Post / Reel' },
          { value: 'story', label: 'Story' },
        ],
      },
    ],
  },
  {
    identifier: 'facebook',
    name: 'Facebook Page',
    editor: 'normal',
    maxChars: 63206,
    comments: true,
    settings: [{ key: 'url', label: 'Embedded URL (only for text Post)', type: 'input' }],
  },
  {
    identifier: 'threads',
    name: 'Threads',
    editor: 'normal',
    maxChars: 500,
    comments: true,
  },
  {
    identifier: 'youtube',
    name: 'YouTube',
    editor: 'normal',
    maxChars: 5000,
    comments: false,
    requiresMedia: true,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'public', label: 'Public' },
          { value: 'private', label: 'Private' },
          { value: 'unlisted', label: 'Unlisted' },
        ],
      },
      {
        key: 'selfDeclaredMadeForKids',
        label: 'Made for kids',
        type: 'select',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ],
      },
      { key: 'tags', label: 'Tags', type: 'input', placeholder: 'tag1, tag2' },
    ],
  },
  {
    identifier: 'tiktok',
    name: 'Tiktok',
    editor: 'normal',
    maxChars: 2000,
    comments: false,
    requiresMedia: true,
    settings: [
      {
        key: 'privacy_level',
        label: 'Who can see this video?',
        type: 'select',
        required: true,
        options: [
          { value: 'PUBLIC_TO_EVERYONE', label: 'Public to everyone' },
          { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Mutual follow friends' },
          { value: 'FOLLOWER_OF_CREATOR', label: 'Follower of creator' },
          { value: 'SELF_ONLY', label: 'Self only' },
        ],
      },
      { key: 'duet', label: 'Allow Duet', type: 'checkbox' },
      { key: 'stitch', label: 'Allow Stitch', type: 'checkbox' },
      { key: 'comment', label: 'Allow Comments', type: 'checkbox' },
      { key: 'brand_content_toggle', label: 'Branded content', type: 'checkbox' },
    ],
  },
  {
    identifier: 'pinterest',
    name: 'Pinterest',
    editor: 'normal',
    maxChars: 500,
    comments: false,
    requiresMedia: true,
    settings: [
      { key: 'title', label: 'Title', type: 'input' },
      { key: 'link', label: 'Link', type: 'input' },
      {
        key: 'board',
        label: 'Select Board',
        type: 'select',
        required: true,
        options: [
          { value: 'inspiration', label: 'Inspiration' },
          { value: 'marketing', label: 'Marketing tips' },
          { value: 'product', label: 'Product' },
        ],
      },
    ],
  },
  {
    identifier: 'dribbble',
    name: 'Dribbble',
    editor: 'normal',
    maxChars: 40000,
    comments: false,
    requiresMedia: true,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      { key: 'team', label: 'Teams', type: 'input' },
    ],
  },
  {
    identifier: 'threads-x',
    name: '',
    editor: 'normal',
    maxChars: 0,
    comments: false,
  },
  {
    identifier: 'mastodon',
    name: 'Mastodon',
    editor: 'normal',
    maxChars: 500,
    comments: true,
    real: true,
    connect: [
      { key: 'instance', label: 'Server URL', type: 'text', default: 'https://mastodon.social' },
      { key: 'token', label: 'Access token', type: 'password' },
    ],
    help: [
      'On your server open Preferences → Development → New application',
      'Give it the read:accounts, write:statuses and write:media scopes, save it',
      'Open the application and copy "Your access token"',
    ],
    settings: [
      {
        key: 'visibility',
        label: 'Visibility',
        type: 'select',
        required: true,
        options: [
          { value: 'public', label: 'Public' },
          { value: 'unlisted', label: 'Unlisted' },
          { value: 'private', label: 'Followers only' },
        ],
      },
    ],
  },
  {
    identifier: 'bluesky',
    name: 'Bluesky',
    editor: 'normal',
    maxChars: 300,
    comments: true,
    real: true,
    connect: [
      { key: 'identifier', label: 'Handle', type: 'text', placeholder: 'yourname.bsky.social' },
      { key: 'password', label: 'App password', type: 'password', placeholder: 'xxxx-xxxx-xxxx-xxxx' },
      { key: 'service', label: 'Service', type: 'text', default: 'https://bsky.social' },
    ],
    help: [
      'Open bsky.app → Settings → Privacy and security → App passwords',
      'Create an app password and paste it here (not your real password)',
    ],
  },
  {
    identifier: 'lemmy',
    name: 'Lemmy',
    editor: 'normal',
    maxChars: 10000,
    comments: true,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      { key: 'community', label: 'Community', type: 'input', required: true },
    ],
  },
  {
    identifier: 'wrapcast',
    name: 'Farcaster',
    editor: 'normal',
    maxChars: 800,
    comments: true,
  },
  {
    identifier: 'telegram',
    name: 'Telegram',
    editor: 'html',
    maxChars: 4096,
    comments: true,
    real: true,
    connect: [
      { key: 'token', label: 'Bot token', type: 'password', placeholder: '123456789:ABC...' },
      { key: 'chat', label: 'Channel or group', type: 'text', placeholder: '@yourchannel or -100123456789' },
    ],
    help: [
      'Message @BotFather on Telegram, send /newbot and copy the token',
      'Add the bot as an administrator of your channel or group',
      'Use the channel @username, or the numeric chat id for private chats',
    ],
  },
  {
    identifier: 'nostr',
    name: 'Nostr',
    editor: 'normal',
    maxChars: 100000,
    comments: true,
  },
  {
    identifier: 'vk',
    name: 'VK',
    editor: 'normal',
    maxChars: 2048,
    comments: true,
  },
  {
    identifier: 'discord',
    name: 'Discord',
    editor: 'markdown',
    maxChars: 2000,
    comments: true,
    real: true,
    connect: [{ key: 'webhook', label: 'Webhook URL', type: 'password', placeholder: 'https://discord.com/api/webhooks/...' }],
    help: [
      'In Discord open the channel settings → Integrations → Webhooks',
      'Create a webhook and click "Copy Webhook URL"',
    ],
  },
  {
    identifier: 'slack',
    name: 'Slack',
    editor: 'normal',
    maxChars: 400000,
    comments: true,
    settings: [
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [
          { value: 'general', label: '#general' },
          { value: 'marketing', label: '#marketing' },
        ],
      },
    ],
  },
  {
    identifier: 'gmb',
    name: 'Google My Business',
    editor: 'normal',
    maxChars: 1500,
    comments: false,
    settings: [
      {
        key: 'topicType',
        label: 'Post Type',
        type: 'select',
        options: [
          { value: 'STANDARD', label: 'Standard' },
          { value: 'EVENT', label: 'Event' },
          { value: 'OFFER', label: 'Offer' },
        ],
      },
      { key: 'callToActionUrl', label: 'Call to action URL', type: 'input' },
    ],
  },
  {
    identifier: 'devto',
    name: 'Dev.to',
    editor: 'markdown',
    maxChars: 100000,
    comments: false,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      { key: 'canonical', label: 'Canonical Link', type: 'input' },
      { key: 'tags', label: 'Tags', type: 'input' },
    ],
  },
  {
    identifier: 'hashnode',
    name: 'Hashnode',
    editor: 'markdown',
    maxChars: 10000,
    comments: false,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      { key: 'subtitle', label: 'Subtitle', type: 'input' },
    ],
  },
  {
    identifier: 'medium',
    name: 'Medium',
    editor: 'markdown',
    maxChars: 100000,
    comments: false,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      { key: 'subtitle', label: 'Subtitle', type: 'input' },
    ],
  },
  {
    identifier: 'wordpress',
    name: 'WordPress',
    editor: 'html',
    maxChars: 100000,
    comments: false,
    settings: [
      { key: 'title', label: 'Title', type: 'input', required: true },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'post', label: 'Post' },
          { value: 'page', label: 'Page' },
        ],
      },
    ],
  },
  {
    identifier: 'listmonk',
    name: 'ListMonk',
    editor: 'html',
    maxChars: 100000000,
    comments: false,
    settings: [
      { key: 'subject', label: 'Subject', type: 'input', required: true },
      { key: 'preview', label: 'Preview', type: 'input' },
    ],
  },
  {
    identifier: 'tumblr',
    name: 'Tumblr',
    editor: 'normal',
    maxChars: 32768,
    comments: false,
  },
  {
    identifier: 'mewe',
    name: 'MeWe',
    editor: 'normal',
    maxChars: 63206,
    comments: false,
  },
  {
    identifier: 'skool',
    name: 'Skool',
    editor: 'normal',
    maxChars: 5000,
    comments: false,
    settings: [{ key: 'title', label: 'Title', type: 'input', required: true }],
  },
  {
    identifier: 'whop',
    name: 'Whop',
    editor: 'markdown',
    maxChars: 50000,
    comments: false,
  },
  {
    identifier: 'twitch',
    name: 'Twitch',
    editor: 'normal',
    maxChars: 500,
    comments: false,
  },
  {
    identifier: 'kick',
    name: 'Kick',
    editor: 'normal',
    maxChars: 500,
    comments: false,
  },
].filter((p) => p.name) as ProviderDefinition[];

export const getProvider = (identifier: string): ProviderDefinition =>
  providers.find((p) => p.identifier === identifier) || {
    identifier,
    name: identifier,
    editor: 'normal',
    maxChars: 1000,
    comments: false,
  };

export const platformIcon = (identifier: string) =>
  identifier === 'youtube'
    ? '/icons/platforms/youtube.svg'
    : `/icons/platforms/${identifier}.png`;
