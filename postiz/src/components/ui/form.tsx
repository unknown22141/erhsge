'use client';

import clsx from 'clsx';
import {
  DetailedHTMLProps,
  FC,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export const Input: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    label?: string;
    error?: string;
    icon?: ReactNode;
    removeError?: boolean;
    wrapperClassName?: string;
  }
> = ({ label, error, icon, removeError, wrapperClassName, className, ...rest }) => {
  return (
    <div className={clsx('flex flex-col gap-[6px]', wrapperClassName)}>
      {!!label && <div className="text-[14px]">{label}</div>}
      <div
        className={clsx(
          'bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor flex items-center justify-center focus-within:border-[#612BD3] transition-colors',
          className
        )}
      >
        {icon && <div className="ps-[16px]">{icon}</div>}
        <input
          className={clsx(
            'h-full bg-transparent outline-none flex-1 text-[14px] text-textColor min-w-0',
            icon ? 'ps-[8px] pe-[16px]' : 'px-[16px]'
          )}
          {...rest}
        />
      </div>
      {!removeError && (
        <div className="text-red-400 text-[12px]">{error || <>&nbsp;</>}</div>
      )}
    </div>
  );
};

export const Textarea: FC<
  DetailedHTMLProps<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  > & { label?: string }
> = ({ label, className, ...rest }) => (
  <div className="flex flex-col gap-[6px]">
    {!!label && <div className="text-[14px]">{label}</div>}
    <textarea
      className={clsx(
        'bg-newBgColorInner min-h-[100px] p-[16px] border-newTableBorder border rounded-[8px] text-[14px] text-textColor outline-none focus:border-[#612BD3] transition-colors',
        className
      )}
      {...rest}
    />
  </div>
);

export const Select: FC<
  DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
    label?: string;
    hideErrors?: boolean;
    error?: string;
  }
> = ({ label, hideErrors, error, className, ...rest }) => {
  return (
    <div className={clsx('flex flex-col', label ? 'gap-[6px]' : '')}>
      {!!label && <div className="text-[14px]">{label}</div>}
      <select
        className={clsx(
          'h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px] text-textColor cursor-pointer',
          className
        )}
        {...rest}
      />
      {!hideErrors && (
        <div className="text-red-400 text-[12px]">{error || <>&nbsp;</>}</div>
      )}
    </div>
  );
};

// The square purple checkbox used across Postiz
export const Check: FC<{ value: boolean; onChange: (value: boolean) => void; className?: string }> = ({
  value,
  onChange,
  className,
}) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onChange(!value);
    }}
    className={clsx(
      'cursor-pointer w-[20px] h-[20px] min-w-[20px] rounded-[6px] flex items-center justify-center transition-all',
      value ? 'bg-[#612BD3]' : 'border-[1.5px] border-newSep',
      className
    )}
  >
    {value && (
      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
        <path
          d="M1 4.5L4.33333 8L11 1"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </div>
);

export const Slider: FC<{ value: boolean; onChange: (value: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <div
    onClick={() => onChange(!value)}
    className={clsx(
      'w-[44px] h-[24px] rounded-full p-[2px] cursor-pointer transition-colors flex',
      value ? 'bg-[#612BD3]' : 'bg-newSep'
    )}
  >
    <div
      className={clsx(
        'w-[20px] h-[20px] rounded-full bg-white transition-transform shadow',
        value ? 'translate-x-[20px] rtl:-translate-x-[20px]' : 'translate-x-0'
      )}
    />
  </div>
);
