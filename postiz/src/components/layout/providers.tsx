'use client';

import '@/lib/dayjs';
import { ReactNode, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tooltip } from 'react-tooltip';
import { ModalManager } from '@/components/ui/modal';
import { Toaster } from '@/components/ui/toaster';
import { useMounted } from '@/lib/hooks';
import { useDb } from '@/lib/db';
import { startSync } from '@/lib/sync';
import { useMode } from './mode';

// Sends the scheduled posts to the local server, which publishes them
const Publisher = () => {
  useEffect(() => startSync(), []);
  return null;
};

// saves the new workspace right away, so every tab sees the same ids
const PersistSeed = () => {
  useEffect(() => {
    try {
      if (!localStorage.getItem('postiz-db')) {
        useDb.setState({});
      }
    } catch {}
  }, []);
  return null;
};

const ApplyMode = () => {
  const mode = useMode((s) => s.mode);
  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(mode);
  }, [mode]);
  return null;
};

export const Providers = ({ children }: { children: ReactNode }) => {
  const mounted = useMounted();
  if (!mounted) {
    return null;
  }
  return (
    <DndProvider backend={HTML5Backend}>
      <PersistSeed />
      <ApplyMode />
      <Publisher />
      <Toaster />
      <Tooltip
        id="tooltip"
        className="!bg-newBgColorInner !text-newTextColor !border !border-newTableBorder !opacity-100 shadow-menu"
        delayShow={150}
      />
      {children}
      <ModalManager />
    </DndProvider>
  );
};
