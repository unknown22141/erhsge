'use client';

import { useCallback } from 'react';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { getProvider } from '@/lib/providers';
import { Post } from '@/lib/types';
import { deleteDialog, openModal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toaster';
import { openComposer } from '@/components/new-launch/open.composer';

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const StatisticsModal = ({ post }: { post: Post }) => {
  const integration = useDb((s) => s.integrations.find((i) => i.id === post.integrationId));
  const seed = hash(post.id);
  const stats = [
    { label: 'Impressions', value: 500 + (seed % 9500) },
    { label: 'Likes', value: 10 + (seed % 480) },
    { label: 'Comments', value: seed % 60 },
    { label: 'Reposts', value: seed % 90 },
    { label: 'Clicks', value: 5 + (seed % 300) },
    { label: 'Engagement rate', value: `${((seed % 900) / 100 + 1).toFixed(2)}%` },
  ];
  return (
    <div className="flex flex-col gap-[20px]">
      {integration && (
        <div className="flex items-center gap-[12px]">
          <img src={integration.picture} className="w-[40px] h-[40px] rounded-full" alt="" />
          <div>
            <div className="font-[600]">{integration.name}</div>
            <div className="text-[13px] text-textItemBlur">
              {getProvider(integration.identifier).name.split('\n')[0]} · {dayjs(post.publishDate).format('LLL')}
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 mobile:grid-cols-2 gap-[12px]">
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="bg-newTableHeader border border-newTableBorder rounded-[12px] p-[16px] opacity-0 animate-normalFadeDown"
          >
            <div className="text-[13px] text-newTableText">{s.label}</div>
            <div className="text-[28px] font-[600]">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
          </div>
        ))}
      </div>
      <div className="text-[12px] text-textItemBlur">Statistics are simulated in this demo.</div>
    </div>
  );
};

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
  const statistics = useCallback(
    (post: Post) => () =>
      openModal({
        title: 'Statistics',
        closeOnClickOutside: true,
        size: 'min(900px, 95vw)',
        children: <StatisticsModal post={post} />,
      }),
    []
  );
  const openPost = useCallback(
    (post: Post) => () => {
      if (post.releaseURL) window.open(post.releaseURL, '_blank', 'noopener');
      else toast('This post has no public link', 'warning');
    },
    []
  );
  return { editPost, duplicatePost, deletePost, preview, statistics, openPost };
};
