'use client';

import clsx from 'clsx';
import { FC, useEffect, useRef, useState } from 'react';
import { useDb } from '@/lib/db';
import { useLocalState } from '@/lib/hooks';
import { platformIcon } from '@/lib/providers';
import { makeId, textToHtml } from '@/lib/utils';
import { SVGLine } from '@/components/launches/launches.component';
import { openComposer } from '@/components/new-launch/open.composer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  draft?: string;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
}

const hooks = ['🚀', '💡', '🔥', '✨', '📈'];

// A canned "agent" so the demo works without an AI backend
const draftFor = (prompt: string) => {
  const topic = prompt.replace(/^(write|create|draft|make)\s+(me\s+)?(a\s+)?(post|tweet|thread)?\s*(about|on)?\s*/i, '').trim() || 'our product';
  const emoji = hooks[topic.length % hooks.length];
  return `${emoji} ${topic.charAt(0).toUpperCase() + topic.slice(1)} is changing the way teams work.\n\nHere is what we learned:\n• Start small and stay consistent\n• Listen to your audience\n• Measure what matters\n\nWhat would you add? 👇`;
};

const TypingDots = () => (
  <div className="flex gap-[4px] items-center h-[20px]">
    {[0, 1, 2].map((i) => (
      <div key={i} className="w-[6px] h-[6px] rounded-full bg-textItemBlur animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
    ))}
  </div>
);

export const AgentComponent: FC = () => {
  const integrations = useDb((s) => s.integrations);
  const [selected, setSelected] = useState<string[]>([]);
  const [threads, setThreads] = useLocalState<Thread[]>('agent-threads', []);
  const [currentId, setCurrentId] = useState<string | null>(threads[0]?.id || null);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const current = threads.find((t) => t.id === currentId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [current?.messages.length, typing]);

  const send = () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    const userMessage: Message = { id: makeId(8), role: 'user', content: text };
    let threadId = currentId;
    if (!current) {
      threadId = makeId(8);
      setThreads([{ id: threadId, title: text.slice(0, 40), messages: [userMessage] }, ...threads]);
      setCurrentId(threadId);
    } else {
      setThreads(threads.map((t) => (t.id === current.id ? { ...t, messages: [...t.messages, userMessage] } : t)));
    }
    setTyping(true);
    setTimeout(() => {
      const draft = draftFor(text);
      const names = integrations.filter((i) => selected.includes(i.id)).map((i) => i.name);
      const reply: Message = {
        id: makeId(8),
        role: 'assistant',
        content: `Here is a draft${names.length ? ` for ${names.join(', ')}` : ''}. You can schedule it as is or edit it in the composer.`,
        draft,
      };
      setThreads((list) => list.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, reply] } : t)));
      setTyping(false);
    }, 1200);
  };

  return (
    <>
      <div className="bg-newBgColorInner w-[260px] mobile:w-full p-[20px] mobile:p-[12px] flex flex-col gap-[15px]">
        <h2 className="text-[20px] font-[500]">Select Channels</h2>
        <div className="text-[13px] text-textItemBlur -mt-[8px]">The agent will write for the selected channels</div>
        <div className="flex flex-col gap-[12px] mobile:flex-row mobile:overflow-x-auto">
          {integrations.map((integration) => {
            const isSelected = selected.includes(integration.id);
            return (
              <div
                key={integration.id}
                onClick={() => setSelected(isSelected ? selected.filter((s) => s !== integration.id) : [...selected, integration.id])}
                className={clsx(
                  'flex gap-[12px] items-center group/profile cursor-pointer hover:bg-boxHover rounded-e-[8px] mobile:shrink-0 transition-opacity',
                  !isSelected && 'opacity-40 hover:opacity-100'
                )}
              >
                <div className="relative flex items-center">
                  <div className={clsx('h-full w-[4px] -ms-[12px] rounded-s-[3px] transition-opacity', isSelected ? 'opacity-100' : 'opacity-0 group-hover/profile:opacity-100')}>
                    <SVGLine />
                  </div>
                  <img src={integration.picture} className="rounded-[8px] w-[36px] h-[36px] ms-[8px]" alt="" />
                  <img src={platformIcon(integration.identifier)} className="rounded-[8px] absolute z-10 bottom-[0px] -end-[5px] border border-fifth w-[18px]" alt="" />
                </div>
                <div className="flex-1 truncate mobile:hidden">{integration.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-newBgColorInner flex flex-1 flex-col min-w-0 mobile:min-h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[16px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
          {!current?.messages.length && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-[12px] animate-fadeIn">
              <div className="w-[64px] h-[64px] rounded-[16px] bg-gradient-to-br from-[#612BD3] to-[#D82D7E] flex items-center justify-center text-[28px] animate-pulse">✦</div>
              <div className="text-[24px] font-[600]">Hi! I&apos;m your Postiz agent</div>
              <div className="text-textItemBlur max-w-[420px]">Ask me to write a post, a thread or ideas for your next campaign. Select channels on the left to tailor the content.</div>
              <div className="flex gap-[8px] flex-wrap justify-center mt-[8px]">
                {['Write a post about our new feature', 'Create a thread about productivity', 'Draft a launch announcement'].map((s) => (
                  <div key={s} onClick={() => setInput(s)} className="px-[12px] py-[8px] rounded-full border border-newTableBorder text-[13px] cursor-pointer hover:border-[#612BD3] hover:bg-boxHover transition-colors">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {current?.messages.map((m) => (
            <div key={m.id} className={clsx('flex animate-normalFadeDown', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={clsx('max-w-[70%] mobile:max-w-[90%] rounded-[16px] px-[16px] py-[12px] text-[14px]', m.role === 'user' ? 'bg-[#612BD3] text-white rounded-ee-[4px]' : 'bg-newTableHeader border border-newTableBorder rounded-es-[4px]')}>
                <div>{m.content}</div>
                {m.draft && (
                  <>
                    <div className="mt-[12px] p-[12px] rounded-[12px] bg-newBgColorInner whitespace-pre-wrap">{m.draft}</div>
                    <button
                      onClick={() =>
                        openComposer({
                          selectedChannels: selected,
                          onlyValues: [{ id: makeId(10), content: textToHtml(m.draft!), media: [], delay: 0 }],
                        })
                      }
                      className="mt-[12px] h-[36px] px-[16px] rounded-[8px] bg-[#612BD3] text-white text-[13px] font-[600] hover:brightness-110 active:scale-95 transition-all"
                    >
                      Open in the composer
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start animate-fadeIn">
              <div className="rounded-[16px] px-[16px] py-[12px] bg-newTableHeader border border-newTableBorder">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
        <div className="p-[20px] pt-0">
          <div className="flex items-end gap-[8px] bg-newTableHeader border border-newTableBorder rounded-[16px] p-[8px] focus-within:border-[#612BD3] transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask the agent to write something..."
              className="flex-1 bg-transparent outline-none resize-none px-[8px] py-[8px] text-[14px] max-h-[160px]"
            />
            <button
              onClick={send}
              disabled={!input.trim() || typing}
              className="w-[40px] h-[40px] rounded-[10px] bg-[#612BD3] text-white flex items-center justify-center disabled:opacity-40 transition-all active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="bg-newBgColorInner w-[260px] mobile:w-full p-[20px] flex flex-col gap-[12px] mobile:order-first">
        <button
          onClick={() => setCurrentId(null)}
          className="h-[44px] rounded-[8px] bg-btnPrimary text-white flex items-center justify-center gap-[6px] hover:brightness-110 active:scale-95 transition-all"
        >
          + New conversation
        </button>
        <div className="flex flex-col gap-[4px] overflow-y-auto">
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => setCurrentId(t.id)}
              className={clsx('px-[12px] py-[10px] rounded-[8px] cursor-pointer text-[14px] truncate hover:bg-boxHover transition-colors', t.id === currentId && 'bg-boxHover')}
            >
              {t.title}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
