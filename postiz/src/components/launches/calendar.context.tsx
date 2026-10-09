'use client';

import { createContext, createElement, ReactNode, useContext, useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { Integration, Post } from '@/lib/types';

export type Display = 'day' | 'week' | 'month' | 'list';
export type ListStateFilter = 'all' | 'scheduled' | 'draft' | 'published';

export const getDateRange = (display: Display, referenceDate?: string) => {
  const date = referenceDate ? dayjs(referenceDate) : dayjs();
  switch (display) {
    case 'day':
    case 'list':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
    case 'week':
      return {
        startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
      };
    case 'month':
      return {
        startDate: date.startOf('month').format('YYYY-MM-DD'),
        endDate: date.endOf('month').format('YYYY-MM-DD'),
      };
  }
};

interface CalendarFilters {
  display: Display;
  startDate: string;
  endDate: string;
  customer: string;
  selectedChannels: string[] | null;
  listState: ListStateFilter;
  listPage: number;
  setFilters: (filters: Partial<Pick<CalendarFilters, 'display' | 'startDate' | 'endDate' | 'customer'>>) => void;
  setSelectedChannels: (channels: string[] | null) => void;
  setListState: (state: ListStateFilter) => void;
  setListPage: (page: number) => void;
}

export const useCalendarFilters = create<CalendarFilters>()(
  persist(
    (set) => ({
      display: 'week',
      ...getDateRange('week'),
      customer: '',
      selectedChannels: null,
      listState: 'all',
      listPage: 0,
      setFilters: (filters) => set(filters),
      setSelectedChannels: (selectedChannels) => set({ selectedChannels }),
      setListState: (listState) => set({ listState, listPage: 0 }),
      setListPage: (listPage) => set({ listPage }),
    }),
    {
      name: 'calendar-filters',
      // the visible week always starts from today when the app opens
      partialize: (s) => ({ display: s.display, customer: s.customer }),
      merge: (persisted: any, current) => {
        const display = (persisted?.display as Display) || current.display;
        return {
          ...current,
          ...persisted,
          ...getDateRange(display),
        };
      },
    }
  )
);

export const LIST_PAGE_SIZE = 20;

export interface PostWithIntegration extends Post {
  integration: Integration;
}

const useCalendarData = () => {
  const filters = useCalendarFilters();
  const allIntegrations = useDb((s) => s.integrations);
  const allPosts = useDb((s) => s.posts);

  // every channel of the current customer
  const integrations = useMemo(
    () =>
      allIntegrations.filter(
        (p) => !filters.customer || p.customer?.id === filters.customer
      ),
    [allIntegrations, filters.customer]
  );

  const visibleIntegrations = useMemo(
    () =>
      integrations.filter(
        (p) => !filters.selectedChannels || filters.selectedChannels.includes(p.id)
      ),
    [integrations, filters.selectedChannels]
  );

  const posts = useMemo(() => {
    const ids = new Set(visibleIntegrations.map((p) => p.id));
    const start = dayjs(filters.startDate).startOf(filters.display === 'month' ? 'isoWeek' : 'day');
    const end = dayjs(filters.endDate).endOf(filters.display === 'month' ? 'isoWeek' : 'day').add(filters.display === 'month' ? 7 : 0, 'day');
    return allPosts
      .filter((p) => ids.has(p.integrationId))
      .filter((p) => {
        const d = dayjs(p.publishDate);
        return !d.isBefore(start) && !d.isAfter(end);
      })
      .map((p) => ({
        ...p,
        integration: allIntegrations.find((i) => i.id === p.integrationId)!,
      }))
      .sort((a, b) => a.publishDate.localeCompare(b.publishDate)) as PostWithIntegration[];
  }, [allPosts, visibleIntegrations, filters.startDate, filters.endDate, filters.display, allIntegrations]);

  const listAll = useMemo(() => {
    const ids = new Set(visibleIntegrations.map((p) => p.id));
    const now = dayjs();
    return allPosts
      .filter((p) => ids.has(p.integrationId))
      .filter((p) => {
        switch (filters.listState) {
          case 'scheduled':
            return p.state === 'QUEUE' && dayjs(p.publishDate).isAfter(now);
          case 'draft':
            return p.state === 'DRAFT';
          case 'published':
            return p.state === 'PUBLISHED';
          default:
            return true;
        }
      })
      .map((p) => ({
        ...p,
        integration: allIntegrations.find((i) => i.id === p.integrationId)!,
      }))
      .sort((a, b) => a.publishDate.localeCompare(b.publishDate)) as PostWithIntegration[];
  }, [allPosts, visibleIntegrations, filters.listState, allIntegrations]);

  const listTotalPages = Math.max(1, Math.ceil(listAll.length / LIST_PAGE_SIZE));
  const listPosts = listAll.slice(
    filters.listPage * LIST_PAGE_SIZE,
    (filters.listPage + 1) * LIST_PAGE_SIZE
  );

  return {
    ...filters,
    integrations,
    visibleIntegrations,
    posts,
    listPosts,
    listTotalPages,
  };
};

type CalendarValue = ReturnType<typeof useCalendarData>;
const CalendarContext = createContext<CalendarValue | null>(null);

// computed once for the whole calendar, every cell reads it from the context
export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const value = useCalendarData();
  return createElement(CalendarContext.Provider, { value }, children);
};

export const useCalendar = () => {
  const value = useContext(CalendarContext);
  if (!value) throw new Error('useCalendar must be used inside CalendarProvider');
  return value;
};
