'use client';

import clsx from 'clsx';
import { FC, useState } from 'react';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { Check } from '@/components/ui/form';
import { FilterIcon } from '@/components/ui/icons';
import { BottomSheet } from '@/components/ui/bottom.sheet';
import { Display, getDateRange, ListStateFilter, useCalendar, useCalendarFilters } from './calendar.context';

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12" fill="none">
    <path d="M6.5 11L1.5 6L6.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12" fill="none">
    <path d="M1.5 11L6.5 6L1.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SelectCustomer: FC<{ list?: boolean }> = ({ list }) => {
  const customers = useDb((s) => s.customers);
  const { customer, setFilters, setSelectedChannels } = useCalendarFilters();
  if (!customers.length) return null;
  return (
    <select
      value={customer}
      onChange={(e) => {
        setFilters({ customer: e.target.value });
        setSelectedChannels(null);
      }}
      className={clsx(
        'h-[42px] bg-newBgColorInner px-[12px] outline-none border-newTableBorder border rounded-[8px] text-[14px] font-[500] cursor-pointer',
        list && 'w-full mb-[12px]'
      )}
    >
      <option value="">Selected Customer</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          Customer: {c.name}
        </option>
      ))}
    </select>
  );
};

export const SelectChannels: FC<{ list?: boolean }> = ({ list }) => {
  const { integrations, selectedChannels, setSelectedChannels } = useCalendar();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  if (integrations.length < 2) return null;
  const isSelected = (id: string) => !selectedChannels || selectedChannels.includes(id);
  const toggle = (id: string) => {
    const current = selectedChannels || integrations.map((p) => p.id);
    const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    setSelectedChannels(next.length === integrations.length ? null : next);
  };

  const content = (
    <div className="flex flex-col gap-[4px]">
      <div
        onClick={() => setSelectedChannels(selectedChannels ? null : [])}
        className="flex items-center gap-[10px] px-[8px] py-[6px] rounded-[8px] hover:bg-boxHover cursor-pointer text-[14px]"
      >
        <Check value={!selectedChannels} onChange={() => setSelectedChannels(selectedChannels ? null : [])} />
        <div className="font-[600]">All channels</div>
      </div>
      {integrations.map((integration) => (
        <div
          key={integration.id}
          onClick={() => toggle(integration.id)}
          className="flex items-center gap-[10px] px-[8px] py-[6px] rounded-[8px] hover:bg-boxHover cursor-pointer text-[14px]"
        >
          <Check value={isSelected(integration.id)} onChange={() => toggle(integration.id)} />
          <div className="relative">
            <img src={integration.picture} className="w-[24px] h-[24px] rounded-full" alt="" />
            <img src={`/icons/platforms/${integration.identifier}.png`} className="w-[12px] h-[12px] rounded-[3px] absolute -bottom-[2px] -end-[2px]" alt="" />
          </div>
          <div className="truncate">{integration.name}</div>
        </div>
      ))}
    </div>
  );

  if (list) return content;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        className={clsx(
          'h-[42px] px-[12px] border rounded-[8px] flex items-center gap-[8px] cursor-pointer text-[14px] font-[500] transition-colors',
          selectedChannels ? 'border-[#612BD3] text-[#8C66FF]' : 'border-newTableBorder'
        )}
      >
        <FilterIcon size={18} />
        <span>{selectedChannels ? `${selectedChannels.length} channels` : 'All channels'}</span>
      </div>
      {open && (
        <div className="absolute top-[100%] mt-[8px] end-0 z-[300] w-[260px] max-h-[400px] overflow-y-auto bg-newBgColorInner border border-newTableBorder rounded-[12px] shadow-menu p-[8px] animate-normalFadeDown opacity-0">
          {content}
        </div>
      )}
    </div>
  );
};

export const Filters = () => {
  const calendar = useCalendar();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isListView = calendar.display === 'list';

  const setView = (display: Display) => () => {
    calendar.setFilters({ display, ...getDateRange(display) });
  };

  const move = (direction: 1 | -1) => () => {
    const unit = calendar.display === 'day' ? 'day' : calendar.display === 'month' ? 'month' : 'week';
    const next = dayjs(calendar.startDate).add(direction, unit);
    calendar.setFilters(getDateRange(calendar.display, next.format('YYYY-MM-DD')));
  };

  const displayText = (short?: boolean) => {
    const startDate = dayjs(calendar.startDate);
    const endDate = dayjs(calendar.endDate);
    switch (calendar.display) {
      case 'day':
        return startDate.format(short ? 'ddd (L)' : 'dddd (L)');
      case 'week':
        return `${startDate.format('L')} - ${endDate.format('L')}`;
      case 'month':
        return startDate.format('MMMM YYYY');
      default:
        return '';
    }
  };

  const listStateOptions: { value: ListStateFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <div className="text-textColor flex flex-row flex-wrap gap-[8px] items-center select-none">
      {!isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px] mobile:order-3 mobile:basis-full mobile:min-w-0 mobile:gap-[8px]">
          <div className="border h-[42px] border-newTableBorder bg-newTableBorder gap-[1px] flex items-center rounded-[8px] overflow-hidden mobile:flex-1 mobile:min-w-0">
            <div
              onClick={move(-1)}
              className="cursor-pointer text-textColor rtl:rotate-180 px-[9px] mobile:px-0 mobile:w-[36px] bg-newBgColorInner h-full flex items-center justify-center hover:text-textItemFocused hover:bg-boxFocused transition-colors"
            >
              <ArrowLeft />
            </div>
            <div className="min-w-[200px] mobile:min-w-0 mobile:flex-1 text-center bg-newBgColorInner h-full flex items-center justify-center">
              <div key={calendar.startDate} className="py-[3px] px-[9px] rounded-[5px] transition-all text-[14px] animate-normalFadeIn">
                <span className="mobile:hidden">{displayText()}</span>
                <span className="hidden mobile:inline">{displayText(true)}</span>
              </div>
            </div>
            <div
              onClick={move(1)}
              className="cursor-pointer text-textColor rtl:rotate-180 px-[9px] mobile:px-0 mobile:w-[36px] bg-newBgColorInner h-full flex items-center justify-center hover:text-textItemFocused hover:bg-boxFocused transition-colors"
            >
              <ArrowRight />
            </div>
          </div>
          <div className="flex-1 mobile:flex-none text-[14px] font-[500]">
            <div className="text-center flex h-[42px]">
              <div
                onClick={() => calendar.setFilters(getDateRange(calendar.display))}
                className="hover:text-textItemFocused hover:bg-boxFocused py-[3px] px-[9px] flex justify-center items-center rounded-[8px] transition-all cursor-pointer text-[14px] bg-newBgColorInner border border-newTableBorder"
              >
                Today
              </div>
            </div>
          </div>
        </div>
      )}
      {isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px] mobile:flex-wrap mobile:order-3 mobile:basis-full mobile:min-w-0 mobile:gap-[8px]">
          <div className="border h-[42px] border-newTableBorder bg-newTableBorder gap-[1px] flex items-center rounded-[8px] overflow-hidden">
            <div
              onClick={() => calendar.listPage > 0 && calendar.setListPage(calendar.listPage - 1)}
              className={clsx(
                'text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center',
                calendar.listPage > 0 ? 'cursor-pointer hover:text-textItemFocused hover:bg-boxFocused' : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ArrowLeft />
            </div>
            <div className="min-w-[200px] text-center bg-newBgColorInner h-full flex items-center justify-center text-[14px]">
              Page {calendar.listPage + 1} of {Math.max(1, calendar.listTotalPages)}
            </div>
            <div
              onClick={() => calendar.listPage < calendar.listTotalPages - 1 && calendar.setListPage(calendar.listPage + 1)}
              className={clsx(
                'text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center',
                calendar.listPage < calendar.listTotalPages - 1 ? 'cursor-pointer hover:text-textItemFocused hover:bg-boxFocused' : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ArrowRight />
            </div>
          </div>
          <div className="flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] mobile:w-full mobile:overflow-x-auto">
            {listStateOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => calendar.setListState(option.value)}
                className={clsx(
                  'pt-[6px] pb-[5px] cursor-pointer min-w-[80px] px-[12px] text-center rounded-[6px] transition-colors mobile:flex-1 mobile:min-w-fit',
                  calendar.listState === option.value && 'text-textItemFocused bg-boxFocused'
                )}
              >
                {option.label}
              </div>
            ))}
          </div>
          <div className="flex-1 mobile:hidden" />
        </div>
      )}
      <div className="contents mobile:hidden">
        <SelectCustomer />
        <SelectChannels />
      </div>
      {calendar.integrations.length > 1 && (
        <div
          onClick={() => setFiltersOpen(true)}
          className={clsx(
            'hidden mobile:flex mobile:order-2 relative w-[42px] h-[42px] rounded-[8px] border justify-center items-center cursor-pointer',
            calendar.selectedChannels ? 'border-[#612BD3] text-[#612BD3]' : 'border-newTableBorder'
          )}
        >
          <FilterIcon />
        </div>
      )}
      <div
        className={clsx(
          'flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] mobile:order-1 mobile:flex-1 mobile:overflow-x-auto relative',
          isListView && 'hidden mobile:flex'
        )}
      >
        {(['day', 'week', 'month'] as const).map((display) => (
          <div
            key={display}
            className={clsx(
              'pt-[6px] pb-[5px] cursor-pointer w-[74px] mobile:w-auto mobile:flex-1 mobile:min-w-fit mobile:px-[6px] text-center rounded-[6px] transition-colors duration-200',
              calendar.display === display && 'text-textItemFocused bg-boxFocused'
            )}
            onClick={setView(display)}
          >
            {display.charAt(0).toUpperCase() + display.slice(1)}
          </div>
        ))}
        <div
          className={clsx(
            'hidden mobile:block pt-[6px] pb-[5px] cursor-pointer mobile:flex-1 mobile:min-w-fit mobile:px-[6px] text-center rounded-[6px]',
            isListView && 'text-textItemFocused bg-boxFocused'
          )}
          onClick={setView('list')}
        >
          List
        </div>
      </div>
      <div className="flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] mobile:hidden">
        <div
          onClick={() => isListView && calendar.setFilters({ display: 'week', ...getDateRange('week') })}
          data-tooltip-id="tooltip"
          data-tooltip-content="Calendar view"
          className={clsx('pt-[6px] pb-[5px] cursor-pointer flex justify-center items-center w-[34px] text-center rounded-[6px] transition-colors', !isListView && 'text-textItemFocused bg-boxFocused')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="19" viewBox="0 0 17 19" fill="none">
            <path d="M15.75 7.41667H0.75M11.5833 0.75V4.08333M4.91667 0.75V4.08333M4.75 17.4167H11.75C13.1501 17.4167 13.8502 17.4167 14.385 17.1442C14.8554 16.9045 15.2378 16.522 15.4775 16.0516C15.75 15.5169 15.75 14.8168 15.75 13.4167V6.41667C15.75 5.01654 15.75 4.31647 15.4775 3.78169C15.2378 3.31129 14.8554 2.92883 14.385 2.68915C13.8502 2.41667 13.1501 2.41667 11.75 2.41667H4.75C3.34987 2.41667 2.6498 2.41667 2.11502 2.68915C1.64462 2.92883 1.26217 3.31129 1.02248 3.78169C0.75 4.31647 0.75 5.01654 0.75 6.41667V13.4167C0.75 14.8168 0.75 15.5169 1.02248 16.0516C1.26217 16.522 1.64462 16.9045 2.11502 17.1442C2.6498 17.4167 3.34987 17.4167 4.75 17.4167Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          onClick={setView('list')}
          data-tooltip-id="tooltip"
          data-tooltip-content="List view"
          className={clsx('pt-[6px] pb-[5px] flex justify-center items-center cursor-pointer w-[34px] text-center rounded-[6px] transition-colors', isListView && 'text-textItemFocused bg-boxFocused')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17.5 10L7.5 10M17.5 5.00002L7.5 5.00002M17.5 15L7.5 15M4.16667 10C4.16667 10.4603 3.79357 10.8334 3.33333 10.8334C2.8731 10.8334 2.5 10.4603 2.5 10C2.5 9.53978 2.8731 9.16669 3.33333 9.16669C3.79357 9.16669 4.16667 9.53978 4.16667 10ZM4.16667 5.00002C4.16667 5.46026 3.79357 5.83335 3.33333 5.83335C2.8731 5.83335 2.5 5.46026 2.5 5.00002C2.5 4.53978 2.8731 4.16669 3.33333 4.16669C3.79357 4.16669 4.16667 4.53978 4.16667 5.00002ZM4.16667 15C4.16667 15.4603 3.79357 15.8334 3.33333 15.8334C2.8731 15.8334 2.5 15.4603 2.5 15C2.5 14.5398 2.8731 14.1667 3.33333 14.1667C3.79357 14.1667 4.16667 14.5398 4.16667 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {filtersOpen && (
        <BottomSheet title="Select Channels" onClose={() => setFiltersOpen(false)} button={{ label: 'Done', onClick: () => setFiltersOpen(false) }}>
          <SelectCustomer list />
          <SelectChannels list />
        </BottomSheet>
      )}
    </div>
  );
};
