'use client';

import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Logo } from './logo';
import { ModeComponent } from './mode';
import { Title, TopMenu } from './menu';
import {
  NotificationComponent,
  OrganizationSelector,
  StreakComponent,
} from './header.widgets';

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px] mobile:p-[8px] mobile:pb-[80px]">
      <div className="flex-1 flex gap-[8px] mobile:gap-0">
        {menuOpen && (
          <div
            className="hidden mobile:block fixed inset-0 bg-newBackdrop opacity-60 z-[490] animate-fadeIn"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <div
          className={clsx(
            'flex flex-col bg-newBgColorInner w-[80px] rounded-[12px] mobile:fixed mobile:top-0 mobile:bottom-0 mobile:start-0 mobile:z-[491] mobile:rounded-none mobile:overflow-y-auto mobile:overflow-x-hidden',
            !menuOpen && 'mobile:hidden'
          )}
          onClick={() => setMenuOpen(false)}
        >
          <div
            id="left-menu"
            className="fixed h-full w-[64px] start-[20px] flex flex-1 top-0 mobile:static mobile:h-auto mobile:min-h-full mobile:mx-auto"
          >
            <div className="flex flex-col h-full gap-[32px] mobile:gap-[16px] flex-1 pt-[12px] pb-[20px] mobile:pb-[12px]">
              <div className="flex justify-center">
                <Logo />
              </div>
              <TopMenu />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe transition-[filter] duration-300">
          <div className="flex bg-newBgColorInner h-[80px] mobile:h-[64px] px-[20px] mobile:px-[12px] gap-[12px] items-center">
            <button
              className="hidden mobile:flex items-center justify-center w-[36px] h-[36px] -ms-[6px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxFocused"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div className="text-[24px] mobile:text-[20px] font-[600] flex flex-1 min-w-0">
              <Title />
            </div>
            <div className="flex gap-[20px] mobile:gap-[14px] items-center text-textItemBlur">
              <StreakComponent />
              <div className="w-[1px] h-[20px] bg-blockSeparator mobile:hidden" />
              <OrganizationSelector />
              <div className="hover:text-newTextColor">
                <ModeComponent />
              </div>
              <div className="w-[1px] h-[20px] bg-blockSeparator mobile:hidden" />
              <NotificationComponent />
            </div>
          </div>
          <div className="flex flex-1 min-w-0 gap-[1px] mobile:flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
};
