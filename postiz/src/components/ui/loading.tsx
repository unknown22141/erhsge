'use client';

import { FC } from 'react';

export const LoadingComponent: FC<{ width?: number; height?: number }> = ({
  width = 100,
  height = 100,
}) => (
  <div className="flex items-center justify-center" style={{ width, height }}>
    <div
      className="rounded-full"
      style={{
        width: width / 2,
        height: height / 2,
        border: '4px solid var(--new-bgLineColor)',
        borderTopColor: '#612BD3',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);
