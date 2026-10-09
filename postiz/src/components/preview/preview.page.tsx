'use client';

import { useState } from 'react';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { getProvider } from '@/lib/providers';
import { makeId } from '@/lib/utils';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { GeneralPreview } from '@/components/new-launch/preview';
import { useToaster } from '@/components/ui/toaster';
import { useLocalState } from '@/lib/hooks';

export const PreviewPage = ({ id }: { id: string }) => {
  const post = useDb((s) => s.posts.find((p) => p.id === id));
  const integration = useDb((s) => s.integrations.find((i) => i.id === post?.integrationId));
  const user = useDb((s) => s.user);
  const toaster = useToaster();
  const [comments, setComments] = useLocalState<{ id: string; text: string; date: string }[]>(`preview-comments-${id}`, []);
  const [text, setText] = useState('');

  if (!post || !integration) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-[12px] text-newTextColor">
        <Logo />
        <div className="text-[24px] font-[600]">Post not found</div>
        <div className="text-textItemBlur">The post was deleted or the link is wrong.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-newTextColor p-[12px]">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-[12px]">
        <div className="flex items-center gap-[12px] bg-newBgColorInner rounded-[12px] px-[20px] h-[80px]">
          <Logo size={48} />
          <div className="flex-1">
            <div className="text-[20px] font-[600]">Post Preview</div>
            <div className="text-[13px] text-textItemBlur">
              {getProvider(integration.identifier).name.split('\n')[0]} · {dayjs(post.publishDate).format('LLL')}
            </div>
          </div>
          <Button
            secondary
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
              } catch {}
              toaster.show('Link copied to clipboard', 'success');
            }}
          >
            Copy link
          </Button>
        </div>
        <div className="flex gap-[12px] mobile:flex-col">
          <div className="flex-1 bg-newBgColorInner rounded-[12px] p-[20px] animate-normalFadeDown">
            <GeneralPreview values={post.values} integration={integration} />
          </div>
          <div className="w-[360px] mobile:w-full bg-newBgColorInner rounded-[12px] p-[20px] flex flex-col gap-[12px]">
            <div className="text-[18px] font-[600]">Comments</div>
            <div className="flex-1 flex flex-col gap-[10px] min-h-[200px]">
              {!comments.length && <div className="text-textItemBlur text-[14px]">No comments yet, be the first to leave feedback.</div>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-[8px] animate-normalFadeDown">
                  <img src={user.picture} className="w-[32px] h-[32px] rounded-full" alt="" />
                  <div className="flex-1 bg-newTableHeader rounded-[10px] p-[10px]">
                    <div className="text-[13px] font-[600]">
                      {user.name} <span className="font-[400] text-textItemBlur">· {dayjs(c.date).fromNow()}</span>
                    </div>
                    <div className="text-[14px] whitespace-pre-wrap">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              className="bg-newTableHeader border border-newTableBorder rounded-[8px] p-[12px] text-[14px] outline-none focus:border-[#612BD3] min-h-[80px]"
            />
            <Button
              disabled={!text.trim()}
              onClick={() => {
                setComments([...comments, { id: makeId(8), text, date: new Date().toISOString() }]);
                setText('');
              }}
            >
              Add comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
