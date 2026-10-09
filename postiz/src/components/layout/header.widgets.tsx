'use client';

import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { decisionModal } from '@/components/ui/modal';

dayjs.extend(relativeTime);

export const StreakComponent = () => {
  const posts = useDb((s) => s.posts);
  const streak = useMemo(() => {
    const days = new Set(
      posts
        .filter((p) => p.state === 'PUBLISHED')
        .map((p) => dayjs(p.publishDate).format('YYYY-MM-DD'))
    );
    let count = 0;
    let day = dayjs();
    if (!days.has(day.format('YYYY-MM-DD'))) {
      day = day.subtract(1, 'day');
    }
    while (days.has(day.format('YYYY-MM-DD'))) {
      count++;
      day = day.subtract(1, 'day');
    }
    return count;
  }, [posts]);

  return (
    <div
      className="flex items-center gap-[6px] text-orange-500 hover:text-orange-400 cursor-default"
      data-tooltip-id="tooltip"
      data-tooltip-content={
        streak
          ? `You have a ${streak} day posting streak, keep it going!`
          : 'Publish a post today to start a streak'
      }
    >
      <svg width="24" height="24" viewBox="0 0 22 27" fill="none" xmlns="http://www.w3.org/2000/svg" className={clsx(streak > 0 && 'animate-pulse')}>
        <path
          d="M17.9862 17.1673C17.7269 18.6157 17.0301 19.9498 15.9896 20.9902C14.949 22.0305 13.6147 22.7271 12.1663 22.986C12.1113 22.9949 12.0557 22.9995 12 22.9998C11.7492 22.9997 11.5075 22.9054 11.323 22.7355C11.1384 22.5656 11.0245 22.3326 11.0037 22.0826C10.9829 21.8326 11.0569 21.584 11.2108 21.3859C11.3648 21.1879 11.5876 21.055 11.835 21.0135C13.9062 20.6648 15.6637 18.9073 16.015 16.8323C16.0594 16.5707 16.2059 16.3375 16.4223 16.184C16.6387 16.0304 16.9072 15.9691 17.1688 16.0135C17.4303 16.058 17.6635 16.2045 17.8171 16.4209C17.9706 16.6372 18.0319 16.9057 17.9875 17.1673H17.9862ZM22 15.9998C22 18.9172 20.8411 21.7151 18.7782 23.778C16.7153 25.8409 13.9174 26.9998 11 26.9998C8.08262 26.9998 5.28473 25.8409 3.22183 23.778C1.15893 21.7151 0 18.9172 0 15.9998C0 12.5098 1.375 8.94105 4.0825 5.39355C4.1682 5.28122 4.27674 5.18833 4.40095 5.12099C4.52516 5.05365 4.66223 5.01341 4.80313 5.00289C4.94403 4.99238 5.08556 5.01185 5.21838 5.06001C5.35121 5.10817 5.47233 5.18393 5.57375 5.2823L8.58875 8.20855L11.3388 0.657298C11.3937 0.50669 11.484 0.371499 11.6022 0.263121C11.7203 0.154744 11.8628 0.0763568 12.0175 0.0345691C12.1723 -0.00721869 12.3349 -0.0111825 12.4915 0.023012C12.6481 0.0572064 12.7942 0.128557 12.9175 0.231048C15.6512 2.4998 22 8.56855 22 15.9998ZM20 15.9998C20 10.2385 15.5262 5.2598 12.7237 2.70855L9.94 10.3423C9.88287 10.4991 9.78741 10.6391 9.66232 10.7495C9.53723 10.86 9.38648 10.9374 9.22383 10.9747C9.06117 11.0119 8.89177 11.0079 8.73107 10.963C8.57036 10.918 8.42346 10.8336 8.30375 10.7173L5.0075 7.5198C3.01125 10.401 2 13.2498 2 15.9998C2 18.3867 2.94821 20.6759 4.63604 22.3638C6.32387 24.0516 8.61305 24.9998 11 24.9998C13.3869 24.9998 15.6761 24.0516 17.364 22.3638C19.0518 20.6759 20 18.3867 20 15.9998Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-[14px] font-semibold">{streak}</span>
    </div>
  );
};

export const OrganizationSelector = () => {
  const user = useDb((s) => s.user);
  const resetDemo = useDb((s) => s.resetDemo);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <>
      <div className="hover:text-newTextColor" ref={ref}>
        <div className="text-[12px] relative">
          <div className="flex items-center gap-[6px] cursor-pointer" onClick={() => setOpen(!open)}>
            <img src={user.picture} className="w-[24px] h-[24px] rounded-full" alt="" />
            <div className="max-w-[240px] truncate mobile:hidden">{user.orgName}</div>
          </div>
          {open && (
            <div className="opacity-0 animate-normalFadeDown py-[8px] absolute top-[100%] mt-[10px] end-0 w-[260px] bg-newBgColorInner text-textColor border-newTableBorder border rounded-[12px] shadow-menu flex flex-col z-[600] text-[14px]">
              <div className="px-[16px] py-[8px] border-b border-newTableBorder mb-[4px]">
                <div className="font-[600]">{user.name}</div>
              </div>
              <div
                className="px-[16px] py-[8px] hover:bg-boxHover cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  router.push('/settings');
                }}
              >
                Settings
              </div>
              <div
                className="px-[16px] py-[8px] hover:bg-boxHover cursor-pointer"
                onClick={async () => {
                  setOpen(false);
                  if (
                    await decisionModal({
                      title: 'Delete all data?',
                      description:
                        'All your channels, posts and media on this computer will be deleted.',
                      approveLabel: 'Yes, delete everything',
                      cancelLabel: 'Cancel',
                      destructive: true,
                    })
                  ) {
                    resetDemo();
                  }
                }}
              >
                <span className="text-red-400">Delete all data</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-[1px] h-[20px] bg-blockSeparator mobile:hidden" />
    </>
  );
};

export const NotificationComponent = () => {
  const notifications = useDb((s) => s.notifications);
  const markRead = useDb((s) => s.markNotificationsRead);
  const [show, setShow] = useState(false);
  const [lastRead, setLastRead] = useState<string[]>([]);
  const ref = useClickOutside<HTMLDivElement>(() => setShow(false));
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative cursor-pointer select-none" ref={ref}>
      <div
        onClick={() => {
          if (!show) {
            setLastRead(notifications.filter((n) => !n.read).map((n) => n.id));
            markRead();
          }
          setShow(!show);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className={clsx('hover:text-newTextColor', unread > 0 && 'origin-top hover:animate-[wiggle_0.5s_ease-in-out]')}>
          <path
            d="M14 21H10M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {unread > 0 && (
            <circle cx="17.0625" cy="5" r="4" fill="#FF3EA2" stroke="var(--new-bgColorInner)" strokeWidth="2" />
          )}
        </svg>
      </div>
      {show && (
        <div className="opacity-0 animate-normalFadeDown mt-[10px] absolute w-[420px] max-w-[calc(100vw-24px)] min-h-[200px] top-[100%] end-0 bg-newBgColorInner text-textColor rounded-[16px] flex flex-col border border-newTableBorder shadow-menu z-[600] cursor-default">
          <div className="p-[16px] border-b border-newTableBorder font-bold">Notifications</div>
          <div className="flex flex-col max-h-[400px] overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
            {!notifications.length && (
              <div className="text-center p-[16px] text-textColor flex-1 flex justify-center items-center mt-[20px]">
                No notifications
              </div>
            )}
            {notifications.map((notification) => {
              const createdAt = dayjs(notification.createdAt);
              const recent = dayjs().diff(createdAt, 'hour') < 24;
              return (
                <div
                  key={notification.id}
                  className={clsx(
                    'text-textColor px-[16px] py-[10px] border-b border-newTableBorder last:border-b-0 transition-colors',
                    lastRead.includes(notification.id) && 'font-bold bg-seventh animate-newMessages'
                  )}
                >
                  <div className="break-words">{notification.content}</div>
                  <div className="text-[11px] mt-[4px] opacity-60 font-normal">
                    {recent ? createdAt.fromNow() : createdAt.format('L LT')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
