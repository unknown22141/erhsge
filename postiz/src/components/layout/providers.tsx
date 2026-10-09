'use client';

import '@/lib/dayjs';
import { ReactNode, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tooltip } from 'react-tooltip';
import { ModalManager } from '@/components/ui/modal';
import { Toaster, toast } from '@/components/ui/toaster';
import { useMounted } from '@/lib/hooks';
import { useDb } from '@/lib/db';
import { getProvider } from '@/lib/providers';
import { useMode } from './mode';

// Plays the part of the Postiz workers: publishes posts when their time comes
const Publisher = () => {
  useEffect(() => {
    const run = () => {
      const published = useDb.getState().publishDue();
      const { integrations, addNotification } = useDb.getState();
      published.forEach((post) => {
        const integration = integrations.find((i) => i.id === post.integrationId);
        const name = integration
          ? `${integration.name} (${getProvider(integration.identifier).name.split('\n')[0]})`
          : 'a channel';
        if (post.state === 'PUBLISHED') {
          addNotification(`Your post has been published on ${name}`);
          toast(`Your post has been published on ${name}`, 'success');
        } else {
          addNotification(`Error posting to ${name}: ${post.error}`);
          toast(`Error posting to ${name}`, 'warning');
        }
      });
    };
    run();
    const interval = setInterval(run, 5000);
    return () => clearInterval(interval);
  }, []);
  return null;
};

// persists the seeded demo data right away, so every tab sees the same ids
const PersistSeed = () => {
  useEffect(() => {
    try {
      if (!localStorage.getItem('postiz-demo-db')) {
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
