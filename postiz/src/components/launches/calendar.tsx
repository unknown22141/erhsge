'use client';

import clsx from 'clsx';
import { FC, Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { useNow } from '@/lib/hooks';
import { platformIcon } from '@/lib/providers';
import { Integration } from '@/lib/types';
import { isUSCitizen, stripHtml } from '@/lib/utils';
import { ChevronUpIcon } from '@/components/ui/icons';
import { toast } from '@/components/ui/toaster';
import { openComposer } from '@/components/new-launch/open.composer';
import { PostWithIntegration, useCalendar } from './calendar.context';
import { askRepublish, usePostActions } from './post.actions';
import { useAddProvider } from './add.provider';

export const hours = Array.from({ length: 24 }, (_, i) => i);

const convertTime = (time: number) =>
  isUSCitizen() ? `${time === 12 ? 12 : time % 12 || 12}:00 ${time >= 12 ? 'PM' : 'AM'}` : `${time}:00`;

const NowTime: FC<{ time: string }> = ({ time }) => (
  <div className="rounded-[6px] bg-newTableTextFocused px-[6px] text-[12px] leading-[20px] font-[500] text-black whitespace-nowrap shadow-[0_0_12px_rgba(252,105,255,0.6)]">
    {time}
  </div>
);

// The current time line across the week, placed in the current hour row
const WeekNowLine: FC<{ days: dayjs.Dayjs[] }> = ({ days }) => {
  const now = dayjs(useNow());
  const todayIndex = days.findIndex((day) => day.isSame(now, 'day'));
  if (todayIndex === -1) return null;
  const gridRow = `${now.hour() + 2} / ${now.hour() + 3}`;
  const top = `${(now.minute() / 60) * 100}%`;
  return (
    <>
      <div className="absolute inset-0 bg-newBgColorInner pointer-events-none" style={{ gridColumn: '1 / 2', gridRow }}>
        <div className="absolute end-0 -translate-y-1/2" style={{ top }}>
          <NowTime time={now.format(isUSCitizen() ? 'h:mm A' : 'H:mm')} />
        </div>
      </div>
      {days.map((day, index) => (
        <div
          key={day.format('YYYY-MM-DD')}
          className="absolute start-0 end-0 h-0 flex items-center z-[15] pointer-events-none"
          style={{ gridColumn: `${index + 2} / ${index + 3}`, gridRow, top }}
        >
          {index === todayIndex ? (
            <>
              <div className="w-[3px] h-[12px] rounded-full bg-newTableTextFocused" />
              <div className="flex-1 h-[3px] bg-newTableTextFocused shadow-[0_0_8px_rgba(252,105,255,0.7)]" />
            </>
          ) : (
            <div className="flex-1 h-[1px] bg-newTableTextFocused opacity-40" />
          )}
        </div>
      ))}
    </>
  );
};

const Duplicate = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="none" data-tooltip-id="tooltip" data-tooltip-content="Duplicate Post">
    <path d="M27 5H9C8.46957 5 7.96086 5.21071 7.58579 5.58579C7.21071 5.96086 7 6.46957 7 7V9H5C4.46957 9 3.96086 9.21071 3.58579 9.58579C3.21071 9.96086 3 10.4696 3 11V25C3 25.5304 3.21071 26.0391 3.58579 26.4142C3.96086 26.7893 4.46957 27 5 27H23C23.5304 27 24.0391 26.7893 24.4142 26.4142C24.7893 26.0391 25 25.5304 25 25V23H27C27.5304 23 28.0391 22.7893 28.4142 22.4142C28.7893 22.0391 29 21.5304 29 21V7C29 6.46957 28.7893 5.96086 28.4142 5.58579C28.0391 5.21071 27.5304 5 27 5ZM23 11V13H5V11H23ZM23 25H5V15H23V25ZM27 21H25V11C25 10.4696 24.7893 9.96086 24.4142 9.58579C24.0391 9.21071 23.5304 9 23 9H9V7H27V21Z" fill="currentColor" />
  </svg>
);
const Preview = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="none" data-tooltip-id="tooltip" data-tooltip-content="Preview Post">
    <path d="M30.9137 15.595C30.87 15.4963 29.8112 13.1475 27.4575 10.7937C24.3212 7.6575 20.36 6 16 6C11.64 6 7.67874 7.6575 4.54249 10.7937C2.18874 13.1475 1.12499 15.5 1.08624 15.595C1.02938 15.7229 1 15.8613 1 16.0012C1 16.1412 1.02938 16.2796 1.08624 16.4075C1.12999 16.5062 2.18874 18.8538 4.54249 21.2075C7.67874 24.3425 11.64 26 16 26C20.36 26 24.3212 24.3425 27.4575 21.2075C29.8112 18.8538 30.87 16.5062 30.9137 16.4075C30.9706 16.2796 31 16.1412 31 16.0012C31 15.8613 30.9706 15.7229 30.9137 15.595ZM16 24C12.1525 24 8.79124 22.6012 6.00874 19.8438C4.86704 18.7084 3.89572 17.4137 3.12499 16C3.89551 14.5862 4.86686 13.2915 6.00874 12.1562C8.79124 9.39875 12.1525 8 16 8C19.8475 8 23.2087 9.39875 25.9912 12.1562C27.1352 13.2912 28.1086 14.5859 28.8812 16C27.98 17.6825 24.0537 24 16 24ZM16 10C14.8133 10 13.6533 10.3519 12.6666 11.0112C11.6799 11.6705 10.9108 12.6075 10.4567 13.7039C10.0026 14.8003 9.88377 16.0067 10.1153 17.1705C10.3468 18.3344 10.9182 19.4035 11.7573 20.2426C12.5965 21.0818 13.6656 21.6532 14.8294 21.8847C15.9933 22.1162 17.1997 21.9974 18.2961 21.5433C19.3924 21.0892 20.3295 20.3201 20.9888 19.3334C21.6481 18.3467 22 17.1867 22 16C21.9983 14.4092 21.3657 12.884 20.2408 11.7592C19.1159 10.6343 17.5908 10.0017 16 10ZM16 20C15.2089 20 14.4355 19.7654 13.7777 19.3259C13.1199 18.8864 12.6072 18.2616 12.3045 17.5307C12.0017 16.7998 11.9225 15.9956 12.0768 15.2196C12.2312 14.4437 12.6122 13.731 13.1716 13.1716C13.731 12.6122 14.4437 12.2312 15.2196 12.0769C15.9956 11.9225 16.7998 12.0017 17.5307 12.3045C18.2616 12.6072 18.8863 13.1199 19.3259 13.7777C19.7654 14.4355 20 15.2089 20 16C20 17.0609 19.5786 18.0783 18.8284 18.8284C18.0783 19.5786 17.0609 20 16 20Z" fill="currentColor" />
  </svg>
);
const OpenPost = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" data-tooltip-id="tooltip" data-tooltip-content="Open Post">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26Zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16Zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8ZM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96ZM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2Zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38Z" fill="currentColor" />
  </svg>
);
export const StatisticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 32 32" fill="none" data-tooltip-id="tooltip" data-tooltip-content="Post Statistics">
    <path d="M28 25H27V5C27 4.73478 26.8946 4.48043 26.7071 4.29289C26.5196 4.10536 26.2652 4 26 4H19C18.7348 4 18.4804 4.10536 18.2929 4.29289C18.1054 4.48043 18 4.73478 18 5V10H12C11.7348 10 11.4804 10.1054 11.2929 10.2929C11.1054 10.4804 11 10.7348 11 11V16H6C5.73478 16 5.48043 16.1054 5.29289 16.2929C5.10536 16.4804 5 16.7348 5 17V25H4C3.73478 25 3.48043 25.1054 3.29289 25.2929C3.10536 25.4804 3 25.7348 3 26C3 26.2652 3.10536 26.5196 3.29289 26.7071C3.48043 26.8946 3.73478 27 4 27H28C28.2652 27 28.5196 26.8946 28.7071 26.7071C28.8946 26.5196 29 26.2652 29 26C29 25.7348 28.8946 25.4804 28.7071 25.2929C28.5196 25.1054 28.2652 25 28 25ZM20 6H25V25H20V6ZM13 12H18V25H13V12ZM7 18H11V25H7V18Z" fill="currentColor" />
  </svg>
);
const DeletePost = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-tooltip-id="tooltip" data-tooltip-content="Delete Post">
    <path d="M15 10V18H9V10H15ZM14 4H9.9L8.9 5H6V7H18V5H15L14 4ZM17 8H7V18C7 19.1 7.9 20 9 20H15C16.1 20 17 19.1 17 18V8Z" fill="currentColor" />
  </svg>
);

const CalendarItem: FC<{
  post: PostWithIntegration;
  display: 'day' | 'week' | 'month';
  isBeforeNow: boolean;
  showTime?: boolean;
}> = memo(({ post, display, isBeforeNow, showTime }) => {
  const tags = useDb((s) => s.tags);
  const actions = usePostActions();
  const firstTag = tags.find((t) => t.name === post.tags[0]);
  const state = post.state;
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: { id: post.id },
      collect: (monitor) => ({ opacity: monitor.isDragging() ? 0 : 1 }),
    }),
    [post.id]
  );
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      ref={dragRef as any}
      className={clsx(
        'w-full flex h-full flex-1 flex-col group relative animate-normalFadeIn',
        state === 'ERROR' && 'rounded-[10px] ring-2 ring-red-500',
        state === 'PUBLISHED' && 'rounded-[10px] ring-2 ring-green-500'
      )}
      style={{ opacity }}
    >
      {state === 'ERROR' && (
        <div
          className={clsx('absolute -top-[6px] -start-[6px] z-20 w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-white text-[11px] font-bold cursor-pointer', display === 'month' && 'mobile:hidden')}
          data-tooltip-id="tooltip"
          data-tooltip-content={post.error || 'An error occurred while publishing this post'}
        >
          !
        </div>
      )}
      {state === 'PUBLISHED' && (
        <div className={clsx('absolute -top-[6px] -start-[6px] z-20 w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center text-white text-[11px] font-bold', display === 'month' && 'mobile:hidden')}>
          ✓
        </div>
      )}
      <div
        className={clsx(
          'text-white text-[11px] max-h-[24px] h-[24px] min-h-[24px] w-full rounded-tr-[10px] rounded-tl-[10px] flex items-center justify-center gap-[6px] px-[5px] bg-btnPrimary',
          display === 'month' && 'mobile:hidden'
        )}
        style={{ backgroundColor: firstTag?.color }}
      >
        <div className={clsx(firstTag?.color && 'text-shadow-tags', 'group-hover:hidden cursor-pointer truncate')}>{post.tags.join(', ')}</div>
        {(state === 'PUBLISHED' || state === 'ERROR') && post.releaseURL && (
          <div className="hidden group-hover:block hover:scale-125 transition-transform cursor-pointer" onClick={stop(actions.openPost(post))}>
            <OpenPost />
          </div>
        )}
        <div className="hidden group-hover:block hover:scale-125 transition-transform cursor-pointer" onClick={stop(actions.preview(post))}>
          <Preview />
        </div>
        <div className="hidden group-hover:block hover:scale-125 transition-transform cursor-pointer" onClick={stop(actions.duplicatePost(post))}>
          <Duplicate />
        </div>
        <div className="hidden group-hover:block hover:scale-125 transition-transform cursor-pointer text-red-500" onClick={stop(actions.deletePost(post))}>
          <DeletePost />
        </div>
      </div>
      <div
        onClick={actions.editPost(post)}
        className={clsx(
          'gap-[5px] w-full flex h-full flex-1 rounded-br-[10px] rounded-bl-[10px] p-[8px] text-[14px] bg-newColColor relative cursor-pointer hover:brightness-110 transition-[filter]',
          display === 'month' && 'mobile:p-[4px] mobile:rounded-[10px] mobile:justify-center',
          isBeforeNow && '!grayscale'
        )}
      >
        <div className="relative min-w-[20px]">
          <img className="w-[20px] h-[20px] rounded-[8px]" src={post.integration.picture || '/no-picture.jpg'} alt="" />
          <img className="w-[12px] h-[12px] rounded-[8px] absolute z-10 top-[10px] end-0 border border-fifth" src={platformIcon(post.integration.identifier)} alt="" />
        </div>
        <div className={clsx('w-full flex-1 flex flex-col min-h-[40px] min-w-0', display === 'month' && 'mobile:hidden')}>
          <div className="text-start">{state === 'DRAFT' ? 'Draft: ' : ''}</div>
          <div className="w-full relative">
            <div className="absolute top-0 start-0 w-full text-ellipsis break-words line-clamp-1 text-start">
              {stripHtml(post.values[0]?.content || '') || 'no content'}
            </div>
          </div>
        </div>
        {showTime && (
          <div className="text-textColor/50 text-[12px] whitespace-nowrap flex items-center">
            {dayjs(post.publishDate).format(isUSCitizen() ? 'hh:mm A' : 'HH:mm')}
          </div>
        )}
      </div>
    </div>
  );
});
CalendarItem.displayName = 'CalendarItem';

export const CalendarColumn: FC<{
  getDate: dayjs.Dayjs;
  randomHour?: boolean;
  slotIntegrations?: Integration[];
}> = ({ getDate, randomHour, slotIntegrations }) => {
  const { integrations, posts, display } = useCalendar();
  const changePostDate = useDb((s) => s.changePostDate);
  const allIntegrations = useDb((s) => s.integrations);
  const now = dayjs(useNow());
  const addProvider = useAddProvider();
  const [showAll, setShowAll] = useState(false);

  const postList = useMemo(
    () =>
      posts.filter((post) => {
        const p = dayjs(post.publishDate);
        return display === 'day'
          ? p.format('YYYY-MM-DD HH:mm') === getDate.format('YYYY-MM-DD HH:mm')
          : display === 'week'
          ? p.isSameOrAfter(getDate.startOf('hour')) && p.isBefore(getDate.endOf('hour'))
          : p.format('DD/MM/YYYY') === getDate.format('DD/MM/YYYY');
      }),
    [posts, display, getDate]
  );
  const list = showAll ? postList : postList.slice(0, 3);

  const isBeforeNow = display === 'month' ? getDate.endOf('day').isBefore(now) : getDate.startOf('hour').isBefore(now.startOf('hour'));

  const [{ canDrop }, drop] = useDrop(
    () => ({
      accept: 'post',
      drop: async (item: { id: string }) => {
        if (isBeforeNow) return;
        const post = useDb.getState().posts.find((p) => p.id === item.id);
        if (!post) return;
        const original = dayjs(post.publishDate);
        const target =
          display === 'month'
            ? getDate.startOf('day').hour(original.hour()).minute(original.minute())
            : display === 'week'
            ? getDate.startOf('hour').minute(original.minute())
            : getDate.second(0).millisecond(0);
        const finalDate = target.isBefore(dayjs()) ? dayjs().add(10, 'minute') : target;
        if (post.state === 'PUBLISHED') {
          const integration = allIntegrations.find((i) => i.id === post.integrationId);
          const choice = await askRepublish(post, integration?.name || '', finalDate);
          if (choice === 'cancel') return;
          if (choice === 'update') {
            toast('Post details updated', 'success');
            return;
          }
        }
        changePostDate(item.id, finalDate.toISOString());
        toast('Post rescheduled', 'success');
      },
      collect: (monitor) => ({ canDrop: isBeforeNow ? false : !!monitor.canDrop() && !!monitor.isOver() }),
    }),
    [isBeforeNow, getDate, display, allIntegrations]
  );

  const addModal = useCallback(() => {
    const date = randomHour
      ? getDate.startOf('day').hour(getDate.isSame(now, 'day') ? Math.min(now.hour() + 1, 23) : 9)
      : getDate.format('YYYY-MM-DDTHH') === now.format('YYYY-MM-DDTHH')
      ? now.add(10, 'minute')
      : getDate;
    openComposer({
      date,
      selectedChannels: slotIntegrations?.map((p) => p.id),
    });
  }, [getDate, randomHour, now, slotIntegrations]);

  return (
    <div
      className={clsx(
        'flex flex-col w-full min-h-full relative',
        isBeforeNow && 'repeated-strip',
        isBeforeNow ? 'cursor-not-allowed' : 'border border-newTextColor/5 rounded-[8px]'
      )}
      ref={drop as any}
    >
      {display === 'month' && (
        <div className="pt-[3px] text-[14px] mobile:pt-[2px] mobile:text-[12px] flex justify-center">
          <div
            className={clsx(
              'h-[24px] min-w-[24px] px-[5px] rounded-[6px] flex items-center justify-center',
              getDate.isSame(now, 'day') && 'bg-newTableTextFocused text-black font-[600]'
            )}
          >
            {getDate.date()}
          </div>
        </div>
      )}
      <div
        className={clsx(
          'relative flex flex-col flex-1 text-white rounded-[8px] min-h-[70px] transition-all duration-150',
          canDrop && 'border border-[#612BD3] bg-[#612BD3]/10 scale-[1.02]'
        )}
      >
        <div
          className={clsx(
            'flex-col text-[12px] w-full flex',
            isBeforeNow ? 'flex-1' : 'cursor-pointer',
            isBeforeNow && postList.length === 0 && 'col-calendar'
          )}
        >
          {list.map((post) => (
            <div key={post.id} className="text-textColor p-[2.5px] relative flex flex-col justify-center items-center">
              <div className={clsx('relative w-full flex flex-col items-center p-[2.5px]', display === 'month' && 'mobile:p-0')}>
                <CalendarItem post={post} display={display as 'day' | 'week' | 'month'} isBeforeNow={isBeforeNow} />
              </div>
            </div>
          ))}
          {!showAll && postList.length > 3 && (
            <div className="text-center hover:underline py-[5px] text-textColor cursor-pointer" onClick={() => setShowAll(true)}>
              + Show more ({postList.length - 3})
            </div>
          )}
          {showAll && postList.length > 3 && (
            <div className="text-center hover:underline py-[5px] text-textColor cursor-pointer flex justify-center" onClick={() => setShowAll(false)}>
              <span className={clsx(display === 'month' && 'mobile:hidden')}>- Show less</span>
              {display === 'month' && <ChevronUpIcon size={16} className="hidden mobile:inline" />}
            </div>
          )}
        </div>
        {!isBeforeNow && (
          <div className="pb-[2.5px] px-[5px] flex-1 flex" onClick={integrations.length ? addModal : addProvider}>
            <div
              className={clsx(
                display === 'month' ? 'flex-1 min-h-[40px] w-full' : !postList.length ? 'min-h-full w-full p-[5px]' : 'min-h-[40px] w-full',
                'flex items-center justify-center cursor-pointer pb-[2.5px]'
              )}
            >
              {display !== 'day' && (
                <div className="group w-full h-full rounded-[10px] flex justify-center items-center text-white">
                  <div className='group-hover:before:content-["+"] text-[20px] pb-[2px] flex justify-center items-center rounded-[8px] transition-all duration-200 group-hover:bg-btnPrimary group-hover:scale-100 scale-75 w-full h-full max-w-[40px] max-h-[40px] relative z-[16]' />
                </div>
              )}
              {display === 'day' && (
                <div className="w-full h-full rounded-[10px] py-[10px] flex-wrap hover:border hover:border-seventh flex justify-center items-center gap-[20px] opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  {(slotIntegrations || integrations).map((integration) => (
                    <div className="relative" key={integration.id}>
                      <div className="relative w-[34px] h-[34px] rounded-[8px] flex justify-center items-center">
                        <img src={integration.picture || '/no-picture.jpg'} className="rounded-[8px] w-[32px] h-[32px]" alt="" />
                        <img src={platformIcon(integration.identifier)} className="rounded-[8px] absolute z-10 -bottom-[5px] -end-[5px] border border-fifth w-[20px]" alt="" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DayView = () => {
  const { visibleIntegrations, posts, startDate } = useCalendar();
  const now = dayjs(useNow());
  const day = dayjs(startDate).startOf('day');

  const options = useMemo(() => {
    const map = new Map<number, Integration[]>();
    visibleIntegrations.forEach((integration) =>
      integration.time.forEach(({ time }) => {
        map.set(time, [...(map.get(time) || []), integration]);
      })
    );
    posts
      .filter((p) => dayjs(p.publishDate).isSame(day, 'day'))
      .forEach((p) => {
        const d = dayjs(p.publishDate);
        const time = d.hour() * 60 + d.minute();
        if (!map.has(time)) map.set(time, [p.integration]);
      });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visibleIntegrations, posts, day]);

  const nowIndex = useMemo(() => {
    if (!day.isSame(now, 'day')) return -1;
    const upcoming = options.findIndex(([time]) => day.add(time, 'minute').isAfter(now));
    return upcoming === -1 ? options.length : upcoming;
  }, [options, day, now]);

  const NowLine = ({ className }: { className?: string }) => (
    <div className={clsx('flex items-center h-[20px] shrink-0 pointer-events-none', className)}>
      <NowTime time={now.format(isUSCitizen() ? 'hh:mm A' : 'LT')} />
      <div className="flex-1 h-[3px] bg-newTableTextFocused" />
    </div>
  );

  return (
    <div className="flex flex-col gap-[10px] flex-1 relative">
      <div className="absolute start-0 top-0 w-full h-full flex flex-col overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        {!options.length && (
          <div className="flex-1 flex items-center justify-center text-textItemBlur">No time slots for this day, add a channel first</div>
        )}
        {options.map(([time, slotIntegrations], index) => (
          <Fragment key={time}>
            {index === nowIndex && <NowLine className={clsx(index > 0 && '-mt-[20px]')} />}
            <div className="text-center text-[14px] min-h-[21px] shrink-0">
              {day.add(time, 'minute').format(isUSCitizen() ? 'hh:mm A' : 'LT')}
            </div>
            <div className="min-h-[60px] shrink-0 rounded-[10px] flex justify-center items-center gap-[10px] mb-[20px]">
              <CalendarColumn getDate={day.add(time, 'minute')} slotIntegrations={slotIntegrations} />
            </div>
          </Fragment>
        ))}
        {nowIndex === options.length && options.length > 0 && <NowLine className="-mt-[20px]" />}
      </div>
    </div>
  );
};

export const WeekView = () => {
  const { startDate } = useCalendar();
  const today = dayjs(useNow());
  const gridRef = useRef<HTMLDivElement>(null);
  // opens on the current hour this week, or on the working day otherwise
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const isThisWeek = dayjs(startDate).isSame(dayjs(), 'isoWeek');
    const hour = isThisWeek ? Math.max(0, dayjs().hour() - 2) : 7;
    const row = grid.children[8 + hour * 8] as HTMLElement | undefined;
    if (row) grid.scrollTo({ top: row.offsetTop - 70, behavior: 'smooth' });
  }, [startDate]);
  const days = useMemo(() => {
    const weekStart = dayjs(startDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = weekStart.add(i, 'day');
      return { name: day.format('dddd'), day: day.format('L'), date: day };
    });
  }, [startDate]);

  return (
    <div className="flex flex-col text-textColor flex-1">
      <div className="flex-1 relative">
        <div
          key={startDate}
          ref={gridRef}
          className="grid [grid-template-columns:136px_repeat(7,_minmax(0,_1fr))] tablet:[grid-template-columns:72px_repeat(7,_minmax(100px,_1fr))] gap-[4px] rounded-[10px] absolute h-full start-0 top-0 w-full overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor animate-normalFadeIn"
        >
          <div className="z-10 bg-newTableHeader flex justify-center items-center flex-col h-[62px] rounded-[8px] sticky top-0" />
          {days.map((day) => {
            const isToday = day.date.isSame(today, 'day');
            return (
              <div key={day.name} className="p-2 text-center bg-newTableHeader flex justify-center items-center flex-col h-[62px] rounded-[8px] sticky top-0 z-[20]">
                <div className="text-[14px] font-[500] text-newTableText">{day.name}</div>
                <div className={clsx('text-[14px] font-[600] flex items-center justify-center gap-[6px]', isToday && 'text-newTableTextFocused')}>
                  {isToday && <div className="w-[6px] h-[6px] bg-newTableTextFocused rounded-full animate-pulse" />}
                  {day.day}
                </div>
              </div>
            );
          })}
          {hours.map((hour) => (
            <Fragment key={hour}>
              <div className="p-2 pe-4 tablet:px-[4px] text-center items-center justify-center flex text-[14px] tablet:text-[12px] tablet:whitespace-nowrap text-newTableText">
                {convertTime(hour)}
              </div>
              {days.map((day) => (
                <div key={`${day.date.format('YYYY-MM-DD')}-${hour}`} className="relative">
                  <CalendarColumn getDate={day.date.hour(hour).startOf('hour')} />
                </div>
              ))}
            </Fragment>
          ))}
          <WeekNowLine days={days.map((d) => d.date)} />
        </div>
      </div>
    </div>
  );
};

export const MonthView = () => {
  const { startDate } = useCalendar();
  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ name: dayjs().isoWeekday(i + 1).format('dddd'), short: dayjs().isoWeekday(i + 1).format('ddd') })),
    []
  );
  const calendarDays = useMemo(() => {
    const monthStart = dayjs(startDate).startOf('month');
    const first = monthStart.subtract(monthStart.isoWeekday() - 1, 'day');
    return Array.from({ length: 42 }, (_, i) => first.add(i, 'day'));
  }, [startDate]);
  const month = dayjs(startDate).month();

  return (
    <div className="flex flex-col text-textColor flex-1">
      <div className="flex-1 flex relative">
        <div
          key={startDate}
          className="grid grid-cols-7 tablet:[grid-template-columns:repeat(7,_minmax(100px,_1fr))] mobile:!grid-cols-7 grid-rows-[62px_auto] mobile:grid-rows-[36px_auto] gap-[4px] mobile:gap-[2px] rounded-[10px] absolute start-0 top-0 overflow-auto w-full h-full scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary animate-normalFadeIn"
        >
          {dayNames.map((day) => (
            <div key={day.name} className="z-[20] p-2 mobile:p-0 bg-newTableHeader flex justify-center items-center flex-col h-[62px] mobile:h-[36px] rounded-[8px] sticky top-0">
              <div className="mobile:hidden">{day.name}</div>
              <div className="hidden mobile:block text-[13px]">{day.short}</div>
            </div>
          ))}
          {calendarDays.map((date) => (
            <div key={date.format('YYYY-MM-DD')} className={clsx('text-center items-center justify-center flex mobile:min-w-0', date.month() !== month && 'opacity-60')}>
              <CalendarColumn getDate={date.endOf('day')} randomHour={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ListView = () => {
  const { listPosts, listState } = useCalendar();
  const emptyMessage =
    listState === 'scheduled' ? 'No upcoming posts scheduled' : listState === 'draft' ? 'No draft posts' : listState === 'published' ? 'No published posts' : 'No posts';

  const grouped = useMemo(() => {
    const groups: Record<string, PostWithIntegration[]> = {};
    listPosts.forEach((post) => {
      const key = dayjs(post.publishDate).format('YYYY-MM-DD');
      (groups[key] = groups[key] || []).push(post);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [listPosts]);

  if (!listPosts.length) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center animate-fadeIn">
        <div className="text-textColor text-[16px]">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] flex-1 relative">
      <div className="absolute start-0 top-0 w-full h-full flex flex-col overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        {grouped.map(([dateKey, datePosts]) => (
          <Fragment key={dateKey}>
            <div className="text-center text-[14px] min-h-[21px] text-textColor font-[500] mt-[10px]">
              {dayjs(dateKey).format(isUSCitizen() ? 'dddd, MMMM D, YYYY' : 'dddd, D MMMM YYYY')}
            </div>
            <div className="flex flex-col gap-[10px] mb-[20px] px-[10px]">
              {datePosts.map((post, i) => (
                <div key={post.id} className="opacity-0 animate-normalFadeDown" style={{ animationDelay: `${i * 40}ms` }}>
                  <CalendarItem display="day" isBeforeNow={false} post={post} showTime={true} />
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export const Calendar = () => {
  const { display } = useCalendar();
  return display === 'list' ? <ListView /> : display === 'day' ? <DayView /> : display === 'week' ? <WeekView /> : <MonthView />;
};
