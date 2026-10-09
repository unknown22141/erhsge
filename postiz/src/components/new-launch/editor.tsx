'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { readMediaFile, useMediaLibrary } from '@/components/media/media.component';
import {
  ConnectionLineIcon,
  DelayIcon,
  EmojiIcon,
  InsertMediaIcon,
  LockIcon,
  ResetIcon,
  TrashIcon,
  ChevronUpIcon,
} from '@/components/ui/icons';
import { deleteDialog } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useMode } from '@/components/layout/mode';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { getProvider } from '@/lib/providers';
import { MediaItem } from '@/lib/types';
import { stripHtml } from '@/lib/utils';
import { toggleBold, toggleUnderline } from './text.transform';
import { useCurrentValues, useLaunchStore, valuesFor } from './store';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export const countChars = (html: string) => [...stripHtml(html)].length;

// Character limits for the current tab: every selected channel in global mode
export const useCharLimits = () => {
  const { current, integrations, selectedIntegrations, internal } = useLaunchStore(
    useShallow((state) => ({
      current: state.current,
      integrations: state.integrations,
      selectedIntegrations: state.selectedIntegrations,
      internal: state.internal,
    }))
  );
  return useMemo(() => {
    if (current !== 'global') {
      const integration = integrations.find((p) => p.id === current);
      return integration
        ? [{ id: integration.id, name: integration.name, identifier: integration.identifier, limit: getProvider(integration.identifier).maxChars }]
        : [];
    }
    return selectedIntegrations
      .filter((p) => !internal.find((i) => i.integration.id === p.integration.id))
      .map((p) => ({
        id: p.integration.id,
        name: p.integration.name,
        identifier: p.integration.identifier,
        limit: getProvider(p.integration.identifier).maxChars,
      }));
  }, [current, integrations, selectedIntegrations, internal]);
};

const ToolbarButton: FC<{
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ tooltip, onClick, children, className }) => (
  <div
    data-tooltip-id="tooltip"
    data-tooltip-content={tooltip}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={clsx(
      'select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center hover:text-[#FC69FF] transition-colors active:scale-95',
      className
    )}
  >
    {children}
  </div>
);

const Information: FC<{ count: number; hasMedia: boolean }> = ({ count, hasMedia }) => {
  const limits = useCharLimits();
  const isGlobal = useLaunchStore((s) => s.current === 'global');
  const relevant = limits.filter((l) => l.limit > 0);
  const exceeded = relevant.filter((l) => count > l.limit);
  const empty = count === 0 && !hasMedia;
  const isValid = !exceeded.length && !empty;
  const display = useMemo(() => {
    const sorted = relevant.slice().sort((a, b) => a.limit - b.limit);
    return sorted.find((l) => count <= l.limit) || sorted[0];
  }, [relevant, count]);

  if (!limits.length) return null;

  return (
    <div
      className={clsx(
        'group rounded-[6px] gap-[4px] h-[30px] px-[6px] flex justify-center items-center relative transition-colors',
        isValid ? 'border border-newColColor' : 'bg-[#FF3F3F]'
      )}
    >
      {isValid ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 7.33333L8 9.33333L14.6667 2.66667M10.6667 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.71569 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.07989 2 5.2V10.8C2 11.9201 2 12.4802 2.21799 12.908C2.40973 13.2843 2.71569 13.5903 3.09202 13.782C3.51984 14 4.07989 14 5.2 14H10.8C11.9201 14 12.4802 14 12.908 13.782C13.2843 13.5903 13.5903 13.2843 13.782 12.908C14 12.4802 14 11.9201 14 10.8V8" stroke="#00EB75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
          <path d="M8.00049 6.00015V8.66682M8.00049 11.3335H8.00715M7.07737 2.59464L1.59411 12.0657C1.28997 12.591 1.1379 12.8537 1.16038 13.0693C1.17998 13.2573 1.2785 13.4282 1.4314 13.5394C1.60671 13.6668 1.91022 13.6668 2.51723 13.6668H13.4837C14.0908 13.6668 14.3943 13.6668 14.5696 13.5394C14.7225 13.4282 14.821 13.2573 14.8406 13.0693C14.8631 12.8537 14.711 12.591 14.4069 12.0657L8.92361 2.59463C8.62056 2.07119 8.46904 1.80947 8.27135 1.72157C8.09892 1.64489 7.90206 1.64489 7.72962 1.72157C7.53193 1.80947 7.38041 2.07119 7.07737 2.59464Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {display && (
        <div className={clsx('text-[10px] font-[600] flex justify-center items-center', !isValid && 'text-white')}>
          {count}/{display.limit}
        </div>
      )}
      {(isGlobal || !isValid) && (
        <>
          <svg className={clsx('group-hover:rotate-180 transition-transform', !isValid && 'text-white')} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5.4563 6L10.5437 6C10.9494 6 11.1526 6.56798 10.8657 6.90016L8.32201 9.84556C8.14417 10.0515 7.85583 10.0515 7.67799 9.84556L5.13429 6.90016C4.84741 6.56798 5.05059 6 5.4563 6Z" fill="currentColor" />
          </svg>
          <div className={clsx('z-[300] hidden rounded-[12px] bg-newBgColorInner group-hover:flex absolute end-0 bottom-[100%] mb-[5px] p-[12px] flex-col gap-[8px] whitespace-nowrap shadow-menu', isValid ? 'border border-newColColor' : 'border border-[#FF3F3F]')}>
            {empty && <div className="text-sm text-[#FF3F3F]">Your post should have at least one character or one image.</div>}
            {limits.map((l) => (
              <div key={l.id} className="flex items-center gap-[8px] text-[13px]">
                <img src={`/icons/platforms/${l.identifier}.png`} className="w-[16px] h-[16px] rounded-[4px]" alt="" />
                <div className="flex-1">{l.name}</div>
                <div className={clsx('font-[600]', count > l.limit ? 'text-[#FF3F3F]' : 'text-[#00EB75]')}>
                  {count}/{l.limit}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DelayComponent: FC<{ index: number; delay: number }> = ({ index, delay }) => {
  const setValueDelay = useLaunchStore((s) => s.setValueDelay);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const options = [1, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440, 2880].map((value) => ({
    value,
    label: value < 60 ? `${value}m` : value < 1440 ? `${value / 60}h` : `${value / 1440}d`,
  }));
  const label = (value: number) => options.find((o) => o.value === value)?.label || `${value}m`;
  const select = (value: number) => {
    setValueDelay(index, value);
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        data-tooltip-id="tooltip"
        data-tooltip-content={!delay ? 'Delay comment' : `Comment delayed by ${label(delay)}`}
        className={clsx('cursor-pointer flex items-center gap-[4px] p-[2px]', delay > 0 && 'bg-[#D82D7E] text-white rounded-full')}
      >
        <DelayIcon />
      </div>
      {open && (
        <div className="z-[300] absolute end-0 top-[100%] w-[200px] bg-newBgColorInner p-[8px] shadow-menu translate-y-[10px] flex flex-col rounded-[8px] border border-newTableBorder animate-normalFadeDown">
          <div className="grid grid-cols-4 gap-[4px]">
            {options.map((option) => (
              <div
                onClick={() => select(option.value)}
                key={option.value}
                className={clsx(
                  'h-[32px] flex items-center justify-center rounded-[4px] cursor-pointer hover:bg-newBgColor text-[13px]',
                  delay === option.value && 'bg-[#612BD3] text-white hover:bg-[#612BD3]'
                )}
              >
                {option.label}
              </div>
            ))}
          </div>
          <div className="border-t border-newTextColor/10 mt-[8px] pt-[8px] flex gap-[4px]">
            <input
              type="number"
              min="1"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom min"
              className="flex-1 w-full h-[32px] px-[8px] rounded-[4px] bg-newBgColor border border-newTextColor/10 text-[13px] outline-none focus:border-[#612BD3]"
            />
            <button
              onClick={() => {
                const value = parseInt(custom, 10);
                if (value > 0) {
                  select(value);
                  setCustom('');
                }
              }}
              className="h-[32px] px-[10px] rounded-[4px] bg-[#612BD3] text-white text-[12px] font-[600]"
            >
              Set
            </button>
          </div>
          {delay > 0 && (
            <button onClick={() => select(0)} className="mt-[8px] h-[32px] w-full rounded-[4px] text-[13px] text-red-400 hover:bg-red-400/10">
              Remove delay
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SignatureButton: FC<{ insert: (html: string) => void }> = ({ insert }) => {
  const signatures = useDb((s) => s.signatures);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <ToolbarButton tooltip="Insert Signature" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M3 17c3-3 4.5-9 7-9s-1 9 1.5 9S16 13 17 13s0 4 2 4h2M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </ToolbarButton>
      {open && (
        <div className="absolute bottom-[36px] start-0 z-[400] w-[260px] bg-newBgColorInner border border-newTableBorder rounded-[12px] shadow-menu p-[8px] flex flex-col gap-[4px] animate-fadeIn">
          {!signatures.length && <div className="p-[8px] text-[13px] text-textItemBlur">No signatures yet, add one in Settings.</div>}
          {signatures.map((s) => (
            <div
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                insert(s.content);
                setOpen(false);
              }}
              className="p-[8px] rounded-[8px] hover:bg-boxHover cursor-pointer text-[13px] line-clamp-2"
            >
              {stripHtml(s.content)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SingleEditor: FC<{
  index: number;
  total: number;
  value: string;
  media: MediaItem[];
  delay: number;
  canEdit: boolean;
  comments: boolean | 'no-media';
  editorType: 'normal' | 'markdown' | 'html';
  autoFocus?: boolean;
}> = ({ index, total, value, media, delay, canEdit, comments, editorType, autoFocus }) => {
  const { setValueText, setValueMedia, addValue, deleteValue, changeOrder, current, internal, existing, addRemoveInternal } =
    useLaunchStore(
      useShallow((s) => ({
        setValueText: s.setValueText,
        setValueMedia: s.setValueMedia,
        addValue: s.addValue,
        deleteValue: s.deleteValue,
        changeOrder: s.changeOrder,
        current: s.current,
        internal: !!s.internal.find((p) => p.integration.id === s.current),
        existing: s.existing,
        addRemoveInternal: s.addRemoveInternal,
      }))
    );
  const mode = useMode((s) => s.mode);
  const addMediaToDb = useDb((s) => s.addMedia);
  const openLibrary = useMediaLibrary();
  const toaster = useToaster();
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const emojiRef = useClickOutside<HTMLDivElement>(() => setEmojiOpen(false));

  // keep the DOM in sync when the value changes from outside (tabs, reorder...)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    setValueText(index, html === '<br>' || html === '<p><br></p>' ? '' : html);
  }, [index, setValueText]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (ref.current && sel) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const insertText = (text: string) => {
    restoreSelection();
    document.execCommand('insertText', false, text);
    saveSelection();
    emit();
  };

  const insertHtml = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    saveSelection();
    emit();
  };

  const transformSelection = (fn: (text: string) => string) => {
    restoreSelection();
    const sel = window.getSelection();
    const text = sel?.toString() || '';
    if (!text) {
      toaster.show('Select some text first', 'warning');
      return;
    }
    document.execCommand('insertText', false, fn(text));
    emit();
  };

  const exec = (command: string, arg?: string) => {
    restoreSelection();
    document.execCommand(command, false, arg);
    emit();
  };

  const upload = async (files: File[]) => {
    const added: MediaItem[] = [];
    for (const file of files) {
      try {
        const { path, type } = await readMediaFile(file);
        added.push(addMediaToDb({ name: file.name, path, type }));
      } catch {
        toaster.show(`Could not upload ${file.name}`, 'warning');
      }
    }
    if (added.length) setValueMedia(index, [...media, ...added]);
  };

  const mediaNotAvailable = index > 0 && comments === 'no-media';
  const count = countChars(value);

  return (
    <div className="relative flex flex-col gap-[20px] flex-1 bg-newSettings rounded-[12px] animate-normalFadeIn">
      <div className="flex gap-[5px] flex-1 w-full min-w-0">
        <div className="flex-1 flex w-full min-w-0">
          {index > 0 && (
            <div className="flex justify-center ps-[12px] text-newSep">
              <ConnectionLineIcon />
            </div>
          )}
          <div className="flex flex-col gap-[20px] flex-1 min-w-0">
            <div
              className={clsx('relative flex-1 px-[12px] pt-[12px] pb-[12px] flex flex-col', index > 0 && '!rounded-bs-[0]')}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                if (!canEdit || !e.dataTransfer.files.length) return;
                e.preventDefault();
                setDragging(false);
                upload(Array.from(e.dataTransfer.files));
              }}
            >
              <div
                className={clsx(
                  'absolute left-0 top-0 w-full h-full bg-black/70 z-[300] rounded-[12px] transition-all items-center justify-center flex text-white text-sm',
                  !dragging ? 'pointer-events-none opacity-0' : 'opacity-100'
                )}
              >
                Drop your files here to upload
              </div>
              <div className="px-[10px] pt-[10px] bg-newBgColorInner rounded-t-[6px] relative z-[99] cursor-text" onClick={() => ref.current?.focus()}>
                <div
                  ref={ref}
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  data-placeholder={index === 0 ? 'Write something...' : 'Write a comment...'}
                  className="postiz-editor outline-none"
                  onInput={emit}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                  onBlur={saveSelection}
                  onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
                  onPaste={(e) => {
                    const files = Array.from(e.clipboardData.files);
                    if (files.length) {
                      e.preventDefault();
                      upload(files);
                      return;
                    }
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                />
              </div>
              <div className="bg-newBgColorInner h-[46px] cursor-text" onClick={() => ref.current?.focus()} />
              <div className="flex flex-col bg-newBgColorInner rounded-b-[6px]">
                {!!media.length && (
                  <div className="flex gap-[10px] px-[12px] pb-[8px] flex-wrap">
                    {media.map((m, mediaIndex) => (
                      <div key={m.id + mediaIndex} className="cursor-pointer rounded-[5px] w-[40px] h-[40px] border-2 border-tableBorder relative flex animate-scaleIn group">
                        {m.type === 'video' ? (
                          <video src={m.path} className="w-full h-full object-cover rounded-[4px]" muted />
                        ) : (
                          <img src={m.path} className="w-full h-full object-cover rounded-[4px]" alt="" />
                        )}
                        <div
                          onClick={() => setValueMedia(index, media.filter((_, i) => i !== mediaIndex))}
                          className="absolute -end-[6px] -top-[6px] z-[20] rounded-full bg-[#FF3F3F] text-white w-[16px] h-[16px] flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex px-[12px] pb-[10px] items-center gap-[8px] flex-wrap">
                  <div className="flex gap-[5px] items-center flex-wrap">
                    {!mediaNotAvailable && (
                      <div
                        onClick={() => openLibrary((selected) => setValueMedia(index, [...media, ...selected]))}
                        className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px] gap-[8px] hover:text-[#FC69FF] transition-colors"
                      >
                        <InsertMediaIcon />
                        <div className="text-[10px] font-[600] maxMedia:hidden block">Insert Media</div>
                      </div>
                    )}
                    <SignatureButton insert={insertHtml} />
                    <ToolbarButton tooltip="Underline" onClick={() => transformSelection(toggleUnderline)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.9993 2.66699V7.33366C11.9993 9.5428 10.2085 11.3337 7.99935 11.3337C5.79021 11.3337 3.99935 9.5428 3.99935 7.33366V2.66699M2.66602 14.0003H13.3327" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </ToolbarButton>
                    <ToolbarButton tooltip="Bold Text" onClick={() => (editorType === 'normal' ? transformSelection(toggleBold) : exec('bold'))}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8.00033H9.33333C10.8061 8.00033 12 6.80642 12 5.33366C12 3.8609 10.8061 2.66699 9.33333 2.66699H4V8.00033ZM4 8.00033H10C11.4728 8.00033 12.6667 9.19423 12.6667 10.667C12.6667 12.1398 11.4728 13.3337 10 13.3337H4V8.00033Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </ToolbarButton>
                    {editorType !== 'normal' && (
                      <>
                        <ToolbarButton
                          tooltip="Insert Link"
                          onClick={() => {
                            const url = window.prompt('Enter the URL');
                            if (url) exec('createLink', url);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6.6668 8.66599C6.9531 9.04875 7.31837 9.36545 7.73783 9.59462C8.1573 9.82379 8.62114 9.96007 9.0979 9.99422C9.57466 10.0284 10.0532 9.95957 10.501 9.79251C10.9489 9.62546 11.3555 9.36404 11.6935 9.02599L13.6935 7.02599C14.3007 6.39732 14.6366 5.55531 14.629 4.68132C14.6215 3.80733 14.2709 2.97129 13.6529 2.35326C13.0348 1.73524 12.1988 1.38467 11.3248 1.37708C10.4508 1.36948 9.60881 1.70547 8.98013 2.31266L7.83347 3.45266M9.33347 7.33266C9.04716 6.94991 8.68189 6.6332 8.26243 6.40403C7.84297 6.17486 7.37913 6.03858 6.90237 6.00444C6.4256 5.97029 5.94708 6.03908 5.49924 6.20614C5.0514 6.3732 4.64472 6.63461 4.3068 6.97266L2.3068 8.97266C1.69961 9.60133 1.36363 10.4433 1.37122 11.3173C1.37881 12.1913 1.72938 13.0274 2.3474 13.6454C2.96543 14.2634 3.80147 14.614 4.67546 14.6216C5.54945 14.6292 6.39146 14.2932 7.02013 13.686L8.16013 12.546" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </ToolbarButton>
                        <ToolbarButton tooltip="Bullets" onClick={() => exec('insertUnorderedList')}>
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M17.5 10L7.5 10M17.5 5.00002L7.5 5.00002M17.5 15L7.5 15M4.16667 10C4.16667 10.4603 3.79357 10.8334 3.33333 10.8334C2.8731 10.8334 2.5 10.4603 2.5 10C2.5 9.53978 2.8731 9.16669 3.33333 9.16669C3.79357 9.16669 4.16667 9.53978 4.16667 10ZM4.16667 5.00002C4.16667 5.46026 3.79357 5.83335 3.33333 5.83335C2.8731 5.83335 2.5 5.46026 2.5 5.00002C2.5 4.53978 2.8731 4.16669 3.33333 4.16669C3.79357 4.16669 4.16667 4.53978 4.16667 5.00002ZM4.16667 15C4.16667 15.4603 3.79357 15.8334 3.33333 15.8334C2.8731 15.8334 2.5 15.4603 2.5 15C2.5 14.5398 2.8731 14.1667 3.33333 14.1667C3.79357 14.1667 4.16667 14.5398 4.16667 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </ToolbarButton>
                        <ToolbarButton tooltip="Heading" onClick={() => exec('formatBlock', 'h2')}>
                          <span className="text-[13px] font-[700]">H</span>
                        </ToolbarButton>
                      </>
                    )}
                    <div className="relative" ref={emojiRef}>
                      <ToolbarButton tooltip="Insert Emoji" onClick={() => setEmojiOpen(!emojiOpen)}>
                        <EmojiIcon />
                      </ToolbarButton>
                      {emojiOpen && (
                        <div className={clsx('absolute z-[500] -start-[50px] animate-fadeIn', index === 0 && total > 1 ? 'top-[35px]' : 'bottom-[35px]')}>
                          <EmojiPicker
                            height={400}
                            theme={mode as any}
                            onEmojiClick={(e: any) => {
                              insertText(e.emoji);
                              setEmojiOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <Information count={count} hasMedia={!!media.length} />
                </div>
              </div>
              {(index === total - 1 || internal) && (
                <div className="flex items-center">
                  <div className="flex-1">
                    {comments && index === total - 1 && (
                      <div className="flex">
                        <div
                          onClick={() => addValue(index)}
                          className="select-none cursor-pointer h-[34px] rounded-[6px] flex bg-[#D82D7E] gap-[8px] justify-center items-center ps-[16px] pe-[20px] text-[13px] font-[600] mt-[12px] text-white transition-transform hover:scale-[1.02] active:scale-95"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8.00065 3.33301V12.6663M3.33398 7.99967H12.6673" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div>{current === 'global' ? 'Add comment or post' : 'Add comment'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {internal && !existing && index === total - 1 && (
                    <div
                      className="mt-[12px] flex gap-[20px] items-center cursor-pointer select-none"
                      onClick={async () => {
                        if (
                          await deleteDialog(
                            'This action is irreversible. Are you sure you want to go back to global mode?',
                            'Yes, go back to global mode'
                          )
                        ) {
                          addRemoveInternal(current);
                        }
                      }}
                    >
                      <div className="flex gap-[6px] items-center">
                        <div className="w-[8px] h-[8px] rounded-full bg-[#FC69FF] animate-pulse" />
                        <div className="text-[14px] font-[600]">Editing a Specific Network</div>
                      </div>
                      <div className="flex gap-[6px] items-center">
                        <ResetIcon />
                        <div className="text-[13px] font-[600]">Back to global</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {comments && total > 1 && (
          <div className="flex flex-col items-center gap-[10px] pe-[12px] pt-[12px]">
            <div className="flex flex-col gap-[8px] pt-[8px]">
              <button
                onClick={() => changeOrder(index, 'up')}
                className={clsx('w-[20px] h-[20px] flex justify-center items-center', index !== 0 ? 'cursor-pointer' : 'pointer-events-none opacity-50')}
              >
                <ChevronUpIcon />
              </button>
              <button
                onClick={() => changeOrder(index, 'down')}
                className={clsx('w-[20px] h-[20px] flex justify-center items-center', index !== total - 1 ? 'cursor-pointer' : 'pointer-events-none opacity-50')}
              >
                <ChevronUpIcon className="rotate-180" />
              </button>
            </div>
            <TrashIcon
              onClick={async () => {
                if (await deleteDialog('Are you sure you want to delete this post?', 'Yes, delete it!')) {
                  deleteValue(index);
                }
              }}
              data-tooltip-id="tooltip"
              data-tooltip-content="Delete Post"
              className="cursor-pointer text-[#FF3F3F]"
            />
            {index > 0 && <DelayComponent index={index} delay={delay} />}
          </div>
        )}
      </div>
    </div>
  );
};

export const EditorWrapper: FC = () => {
  const values = useCurrentValues();
  const { current, isInternal, addRemoveInternal, existing, selectedCount } = useLaunchStore(
    useShallow((s) => ({
      current: s.current,
      isInternal: !!s.internal.find((p) => p.integration.id === s.current),
      addRemoveInternal: s.addRemoveInternal,
      existing: s.existing,
      selectedCount: s.selectedIntegrations.length,
    }))
  );
  const integration = useLaunchStore((s) => s.integrations.find((p) => p.id === s.current));
  const selectedProviders = useLaunchStore(
    useShallow((s) => s.selectedIntegrations.map((p) => p.integration.identifier))
  );
  const provider = integration ? getProvider(integration.identifier) : null;
  const canEdit = current === 'global' || isInternal || existing;
  const editorType = provider
    ? provider.editor
    : selectedProviders.some((p) => getProvider(p).editor === 'html')
    ? 'html'
    : selectedProviders.some((p) => getProvider(p).editor === 'markdown')
    ? 'markdown'
    : 'normal';
  const comments = provider
    ? provider.comments
    : selectedCount === 0 || selectedProviders.some((p) => getProvider(p).comments);
  const [lastLength, setLastLength] = useState(values.length);
  useEffect(() => setLastLength(values.length), [values.length]);

  return (
    <div className={clsx('relative flex-col gap-[20px] flex-1 min-w-0 flex')}>
      {!canEdit && (
        <>
          <div
            onClick={() => addRemoveInternal(current)}
            className="text-center absolute w-full h-full p-[20px] left-0 top-0 items-center justify-center flex z-[101] flex-col gap-[16px] cursor-pointer animate-fadeIn"
          >
            <div className="relative">
              <div className="w-[54px] h-[54px] rounded-full absolute z-[101] flex justify-center items-center">
                <LockIcon />
              </div>
              <div className="w-[54px] h-[54px] rounded-full bg-newSettings opacity-80" />
            </div>
            <div className="text-[14px] font-[600] text-white">
              Click this button to exit global editing and customize the post for this channel
            </div>
            <div className="text-white rounded-[8px] h-[44px] px-[20px] bg-[#D82D7E] cursor-pointer flex justify-center items-center transition-transform hover:scale-105">
              Edit content
            </div>
          </div>
          <div className="absolute w-full h-full left-0 top-0 bg-newBackdrop opacity-60 z-[100] rounded-[12px]" />
        </>
      )}
      {values.map((value, index) => (
        <div key={value.id} className={clsx('flex flex-col', !canEdit && 'blur-s', !canEdit && index > 0 && 'hidden')}>
          <SingleEditor
            index={index}
            total={values.length}
            value={value.content}
            media={value.media}
            delay={value.delay || 0}
            canEdit={canEdit}
            comments={comments}
            editorType={editorType}
            autoFocus={index > 0 && index === values.length - 1 && values.length > lastLength}
          />
        </div>
      ))}
    </div>
  );
};

export { valuesFor };
