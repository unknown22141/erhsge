'use client';

import clsx from 'clsx';
import { FC, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GlobalIcon } from '@/components/ui/icons';
import { decisionModal } from '@/components/ui/modal';
import { useHasScroll } from '@/lib/hooks';
import { platformIcon } from '@/lib/providers';
import { useLaunchStore } from './store';

const IsGlobal: FC<{ id: string }> = ({ id }) => {
  const isInternal = useLaunchStore((state) => !!state.internal.find((p) => p.integration.id === id));
  if (!isInternal) return null;
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="No longer in global mode"
      className="w-[8px] h-[8px] bg-[#FC69FF] -top-[1px] -end-[3px] absolute rounded-full"
    />
  );
};

export const SelectCurrent: FC = () => {
  const { selectedIntegrations, current, setCurrent, locked, existing, addOrRemoveSelectedIntegration } =
    useLaunchStore(
      useShallow((state) => ({
        selectedIntegrations: state.selectedIntegrations,
        addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
        current: state.current,
        setCurrent: state.setCurrent,
        locked: state.locked,
        existing: state.existing,
      }))
    );

  const contentRef = useRef<HTMLDivElement>(null);
  const hasScroll = useHasScroll(contentRef);

  return (
    <>
      <div className="select-none left-0 absolute w-full z-[100] px-[20px] mobile:static mobile:px-0">
        <div
          ref={contentRef}
          className={clsx(
            'flex gap-[6px] mobile:gap-[4px] w-full overflow-x-auto scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
            locked && 'opacity-50 pointer-events-none'
          )}
        >
          {!existing && (
            <div
              onClick={() => setCurrent('global')}
              data-tooltip-id="tooltip"
              data-tooltip-content="Global edit"
              className={clsx(
                'cursor-pointer flex gap-[8px] rounded-[8px] w-[40px] h-[40px] min-w-[40px] justify-center items-center bg-newBgLineColor transition-all',
                current !== 'global'
                  ? 'text-[#A3A3A3] hover:text-newTextColor'
                  : 'border border-[#FC69FF] text-[#FC69FF]'
              )}
            >
              <GlobalIcon />
            </div>
          )}
          {selectedIntegrations.map(({ integration }) => (
            <div
              onClick={() => setCurrent(integration.id)}
              key={integration.id}
              className={clsx(
                'border cursor-pointer relative flex gap-[8px] w-[40px] h-[40px] min-w-[40px] rounded-[8px] items-center bg-newBgLineColor justify-center animate-scaleIn',
                current === integration.id ? 'border-[#FC69FF] text-[#FC69FF]' : 'border-transparent'
              )}
            >
              {!existing && (
                <>
                  <div
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (
                        await decisionModal({
                          title: 'Remove Social Account',
                          description: 'Are you sure you want to remove this social from scheduling?',
                        })
                      ) {
                        addOrRemoveSelectedIntegration(integration);
                      }
                    }}
                    className="absolute justify-center items-center flex w-[8px] h-[8px] -top-[1px] -start-[3px] bg-red-500 rounded-full text-white text-[8px] z-[20]"
                  >
                    X
                  </div>
                  <IsGlobal id={integration.id} />
                </>
              )}
              <div
                data-tooltip-id="tooltip"
                data-tooltip-content={integration.name}
                className="relative w-full h-full rounded-full flex justify-center items-center"
              >
                <img src={integration.picture || '/no-picture.jpg'} className="rounded-full w-[26px] h-[26px]" alt="" />
                <img
                  src={platformIcon(integration.identifier)}
                  className="w-[12px] min-w-[12px] rounded-[3px] absolute z-10 bottom-[6px] end-[6px]"
                  alt=""
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={clsx(hasScroll ? 'h-[55px]' : 'h-[40px]', 'mobile:hidden')} />
    </>
  );
};
