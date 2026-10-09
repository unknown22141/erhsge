'use client';

import clsx from 'clsx';
import dayjs from 'dayjs';
import { FC, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Input } from '@/components/ui/form';
import {
  CalendarIcon,
  DropdownArrowIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  TagIcon,
} from '@/components/ui/icons';
import { deleteDialog, useModals } from '@/components/ui/modal';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { isUSCitizen } from '@/lib/utils';

const TAG_COLORS = ['#612BD3', '#D82D7E', '#32D583', '#1D9BF0', '#FFAC30', '#F97066', '#4F46E5', '#0EA5E9', '#000000', '#8C8C8C'];

const TagModal: FC<{ tag?: { name: string; color: string }; close: () => void; onSave: (name: string) => void }> = ({
  tag,
  close,
  onSave,
}) => {
  const tags = useDb((s) => s.tags);
  const addTag = useDb((s) => s.addTag);
  const editTag = useDb((s) => s.editTag);
  const [name, setName] = useState(tag?.name || '');
  const [color, setColor] = useState(tag?.color || TAG_COLORS[0]);
  const exists = !!tags.find((t) => t.name === name && t.name !== tag?.name);
  return (
    <div className="flex flex-col gap-[16px] min-w-[360px]">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={exists ? 'Tag already exists' : undefined} autoFocus />
      <div className="flex flex-col gap-[8px]">
        <div className="text-[14px]">Color</div>
        <div className="flex gap-[8px] flex-wrap">
          {TAG_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              className={clsx('w-[28px] h-[28px] rounded-full cursor-pointer transition-transform hover:scale-110', color === c && 'ring-2 ring-offset-2 ring-offset-newBgColorInner ring-white')}
              style={{ backgroundColor: c }}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-[28px] h-[28px] rounded-full bg-transparent cursor-pointer" />
        </div>
      </div>
      <div className="flex items-center gap-[8px]">
        <span className="text-[13px]">Preview:</span>
        <span className="text-white px-[8px] rounded-[8px] text-shadow-tags" style={{ backgroundColor: color }}>
          {name || 'Tag'}
        </span>
      </div>
      <Button
        disabled={!name || exists}
        onClick={() => {
          if (tag) editTag(tag.name, { name, color });
          else addTag({ name, color });
          onSave(name);
          close();
        }}
      >
        {tag ? 'Save' : 'Add Tag'}
      </Button>
    </div>
  );
};

export const TagsComponent: FC<{ value: string[]; onChange: (tags: string[]) => void }> = ({ value, onChange }) => {
  const tags = useDb((s) => s.tags);
  const deleteTag = useDb((s) => s.deleteTag);
  const modals = useModals();
  const [isOpen, setIsOpen] = useState(false);
  const [allowClose, setAllowClose] = useState(true);
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (allowClose) setIsOpen(false);
  });
  const selected = value.map((v) => tags.find((t) => t.name === v)).filter(Boolean) as { name: string; color: string }[];

  const openTagModal = (tag?: { name: string; color: string }) => {
    setAllowClose(false);
    modals.openModal({
      title: tag ? 'Edit Tag' : 'Add New Tag',
      onClose: () => setTimeout(() => setAllowClose(true), 300),
      children: (close) => (
        <TagModal
          tag={tag}
          close={() => {
            close();
            setTimeout(() => setAllowClose(true), 300);
          }}
          onSave={(name) => {
            if (tag) {
              onChange(value.map((v) => (v === tag.name ? name : v)));
            } else {
              onChange([...value, name]);
            }
          }}
        />
      ),
    });
  };

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none transition-colors',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10'
      )}
    >
      <div onClick={() => setIsOpen(!isOpen)} className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1 cursor-pointer">
        <TagIcon />
        <div className="flex gap-[4px] items-center">
          {selected.length === 0 ? (
            'Add New Tag'
          ) : (
            <>
              <div className="flex justify-center items-center px-[8px] rounded-[4px]" style={{ backgroundColor: selected[0].color }}>
                <span className="text-shadow-tags text-[#fff]">{selected[0].name}</span>
              </div>
              {selected.length > 1 ? <span>+{selected.length - 1}</span> : null}
            </>
          )}
        </div>
        <DropdownArrowIcon rotated={isOpen} />
      </div>
      {isOpen && (
        <div className="z-[300] absolute start-0 bottom-[100%] w-[260px] bg-newBgColorInner p-[12px] shadow-menu border border-newTableBorder rounded-[12px] -translate-y-[10px] flex flex-col animate-normalFadeIn">
          {tags.map((p) => {
            const checked = value.includes(p.name);
            return (
              <div
                onClick={() => onChange(checked ? value.filter((v) => v !== p.name) : [...value, p.name])}
                key={p.name}
                className="min-h-[40px] py-[8px] px-[20px] -mx-[12px] flex gap-[8px] items-center group cursor-pointer hover:bg-boxHover"
              >
                <Check onChange={() => onChange(checked ? value.filter((v) => v !== p.name) : [...value, p.name])} value={checked} />
                <div className="h-full flex items-center flex-1 break-all">
                  <span className="text-[#fff] px-[8px] rounded-[8px] text-shadow-tags" style={{ backgroundColor: p.color }}>
                    {p.name}
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openTagModal(p);
                  }}
                  className="ms-auto me-[12px] cursor-pointer opacity-60 hover:opacity-100"
                >
                  <PencilIcon size={12} />
                </div>
                {!checked && (
                  <div
                    onClick={async (e) => {
                      e.stopPropagation();
                      setAllowClose(false);
                      if (await deleteDialog(`Are you sure you want to delete the tag "${p.name}"?`)) {
                        deleteTag(p.name);
                      }
                      setTimeout(() => setAllowClose(true), 300);
                    }}
                    className="cursor-pointer text-red-500 text-[14px] font-[600]"
                  >
                    ×
                  </div>
                )}
              </div>
            );
          })}
          <div
            onClick={() => openTagModal()}
            className="cursor-pointer gap-[8px] flex w-full h-[34px] rounded-[8px] mt-[12px] px-[16px] justify-center items-center bg-[#612BD3] text-white transition-transform active:scale-95"
          >
            <PlusIcon />
            <div className="text-[13px] font-[600]">Add New Tag</div>
          </div>
        </div>
      )}
    </div>
  );
};

const repeatOptions = [
  { value: 1, label: 'Day' },
  { value: 2, label: 'Two Days' },
  { value: 3, label: 'Three Days' },
  { value: 4, label: 'Four Days' },
  { value: 5, label: 'Five Days' },
  { value: 6, label: 'Six Days' },
  { value: 7, label: 'Week' },
  { value: 14, label: 'Two Weeks' },
  { value: 30, label: 'Month' },
];

export const RepeatComponent: FC<{ repeat: number | null; onChange: (value: number | null) => void }> = ({ repeat, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const everyLabel = repeatOptions.find((p) => p.value === repeat)?.label;
  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none transition-colors',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10'
      )}
    >
      <div onClick={() => setIsOpen(!isOpen)} className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1 cursor-pointer">
        <RepeatIcon />
        <div className={clsx(repeat && 'text-[#FC69FF]')}>{repeat ? `Repeat Post Every ${everyLabel}` : 'Repeat Post Every...'}</div>
        <DropdownArrowIcon rotated={isOpen} />
      </div>
      {isOpen && (
        <div className="z-[300] absolute start-0 bottom-[100%] w-[240px] bg-newBgColorInner p-[12px] shadow-menu border border-newTableBorder rounded-[12px] -translate-y-[10px] flex flex-col animate-normalFadeIn">
          {[...repeatOptions, { value: 0, label: 'Cancel' }].map((p) => (
            <div
              onClick={() => {
                onChange(p.value || null);
                setIsOpen(false);
              }}
              key={p.label}
              className={clsx('h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor cursor-pointer', repeat === p.value && 'text-[#FC69FF]')}
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Stepper: FC<{ value: string; onUp: () => void; onDown: () => void; onChange: (value: string) => void }> = ({ value, onUp, onDown, onChange }) => (
  <div className="w-[64px] flex flex-col items-center gap-[4px] text-textItemBlur">
    <div onClick={onUp} className="cursor-pointer hover:text-newTextColor">
      <DropdownArrowIcon className="rotate-180" />
    </div>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[52px] rounded-[10px] border border-newColColor focus:border-btnPrimary bg-newBgColorInner text-center text-[14px] text-textColor outline-none"
    />
    <div onClick={onDown} className="cursor-pointer hover:text-newTextColor">
      <DropdownArrowIcon />
    </div>
  </div>
);

export const DatePickerPanel: FC<{ date: dayjs.Dayjs; onChange: (date: dayjs.Dayjs) => void }> = ({ date, onChange }) => {
  const [month, setMonth] = useState(date.startOf('month'));
  const us = isUSCitizen();
  const days = useMemo(() => {
    const start = month.startOf('month');
    const offset = (start.day() + 6) % 7;
    const first = start.subtract(offset, 'day');
    return Array.from({ length: 42 }, (_, i) => first.add(i, 'day'));
  }, [month]);
  const today = dayjs();

  const hour = us ? (date.hour() % 12 === 0 ? 12 : date.hour() % 12) : date.hour();
  const setHour = (h: number) => {
    if (Number.isNaN(h)) return;
    if (us) {
      const pm = date.hour() >= 12;
      const normalized = ((h % 12) + 12) % 12;
      onChange(date.hour(normalized + (pm ? 12 : 0)));
    } else {
      onChange(date.hour(((h % 24) + 24) % 24));
    }
  };

  return (
    <div className="flex flex-col w-[320px]">
      <div className="bg-newSettings rounded-[12px] px-[16px] py-[12px] mb-[16px]">
        <div className="flex items-center gap-[8px] mb-[12px]">
          <div className="flex-1 text-[15px] font-[600]">{month.format('MMMM YYYY')}</div>
          <div onClick={() => setMonth(month.subtract(1, 'month'))} className="w-[32px] h-[32px] flex justify-center items-center cursor-pointer text-textItemBlur hover:text-newTextColor rounded-[6px] hover:bg-boxHover">
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="rtl:rotate-180">
              <path d="M6.5 11L1.5 6L6.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div onClick={() => setMonth(month.add(1, 'month'))} className="w-[32px] h-[32px] flex justify-center items-center cursor-pointer text-textItemBlur hover:text-newTextColor rounded-[6px] hover:bg-boxHover">
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="rtl:rotate-180">
              <path d="M1.5 11L6.5 6L1.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-[2px] text-center text-[12px] text-textItemBlur mb-[4px]">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {days.map((d) => {
            const isSelected = d.isSame(date, 'day');
            const isPast = d.isBefore(today, 'day');
            return (
              <div
                key={d.format('YYYY-MM-DD')}
                onClick={() => !isPast && onChange(date.year(d.year()).month(d.month()).date(d.date()))}
                className={clsx(
                  'h-[34px] flex items-center justify-center rounded-[8px] text-[13px] transition-colors',
                  isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-boxHover',
                  d.month() !== month.month() && 'opacity-40',
                  isSelected && '!bg-[#612BD3] text-white !opacity-100',
                  d.isSame(today, 'day') && !isSelected && 'text-[#FC69FF] font-[700]'
                )}
              >
                {d.date()}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-[16px]">
        <div className="w-[55px] text-[15px] font-[600]">Time</div>
        <div className="flex items-center gap-[8px]">
          <Stepper value={String(hour).padStart(2, '0')} onUp={() => onChange(date.add(1, 'hour'))} onDown={() => onChange(date.subtract(1, 'hour'))} onChange={(v) => setHour(parseInt(v || '0', 10))} />
          <div className="text-[14px] font-[600]">:</div>
          <Stepper
            value={String(date.minute()).padStart(2, '0')}
            onUp={() => onChange(date.add(5, 'minute'))}
            onDown={() => onChange(date.subtract(5, 'minute'))}
            onChange={(v) => {
              const m = parseInt(v || '0', 10);
              if (!Number.isNaN(m)) onChange(date.minute(Math.min(59, Math.max(0, m))));
            }}
          />
          {us && (
            <div className="h-[52px] flex gap-[3px] p-[4px] rounded-[8px] border border-newColColor bg-newBgColorInner">
              {['AM', 'PM'].map((p) => {
                const active = (p === 'PM') === date.hour() >= 12;
                return (
                  <div
                    key={p}
                    onClick={() => !active && onChange(date.add(p === 'PM' ? 12 : -12, 'hour'))}
                    className={clsx('px-[10px] flex items-center rounded-[6px] text-[13px] font-[600] cursor-pointer transition-colors', active ? 'bg-[#612BD3] text-white' : 'text-textItemBlur')}
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DatePicker: FC<{ date: dayjs.Dayjs; onChange: (date: dayjs.Dayjs) => void }> = ({ date, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  return (
    <div
      className={clsx(
        'px-[16px] border rounded-[8px] justify-center flex gap-[8px] items-center relative h-[44px] text-[15px] whitespace-nowrap font-[600] ms-[7px] select-none cursor-pointer transition-colors',
        open ? 'border-[#612BD3]' : 'border-newTextColor/10'
      )}
      onClick={() => setOpen(!open)}
      ref={ref}
    >
      <CalendarIcon />
      <div>{date.format(isUSCitizen() ? 'MM/DD/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm')}</div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-fadeIn absolute bottom-[100%] mb-[16px] start-[50%] -translate-x-[50%] rtl:translate-x-[50%] bg-newBgColorInner border border-newTableBorder shadow-menu text-textColor rounded-[16px] z-[300] p-[16px] flex flex-col cursor-default"
        >
          <DatePickerPanel date={date} onChange={onChange} />
          <Button className="mt-[12px]" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};
