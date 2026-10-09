export type Credentials = Record<string, string>;

export interface ChannelInfo {
  internalId: string;
  name: string;
  display: string;
  picture?: string;
  // replaces what the user typed, e.g. a page token exchanged from a user token
  credentials?: Credentials;
  // choices for a setting of this channel, e.g. Pinterest boards
  options?: Record<string, { value: string; label: string }[]>;
}

export interface PublishContext {
  publicUrl?: string;
  // saves refreshed tokens, so the next posts use them
  updateCredentials: (credentials: Credentials) => void;
}

export class AuthError extends Error {}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const readError = async (res: Response) => {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    const message =
      json.error?.message ||
      json.error?.error_user_msg ||
      json.message ||
      json.error_description ||
      json.description ||
      json.detail ||
      json.title ||
      (typeof json.error === 'string' ? json.error : '') ||
      json.errors?.[0]?.message;
    return message || text;
  } catch {
    return text || res.statusText;
  }
};

export const check = async (res: Response, what: string) => {
  if (res.ok) return res;
  const message = `${what}: ${await readError(res)}`;
  if (res.status === 401 || res.status === 403) throw new AuthError(message);
  throw new Error(message);
};

export const json = async <T = any>(res: Response, what: string): Promise<T> => (await check(res, what)).json();
