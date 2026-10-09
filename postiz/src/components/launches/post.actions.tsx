'use client';

import { useCallback } from 'react';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { Post } from '@/lib/types';
import { deleteDialog, openModal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toaster';
import { openComposer } from '@/components/new-launch/open.composer';

const RepublishChoice = ({ onChoose }: { onChoose: (v: 'update' | 'schedule') => void }) => (
  <div className="flex w-full gap-[10px] mt-[8px]">
    <button onClick={() => onChoose('update')} className="flex-1 h-[40px] rounded-[8px] bg-btnPrimary text-white px-[16px]">
      Just update the post details
    </button>
    <button onClick={() => onChoose('schedule')} className="flex-1 h-[40px] rounded-[8px] bg-btnPrimary text-white px-[16px]">
      Reschedule the post
    </button>
  </div>
);

export const askRepublish = (post: Post, name: string, date: dayjs.Dayjs) =>
  new Promise<'update' | 'schedule' | 'cancel'>((resolve) => {
    let done = false;
    openModal({
      title: 'What do you want to do?',
      closeOnClickOutside: true,
      onClose: () => !done && resolve('cancel'),
      children: (close) => (
        <div className="flex flex-col">
          <div className="text-[18px] mb-[20px] max-w-[560px]">
            This post was already published. Republishing will publish it again to {name} at {date.format('DD/MM/YYYY HH:mm')}.
            {!!post.intervalInDays && (
              <div className="mt-[10px] text-[15px]">
                This is a recurring post: your changes apply to all future recurrences starting now.
              </div>
            )}
          </div>
          <RepublishChoice
            onChoose={(v) => {
              done = true;
              resolve(v);
              close();
            }}
          />
        </div>
      ),
    });
  });

export const usePostActions = () => {
  const deleteGroup = useDb((s) => s.deleteGroup);

  const editPost = useCallback((post: Post) => () => openComposer({ group: post.group }), []);
  const duplicatePost = useCallback(
    (post: Post) => () => openComposer({ group: post.group, duplicate: true }),
    []
  );
  const deletePost = useCallback(
    (post: Post) => async () => {
      if (await deleteDialog('Are you sure you want to delete post?')) {
        deleteGroup(post.group);
        toast('Post deleted successfully', 'success');
      }
    },
    [deleteGroup]
  );
  const preview = useCallback((post: Post) => () => window.open(`/p/${post.id}?share=true`, '_blank'), []);
  const openPost = useCallback(
    (post: Post) => () => {
      if (post.releaseURL) window.open(post.releaseURL, '_blank', 'noopener');
      else toast('This post has no public link', 'warning');
    },
    []
  );
  return { editPost, duplicatePost, deletePost, preview, openPost };
};
