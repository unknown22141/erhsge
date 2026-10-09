'use client';

import { FC, ReactNode } from 'react';

export const BottomSheetHeader: FC<{ title: ReactNode; onClose: () => void }> = ({
  title,
  onClose,
}) => (
  <div className="flex items-center px-[16px] pb-[12px]">
    <div className="flex-1 text-[18px] font-[600]">{title}</div>
    <div
      onClick={onClose}
      className="w-[28px] h-[28px] rounded-[6px] bg-btnSimple flex items-center justify-center cursor-pointer"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

export const BottomSheet: FC<{
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  button?: { label: string; onClick: () => void; disabled?: boolean };
}> = ({ title, onClose, children, button }) => (
  <>
    <div
      onClick={onClose}
      className="fixed inset-0 z-[599] bg-popup backdrop-blur-[8px] animate-fadeIn touch-none"
    />
    <div className="fixed inset-x-0 bottom-0 z-[600] max-h-[90%] flex flex-col rounded-t-[24px] bg-newBgColorInner pt-[8px] pb-[24px] animate-slideUp">
      <div className="w-[40px] h-[4px] rounded-full bg-newSep mx-auto mb-[12px]" />
      <BottomSheetHeader title={title} onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-[16px]">{children}</div>
      {button && (
        <div className="px-[16px] pt-[12px]">
          <button
            disabled={button.disabled}
            onClick={button.onClick}
            className="w-full h-[44px] rounded-[8px] bg-[#612BD3] text-white font-[600] disabled:opacity-50"
          >
            {button.label}
          </button>
        </div>
      )}
    </div>
  </>
);
