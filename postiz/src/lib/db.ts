'use client';

// The demo "backend": every entity Postiz keeps in Postgres lives here,
// persisted to localStorage so the app is fully usable without a server.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import {
  Customer,
  Integration,
  MediaItem,
  Notification,
  Post,
  PostSet,
  PostState,
  PostValue,
  Signature,
  Tag,
  TeamMember,
  User,
  Webhook,
} from './types';
import { createIntegration, seed } from './seed';
import { makeId } from './utils';

export interface CreatePostInput {
  group?: string;
  date: string;
  state: PostState;
  tags: string[];
  intervalInDays?: number;
  channels: Array<{
    integrationId: string;
    values: PostValue[];
    settings: Record<string, any>;
    date?: string;
  }>;
}

interface DbState {
  user: User;
  customers: Customer[];
  integrations: Integration[];
  posts: Post[];
  tags: Tag[];
  media: MediaItem[];
  signatures: Signature[];
  sets: PostSet[];
  webhooks: Webhook[];
  team: TeamMember[];
  notifications: Notification[];
  shortlink: 'ask' | 'yes' | 'no';
  emailNotifications: { success: boolean; failure: boolean };

  // user
  updateUser: (data: Partial<User>) => void;

  // integrations
  addIntegration: (
    identifier: string,
    name: string,
    display: string
  ) => Integration;
  updateIntegration: (id: string, data: Partial<Integration>) => void;
  deleteIntegration: (id: string) => void;
  moveIntegrationToCustomer: (id: string, customerId: string) => void;
  addCustomer: (name: string) => Customer;
  renameCustomer: (id: string, name: string) => void;

  // posts
  createPosts: (input: CreatePostInput) => string;
  deleteGroup: (group: string) => void;
  changePostDate: (id: string, date: string) => void;
  publishDue: () => Post[];
  findSlot: () => string;

  // tags
  addTag: (tag: Tag) => void;
  editTag: (oldName: string, tag: Tag) => void;
  deleteTag: (name: string) => void;

  // media
  addMedia: (media: Omit<MediaItem, 'id' | 'createdAt'>) => MediaItem;
  deleteMedia: (id: string) => void;

  // signatures / sets / webhooks / team
  saveSignature: (signature: Signature) => void;
  deleteSignature: (id: string) => void;
  saveSet: (set: PostSet) => void;
  deleteSet: (id: string) => void;
  saveWebhook: (webhook: Webhook) => void;
  deleteWebhook: (id: string) => void;
  inviteMember: (email: string, role: TeamMember['role']) => void;
  removeMember: (id: string) => void;

  // notifications
  addNotification: (content: string) => void;
  markNotificationsRead: () => void;

  setShortlink: (value: 'ask' | 'yes' | 'no') => void;
  setEmailNotifications: (value: { success: boolean; failure: boolean }) => void;
  resetDemo: () => void;
}

export const useDb = create<DbState>()(
  persist(
    (set, get) => ({
      ...seed(),
      shortlink: 'ask',
      emailNotifications: { success: true, failure: true },

      updateUser: (data) => set((s) => ({ user: { ...s.user, ...data } })),

      addIntegration: (identifier, name, display) => {
        const integration = createIntegration(identifier, name, display);
        set((s) => ({ integrations: [...s.integrations, integration] }));
        return integration;
      },
      updateIntegration: (id, data) =>
        set((s) => ({
          integrations: s.integrations.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),
      deleteIntegration: (id) =>
        set((s) => ({
          integrations: s.integrations.filter((p) => p.id !== id),
          posts: s.posts.filter((p) => p.integrationId !== id),
        })),
      moveIntegrationToCustomer: (id, customerId) =>
        set((s) => ({
          integrations: s.integrations.map((p) =>
            p.id === id
              ? {
                  ...p,
                  customer: s.customers.find((c) => c.id === customerId),
                }
              : p
          ),
        })),
      addCustomer: (name) => {
        const customer = { id: makeId(8), name };
        set((s) => ({ customers: [...s.customers, customer] }));
        return customer;
      },
      renameCustomer: (id, name) =>
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, name } : c)),
          integrations: s.integrations.map((p) =>
            p.customer?.id === id ? { ...p, customer: { id, name } } : p
          ),
        })),

      createPosts: (input) => {
        const group = input.group || makeId(10);
        const existing = get().posts.filter((p) => p.group === group);
        const newPosts: Post[] = input.channels.map((channel) => {
          const previous = existing.find(
            (p) => p.integrationId === channel.integrationId
          );
          return {
            id: previous?.id || makeId(12),
            group,
            integrationId: channel.integrationId,
            publishDate: channel.date || input.date,
            state: input.state,
            values: channel.values,
            tags: input.tags,
            settings: channel.settings,
            intervalInDays: input.intervalInDays,
            createdAt: previous?.createdAt || new Date().toISOString(),
          };
        });
        set((s) => ({
          posts: [...s.posts.filter((p) => p.group !== group), ...newPosts],
        }));
        return group;
      },
      deleteGroup: (group) =>
        set((s) => ({ posts: s.posts.filter((p) => p.group !== group) })),
      changePostDate: (id, date) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  publishDate: date,
                  state: p.state === 'DRAFT' ? 'DRAFT' : 'QUEUE',
                  releaseURL: p.state === 'DRAFT' ? p.releaseURL : undefined,
                  error: undefined,
                }
              : p
          ),
        })),
      publishDue: () => {
        const now = dayjs();
        const due = get().posts.filter(
          (p) => p.state === 'QUEUE' && !dayjs(p.publishDate).isAfter(now)
        );
        if (!due.length) {
          return [];
        }
        const integrations = get().integrations;
        const published: Post[] = [];
        set((s) => ({
          posts: s.posts.map((p) => {
            if (!due.find((d) => d.id === p.id)) {
              return p;
            }
            const integration = integrations.find(
              (i) => i.id === p.integrationId
            );
            const failed = !integration || integration.refreshNeeded;
            const next: Post = failed
              ? {
                  ...p,
                  state: 'ERROR',
                  error: 'The channel is disconnected, please reconnect it.',
                }
              : {
                  ...p,
                  state: 'PUBLISHED',
                  releaseURL: `https://example.com/${integration!.identifier}/${makeId(8)}`,
                };
            published.push(next);
            return next;
          }),
        }));
        // a repeated post gets its next occurrence
        published
          .filter((p) => p.intervalInDays)
          .forEach((p) => {
            set((s) => ({
              posts: [
                ...s.posts,
                {
                  ...p,
                  id: makeId(12),
                  group: makeId(10),
                  state: 'QUEUE',
                  releaseURL: undefined,
                  error: undefined,
                  publishDate: dayjs(p.publishDate)
                    .add(p.intervalInDays!, 'day')
                    .toISOString(),
                },
              ],
            }));
          });
        return published;
      },
      findSlot: () => {
        const taken = new Set(
          get().posts.map((p) => dayjs(p.publishDate).format('YYYY-MM-DD HH'))
        );
        let date = dayjs().add(1, 'hour').startOf('hour');
        for (let i = 0; i < 24 * 60; i++) {
          if (!taken.has(date.format('YYYY-MM-DD HH'))) {
            return date.toISOString();
          }
          date = date.add(1, 'hour');
        }
        return date.toISOString();
      },

      addTag: (tag) => set((s) => ({ tags: [...s.tags, tag] })),
      editTag: (oldName, tag) =>
        set((s) => ({
          tags: s.tags.map((t) => (t.name === oldName ? tag : t)),
          posts: s.posts.map((p) => ({
            ...p,
            tags: p.tags.map((t) => (t === oldName ? tag.name : t)),
          })),
        })),

      deleteTag: (name) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.name !== name),
          posts: s.posts.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== name) })),
        })),

      addMedia: (media) => {
        const item = {
          ...media,
          id: makeId(10),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ media: [item, ...s.media] }));
        return item;
      },
      deleteMedia: (id) =>
        set((s) => ({ media: s.media.filter((m) => m.id !== id) })),

      saveSignature: (signature) =>
        set((s) => {
          const list = signature.autoAdd
            ? s.signatures.map((p) => ({ ...p, autoAdd: false }))
            : s.signatures;
          return {
            signatures: list.find((p) => p.id === signature.id)
              ? list.map((p) => (p.id === signature.id ? signature : p))
              : [...list, signature],
          };
        }),
      deleteSignature: (id) =>
        set((s) => ({ signatures: s.signatures.filter((p) => p.id !== id) })),
      saveSet: (postSet) =>
        set((s) => ({
          sets: s.sets.find((p) => p.id === postSet.id)
            ? s.sets.map((p) => (p.id === postSet.id ? postSet : p))
            : [...s.sets, postSet],
        })),
      deleteSet: (id) => set((s) => ({ sets: s.sets.filter((p) => p.id !== id) })),
      saveWebhook: (webhook) =>
        set((s) => ({
          webhooks: s.webhooks.find((p) => p.id === webhook.id)
            ? s.webhooks.map((p) => (p.id === webhook.id ? webhook : p))
            : [...s.webhooks, webhook],
        })),
      deleteWebhook: (id) =>
        set((s) => ({ webhooks: s.webhooks.filter((p) => p.id !== id) })),
      inviteMember: (email, role) =>
        set((s) => ({
          team: [
            ...s.team,
            { id: makeId(10), name: email.split('@')[0], email, role },
          ],
        })),
      removeMember: (id) =>
        set((s) => ({ team: s.team.filter((p) => p.id !== id) })),

      addNotification: (content) =>
        set((s) => ({
          notifications: [
            {
              id: makeId(10),
              content,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...s.notifications,
          ].slice(0, 50),
        })),
      markNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      setShortlink: (shortlink) => set({ shortlink }),
      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      resetDemo: () => set({ ...seed() }),
    }),
    { name: 'postiz-demo-db', version: 1 }
  )
);
