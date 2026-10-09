'use client';

import dayjs from 'dayjs';
import { openModal } from '@/components/ui/modal';
import { useDb } from '@/lib/db';
import { PostSet, PostValue } from '@/lib/types';
import { makeId } from '@/lib/utils';
import { ManageModal } from './manage.modal';
import { useLaunchStore } from './store';

const copyValues = (values: PostValue[]) => values.map((v) => ({ ...v, id: makeId(10) }));

type ComposerOptions = {
  date?: dayjs.Dayjs;
  group?: string;
  duplicate?: boolean;
  selectedChannels?: string[];
  onlyValues?: PostValue[];
};

const SetSelectionModal = ({ onSelect, onContinue }: { onSelect: (set: PostSet) => void; onContinue: () => void }) => {
  const sets = useDb((s) => s.sets);
  return (
    <div className="flex flex-col gap-4 min-w-[420px]">
      <div className="text-lg font-medium">Choose a set or continue without one</div>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {sets.map((set) => (
          <div
            key={set.id}
            onClick={() => onSelect(set)}
            className="p-3 border border-tableBorder rounded-lg cursor-pointer hover:border-[#612BD3] hover:bg-boxHover transition-colors"
          >
            <div className="font-medium">{set.name}</div>
            {set.description && <div className="text-sm text-gray-400 mt-1">{set.description}</div>}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2 border-t border-tableBorder">
        <button onClick={onContinue} className="flex-1 px-4 py-2 text-textColor rounded-lg hover:bg-boxHover transition-colors">
          Continue without set
        </button>
      </div>
    </div>
  );
};

// Opens the "Create Post" modal, like AddEditModal does in Postiz.
// A new post first asks for a set, when the user has some.
export const openComposer = (opts: ComposerOptions) => {
  const sets = useDb.getState().sets;
  if (opts.group || !sets.length) {
    openComposerDirect(opts);
    return;
  }
  openModal({
    title: 'Select a Set',
    closeOnClickOutside: true,
    children: (close) => (
      <SetSelectionModal
        onContinue={() => {
          close();
          openComposerDirect(opts);
        }}
        onSelect={(set) => {
          close();
          const content = JSON.parse(set.content);
          openComposerDirect({
            ...opts,
            selectedChannels: content.channels,
            onlyValues: [{ id: makeId(10), content: content.content, media: [], delay: 0 }],
          });
        }}
      />
    ),
  });
};

const openComposerDirect = (opts: ComposerOptions) => {
  const db = useDb.getState();
  const integrations = db.integrations.filter((p) => !p.disabled && !p.inBetweenSteps);
  const store = useLaunchStore.getState();
  const groupPosts = opts.group ? db.posts.filter((p) => p.group === opts.group) : [];

  if (groupPosts.length && !opts.duplicate) {
    const first = groupPosts[0];
    store.init({
      group: opts.group,
      existing: true,
      date: dayjs(first.publishDate),
      integrations: db.integrations,
      global: copyValues(first.values),
    });
    groupPosts.forEach((post) => {
      const integration = db.integrations.find((i) => i.id === post.integrationId);
      if (!integration) return;
      useLaunchStore.getState().addOrRemoveSelectedIntegration(integration, post.settings);
      useLaunchStore.getState().setInternalValues(integration.id, post.values);
    });
    useLaunchStore.getState().setCurrent(first.integrationId);
    useLaunchStore.getState().setTags(first.tags);
    useLaunchStore.getState().setRepeater(first.intervalInDays || null);
  } else {
    const signature = db.signatures.find((s) => s.autoAdd);
    store.init({
      date: opts.date || dayjs(db.findSlot()),
      integrations,
      global: groupPosts.length
        ? copyValues(groupPosts[0].values)
        : opts.onlyValues
        ? copyValues(opts.onlyValues)
        : [
            {
              id: makeId(10),
              content: signature ? '<p><br></p>' + signature.content : '',
              media: [],
              delay: 0,
            },
          ],
    });
    const preselect = groupPosts.length ? groupPosts.map((p) => p.integrationId) : opts.selectedChannels || [];
    preselect.forEach((id) => {
      const integration = integrations.find((i) => i.id === id);
      const settings = groupPosts.find((p) => p.integrationId === id)?.settings || {};
      if (integration) useLaunchStore.getState().addOrRemoveSelectedIntegration(integration, settings);
    });
    if (groupPosts.length) {
      useLaunchStore.getState().setTags(groupPosts[0].tags);
    }
  }

  openModal({
    id: 'add-edit-modal',
    closeOnClickOutside: false,
    removeLayout: true,
    closeOnEscape: false,
    withCloseButton: false,
    askClose: true,
    fullScreen: true,
    onClose: () => useLaunchStore.getState().reset(),
    children: <ManageModal />,
  });
};
