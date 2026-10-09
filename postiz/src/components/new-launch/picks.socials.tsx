'use client';

import clsx from 'clsx';
import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Check } from '@/components/ui/form';
import { platformIcon } from '@/lib/providers';
import { Integration } from '@/lib/types';
import { useLaunchStore } from './store';

const PlatformBadge: FC<{ integration: Integration }> = ({ integration }) => (
  <img
    src={platformIcon(integration.identifier)}
    className={clsx(
      'absolute z-10 bottom-0 -end-[5px] min-w-[16px]',
      integration.identifier !== 'youtube' && 'rounded-[4px] min-h-[16px]'
    )}
    width={16}
    height={16}
    alt=""
  />
);

export const PicksSocialsComponent: FC<{ toolTip?: boolean; list?: boolean }> = ({
  toolTip,
  list,
}) => {
  const { locked, existing, addOrRemoveSelectedIntegration, integrations, selectedIntegrations } =
    useLaunchStore(
      useShallow((state) => ({
        integrations: state.integrations,
        selectedIntegrations: state.selectedIntegrations,
        addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
        locked: state.locked,
        existing: state.existing,
      }))
    );

  const available = integrations.filter((f) => {
    if (existing) {
      return selectedIntegrations.some((p) => p.integration.id === f.id);
    }
    return !f.inBetweenSteps && !f.disabled;
  });

  const isSelected = (integration: Integration) =>
    selectedIntegrations.some((p) => p.integration.id === integration.id);

  const toggle = (integration: Integration) => () => {
    if (existing) return;
    addOrRemoveSelectedIntegration(integration, {});
  };

  if (list) {
    return (
      <div className={clsx('flex flex-col gap-[4px]', locked && 'opacity-50 pointer-events-none')}>
        {available.map((integration) => (
          <div
            key={integration.id}
            onClick={toggle(integration)}
            className="flex items-center gap-[12px] py-[8px] cursor-pointer select-none"
          >
            <div className="relative">
              <img src={integration.picture} className="rounded-[8px] w-[40px] h-[40px]" alt="" />
              <PlatformBadge integration={integration} />
            </div>
            <div className="flex-1 min-w-0 truncate text-[14px] font-[600]">{integration.name}</div>
            <Check onChange={toggle(integration)} value={isSelected(integration)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('flex', locked && 'opacity-50 pointer-events-none')}>
      <div className="flex flex-wrap gap-[12px] flex-1">
        {available.map((integration) => (
          <div
            key={integration.id}
            className="flex gap-[8px] items-center"
            {...(toolTip && {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': integration.name,
            })}
          >
            <div
              onClick={toggle(integration)}
              className={clsx(
                'cursor-pointer border-[2px] relative rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500 hover:scale-105 active:scale-95',
                !isSelected(integration) ? 'grayscale border-transparent opacity-60 hover:opacity-100' : 'border-[#622FF6]'
              )}
            >
              <img
                src={integration.picture || '/no-picture.jpg'}
                className={clsx(
                  'rounded-full transition-all w-[42px] h-[42px] min-w-[42px] border-[1.5px]',
                  !isSelected(integration) ? 'border-transparent' : 'border-[#000]'
                )}
                alt={integration.identifier}
              />
              <PlatformBadge integration={integration} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
