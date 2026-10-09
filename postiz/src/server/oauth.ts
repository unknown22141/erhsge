import { randomBytes } from 'crypto';
import { ChannelInfo, Credentials } from './http';

interface Pending {
  identifier: string;
  credentials: Credentials;
  redirectUri: string;
  // the address the user opened the app at, to come back to it
  returnTo: string;
  createdAt: number;
  result?: ChannelInfo;
  error?: string;
}

// sign-in attempts in progress, kept in memory for 15 minutes
const pending: Map<string, Pending> = ((globalThis as any).__postizOauth ||= new Map());

const clean = () => {
  const limit = Date.now() - 15 * 60000;
  pending.forEach((p, state) => p.createdAt < limit && pending.delete(state));
};

export const createState = (identifier: string, credentials: Credentials, redirectUri: string, returnTo: string) => {
  clean();
  const state = randomBytes(16).toString('hex');
  pending.set(state, { identifier, credentials, redirectUri, returnTo, createdAt: Date.now() });
  return state;
};

export const getPending = (state: string) => pending.get(state);

export const takeResult = (state: string) => {
  const item = pending.get(state);
  if (item && (item.result || item.error)) pending.delete(state);
  return item;
};
