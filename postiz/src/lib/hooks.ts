'use client';

import { RefObject, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

export const useClickOutside = <T extends HTMLElement>(callback: () => void) => {
  const ref = useRef<T>(null);
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        cb.current();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return ref;
};

export const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};

export function useHasScroll(ref: RefObject<HTMLElement | null>): boolean {
  const [hasScroll, setHasScroll] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const check = () => {
      const el = ref.current;
      if (el) setHasScroll(el.scrollWidth > el.clientWidth);
    };
    check();
    const resize = new ResizeObserver(check);
    resize.observe(ref.current);
    const mutation = new MutationObserver(check);
    mutation.observe(ref.current, { childList: true, subtree: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [ref]);
  return hasScroll;
}

// The current time, one shared clock for the whole calendar
const nowStore = create<{ now: Date }>(() => ({ now: new Date() }));
if (typeof window !== 'undefined') {
  setInterval(() => nowStore.setState({ now: new Date() }), 30000);
}
export const useNow = () => nowStore((s) => s.now);

// A persisted value in localStorage, like react-use-cookie in Postiz
export const useLocalState = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
};
