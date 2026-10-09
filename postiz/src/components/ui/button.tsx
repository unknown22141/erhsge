'use client';

import clsx from 'clsx';
import { ButtonHTMLAttributes, DetailedHTMLProps, FC } from 'react';

export const Spinner: FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#fff',
}) => (
  <div
    style={{
      width: size,
      height: size,
      border: `3px solid transparent`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}
  />
);

export const Button: FC<
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    secondary?: boolean;
    loading?: boolean;
    innerClassName?: string;
  }
> = ({ children, loading, innerClassName, secondary, className, ...props }) => {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      className={clsx(
        (props.disabled || loading) && 'opacity-50 pointer-events-none',
        secondary ? 'bg-btnSimple text-btnText' : 'bg-btnPrimary text-white',
        'px-[24px] h-[40px] cursor-pointer items-center justify-center flex relative rounded-[8px] transition-opacity hover:opacity-90',
        className
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      <div
        className={clsx(
          innerClassName,
          'flex-1 items-center justify-center flex gap-[8px]',
          loading && 'invisible'
        )}
      >
        {children}
      </div>
    </button>
  );
};
