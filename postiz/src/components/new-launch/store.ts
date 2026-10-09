'use client';

// Composer state, modelled on Postiz's new-launch/store.ts:
// "global" values are shared by every selected channel until a channel
// leaves global mode and gets its own "internal" values.

import { create } from 'zustand';
import dayjs from 'dayjs';
import { Integration, MediaItem, PostValue } from '@/lib/types';
import { makeId } from '@/lib/utils';
import { getProvider } from '@/lib/providers';

// required dropdowns start on their first option, like the provider DTO defaults
const defaultSettings = (integration: Integration) =>
  Object.fromEntries(
    (getProvider(integration.identifier).settings || [])
      .map((f) => [f.key, (integration.dynamicOptions?.[f.key] || f.options)?.[0]?.value] as const)
      .filter(([key, value]) => {
        const field = getProvider(integration.identifier).settings!.find((f) => f.key === key)!;
        return field.type === 'select' && field.required && value;
      })
  );

export interface SelectedIntegration {
  integration: Integration;
  settings: Record<string, any>;
}

export interface Internal {
  integration: Integration;
  integrationValue: PostValue[];
}

interface LaunchState {
  group?: string;
  existing: boolean;
  date: dayjs.Dayjs;
  current: string;
  integrations: Integration[];
  selectedIntegrations: SelectedIntegration[];
  global: PostValue[];
  internal: Internal[];
  tags: string[];
  repeater: number | null;
  locked: boolean;
  showErrors: boolean;

  init: (data: {
    group?: string;
    existing?: boolean;
    date: dayjs.Dayjs;
    integrations: Integration[];
    global: PostValue[];
  }) => void;
  reset: () => void;
  setDate: (date: dayjs.Dayjs) => void;
  setCurrent: (current: string) => void;
  setTags: (tags: string[]) => void;
  setRepeater: (repeater: number | null) => void;
  setLocked: (locked: boolean) => void;
  setShowErrors: (showErrors: boolean) => void;
  addOrRemoveSelectedIntegration: (
    integration: Integration,
    settings?: Record<string, any>
  ) => void;
  setSettings: (integrationId: string, settings: Record<string, any>) => void;
  addRemoveInternal: (integrationId: string) => void;
  setInternalValues: (integrationId: string, values: PostValue[]) => void;

  // operate on the values of the current tab (global or a channel)
  setValueText: (index: number, content: string) => void;
  setValueMedia: (index: number, media: MediaItem[]) => void;
  setValueDelay: (index: number, delay: number) => void;
  addValue: (afterIndex: number) => void;
  deleteValue: (index: number) => void;
  changeOrder: (index: number, direction: 'up' | 'down') => void;
}

const emptyValue = (): PostValue => ({
  id: makeId(10),
  content: '',
  media: [],
  delay: 0,
});

const updateCurrentValues = (
  state: LaunchState,
  fn: (values: PostValue[]) => PostValue[]
): Partial<LaunchState> => {
  const internal = state.internal.find(
    (p) => p.integration.id === state.current
  );
  if (state.current !== 'global' && internal) {
    return {
      internal: state.internal.map((p) =>
        p.integration.id === state.current
          ? { ...p, integrationValue: fn(p.integrationValue) }
          : p
      ),
    };
  }
  return { global: fn(state.global) };
};

const initialState = {
  group: undefined,
  existing: false,
  date: dayjs(),
  current: 'global',
  integrations: [] as Integration[],
  selectedIntegrations: [] as SelectedIntegration[],
  global: [] as PostValue[],
  internal: [] as Internal[],
  tags: [] as string[],
  repeater: null as number | null,
  locked: false,
  showErrors: false,
};

export const useLaunchStore = create<LaunchState>()((set) => ({
  ...initialState,

  init: (data) =>
    set({
      ...initialState,
      group: data.group,
      existing: !!data.existing,
      date: data.date,
      integrations: data.integrations,
      global: data.global.length ? data.global : [emptyValue()],
    }),
  reset: () => set({ ...initialState }),
  setDate: (date) => set({ date }),
  setCurrent: (current) => set({ current }),
  setTags: (tags) => set({ tags }),
  setRepeater: (repeater) => set({ repeater }),
  setLocked: (locked) => set({ locked }),
  setShowErrors: (showErrors) => set({ showErrors }),
  addOrRemoveSelectedIntegration: (integration, settings = {}) =>
    set((state) => {
      const exists = state.selectedIntegrations.find(
        (p) => p.integration.id === integration.id
      );
      if (exists) {
        return {
          selectedIntegrations: state.selectedIntegrations.filter(
            (p) => p.integration.id !== integration.id
          ),
          internal: state.internal.filter(
            (p) => p.integration.id !== integration.id
          ),
          current: state.current === integration.id ? 'global' : state.current,
        };
      }
      return {
        selectedIntegrations: [
          ...state.selectedIntegrations,
          { integration, settings: { ...defaultSettings(integration), ...settings } },
        ],
      };
    }),
  setSettings: (integrationId, settings) =>
    set((state) => ({
      selectedIntegrations: state.selectedIntegrations.map((p) =>
        p.integration.id === integrationId
          ? { ...p, settings: { ...p.settings, ...settings } }
          : p
      ),
    })),
  addRemoveInternal: (integrationId) =>
    set((state) => {
      const exists = state.internal.find(
        (p) => p.integration.id === integrationId
      );
      if (exists) {
        return {
          internal: state.internal.filter(
            (p) => p.integration.id !== integrationId
          ),
        };
      }
      const integration = state.integrations.find((p) => p.id === integrationId);
      if (!integration) return {};
      return {
        internal: [
          ...state.internal,
          {
            integration,
            integrationValue: state.global.map((p) => ({ ...p, id: makeId(10) })),
          },
        ],
      };
    }),
  setInternalValues: (integrationId, values) =>
    set((state) => {
      const integration = state.integrations.find((p) => p.id === integrationId);
      if (!integration) return {};
      return {
        internal: [
          ...state.internal.filter((p) => p.integration.id !== integrationId),
          { integration, integrationValue: values },
        ],
      };
    }),

  setValueText: (index, content) =>
    set((state) =>
      updateCurrentValues(state, (values) =>
        values.map((p, i) => (i === index ? { ...p, content } : p))
      )
    ),
  setValueMedia: (index, media) =>
    set((state) =>
      updateCurrentValues(state, (values) =>
        values.map((p, i) => (i === index ? { ...p, media } : p))
      )
    ),
  setValueDelay: (index, delay) =>
    set((state) =>
      updateCurrentValues(state, (values) =>
        values.map((p, i) => (i === index ? { ...p, delay } : p))
      )
    ),
  addValue: (afterIndex) =>
    set((state) =>
      updateCurrentValues(state, (values) => [
        ...values.slice(0, afterIndex + 1),
        emptyValue(),
        ...values.slice(afterIndex + 1),
      ])
    ),
  deleteValue: (index) =>
    set((state) =>
      updateCurrentValues(state, (values) => values.filter((_, i) => i !== index))
    ),
  changeOrder: (index, direction) =>
    set((state) =>
      updateCurrentValues(state, (values) => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= values.length) return values;
        const copy = values.slice();
        [copy[index], copy[target]] = [copy[target], copy[index]];
        return copy;
      })
    ),
}));

// the values the current tab shows
export const useCurrentValues = () =>
  useLaunchStore((state) => {
    if (state.current === 'global') return state.global;
    const internal = state.internal.find(
      (p) => p.integration.id === state.current
    );
    return internal ? internal.integrationValue : state.global;
  });

export const valuesFor = (state: LaunchState, integrationId: string) =>
  state.internal.find((p) => p.integration.id === integrationId)
    ?.integrationValue || state.global;
