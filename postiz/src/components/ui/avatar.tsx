'use client';

import clsx from 'clsx';
import { FC } from 'react';
import { platformIcon } from '@/lib/providers';
import { Integration } from '@/lib/types';

// A channel picture with its platform badge in the corner
export const ChannelAvatar: FC<{
  integration: Pick<Integration, 'picture' | 'identifier' | 'name'>;
  size?: number;
  badge?: number;
  rounded?: 'full' | 'md';
  className?: string;
  badgeClassName?: string;
}> = ({ integration, size = 36, badge = 18, rounded = 'md', className, badgeClassName }) => (
  <div className={clsx('relative shrink-0', className)} style={{ width: size, height: size }}>
    <img
      src={integration.picture || '/no-picture.jpg'}
      onError={(e) => {
        e.currentTarget.src = '/no-picture.jpg';
      }}
      alt={integration.name}
      className={clsx(rounded === 'full' ? 'rounded-full' : 'rounded-[8px]', 'w-full h-full object-cover')}
    />
    <img
      src={platformIcon(integration.identifier)}
      alt={integration.identifier}
      className={clsx(
        'absolute z-10 -bottom-[4px] -end-[4px]',
        integration.identifier !== 'youtube' && 'rounded-[6px] border border-fifth',
        badgeClassName
      )}
      style={{ width: badge, height: integration.identifier === 'youtube' ? 'auto' : badge }}
    />
  </div>
);
