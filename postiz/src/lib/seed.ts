import { Customer, Integration, User } from './types';
import { avatar, makeId } from './utils';

// 9:00, 13:00 and 17:00
const defaultTimes = [{ time: 540 }, { time: 780 }, { time: 1020 }];

export const createIntegration = (data: {
  identifier: string;
  name: string;
  display: string;
  picture?: string;
  internalId?: string;
  credentials?: Record<string, string>;
  customer?: Customer;
}): Integration => ({
  id: makeId(12),
  internalId: data.internalId || makeId(8),
  name: data.name,
  display: data.display,
  identifier: data.identifier,
  picture: data.picture || avatar(data.name),
  disabled: false,
  refreshNeeded: false,
  inBetweenSteps: false,
  customer: data.customer,
  time: defaultTimes.map((p) => ({ ...p })),
  preferences: {},
  credentials: data.credentials,
});

// a new workspace starts empty
export const seed = () => {
  const user: User = {
    id: makeId(10),
    name: 'Me',
    email: '',
    picture: avatar('My Workspace'),
    role: 'ADMIN',
    orgId: makeId(10),
    orgName: 'My Workspace',
    tier: 'PRO',
    totalChannels: 1000,
  };
  return {
    user,
    customers: [],
    integrations: [],
    posts: [],
    tags: [],
    media: [],
    signatures: [],
    sets: [],
    webhooks: [],
    team: [],
    notifications: [],
  };
};
