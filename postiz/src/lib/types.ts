export type PostState = 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';

export interface Customer {
  id: string;
  name: string;
}

export interface Integration {
  id: string;
  internalId: string;
  name: string;
  display: string;
  identifier: string;
  picture: string;
  disabled: boolean;
  refreshNeeded: boolean;
  inBetweenSteps: boolean;
  customer?: Customer;
  // posting slots, in minutes from midnight
  time: { time: number }[];
  preferences: { autoComment?: boolean };
}

export interface MediaItem {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'video';
  createdAt: string;
}

export interface PostValue {
  id: string;
  content: string;
  media: MediaItem[];
  delay?: number;
}

export interface Tag {
  name: string;
  color: string;
}

export interface Post {
  id: string;
  group: string;
  integrationId: string;
  publishDate: string;
  state: PostState;
  values: PostValue[];
  tags: string[];
  settings: Record<string, any>;
  intervalInDays?: number;
  releaseURL?: string;
  error?: string;
  createdAt: string;
}

export interface Signature {
  id: string;
  content: string;
  autoAdd: boolean;
}

export interface PostSet {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  integrations: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'SUPERADMIN';
}

export interface Notification {
  id: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: 'ADMIN' | 'USER' | 'SUPERADMIN';
  orgId: string;
  orgName: string;
  tier: string;
  totalChannels: number;
}
