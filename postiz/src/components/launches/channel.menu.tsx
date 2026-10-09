'use client';

import clsx from 'clsx';
import { FC, ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { DelayIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { decisionModal, deleteDialog, useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useDb } from '@/lib/db';
import { useClickOutside } from '@/lib/hooks';
import { Integration } from '@/lib/types';
import { avatar, isUSCitizen } from '@/lib/utils';
import { openComposer } from '@/components/new-launch/open.composer';

const RenameModal: FC<{ integration: Integration; close: () => void }> = ({ integration, close }) => {
  const update = useDb((s) => s.updateIntegration);
  const toaster = useToaster();
  const [name, setName] = useState(integration.name);
  return (
    <div className="min-w-[360px]">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Button
        disabled={!name}
        className="mt-[16px]"
        onClick={() => {
          update(integration.id, { name });
          toaster.show('Channel Renamed', 'success');
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const BotPictureModal: FC<{ integration: Integration; close: () => void }> = ({ integration, close }) => {
  const update = useDb((s) => s.updateIntegration);
  const toaster = useToaster();
  const [picture, setPicture] = useState(integration.picture);
  return (
    <div className="flex flex-col gap-[16px] min-w-[360px]">
      <div className="flex items-center gap-[16px]">
        <img src={picture} className="w-[80px] h-[80px] rounded-full object-cover" alt="" />
        <label className="cursor-pointer h-[40px] px-[16px] rounded-[8px] bg-btnSimple flex items-center">
          Upload a picture
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setPicture(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <button className="text-[13px] underline opacity-70" onClick={() => setPicture(avatar(integration.name))}>
          Reset
        </button>
      </div>
      <Button
        onClick={() => {
          update(integration.id, { picture });
          toaster.show('Picture updated', 'success');
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const GroupModal: FC<{ integration: Integration; close: () => void }> = ({ integration, close }) => {
  const customers = useDb((s) => s.customers);
  const addCustomer = useDb((s) => s.addCustomer);
  const move = useDb((s) => s.moveIntegrationToCustomer);
  const update = useDb((s) => s.updateIntegration);
  const toaster = useToaster();
  const [value, setValue] = useState(integration.customer?.id || '');
  const [newName, setNewName] = useState('');
  return (
    <div className="flex flex-col gap-[8px] min-w-[400px]">
      <Select label="Select customer" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">-- No customer --</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="__new">+ Add a new customer</option>
      </Select>
      {value === '__new' && <Input label="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />}
      <Button
        disabled={value === '__new' && !newName}
        onClick={() => {
          if (value === '__new') {
            const c = addCustomer(newName);
            move(integration.id, c.id);
          } else if (!value) {
            update(integration.id, { customer: undefined });
          } else {
            move(integration.id, value);
          }
          toaster.show('Customer Updated', 'success');
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const TimeTableModal: FC<{ integration: Integration; close: () => void }> = ({ integration, close }) => {
  const update = useDb((s) => s.updateIntegration);
  const toaster = useToaster();
  const [times, setTimes] = useState(integration.time.map((p) => p.time).sort((a, b) => a - b));
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const format = (t: number) => {
    const h = Math.floor(t / 60);
    const m = String(t % 60).padStart(2, '0');
    return isUSCitizen() ? `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}` : `${String(h).padStart(2, '0')}:${m}`;
  };
  return (
    <div className="relative w-[400px] max-w-full mx-auto">
      <div className="bg-newBgColorInner rounded-[12px] p-[20px] border border-newTableBorder">
        <div className="text-[15px] font-semibold mb-[16px] flex items-center gap-[8px]">
          <DelayIcon size={18} className="text-[#612BD3]" />
          Add Time Slot
        </div>
        <div className="flex gap-[12px] items-end">
          <div className="flex-1">
            <Select label="Hour" hideErrors value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Select label="Minutes" hideErrors value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => {
              const t = hour * 60 + minute;
              if (!times.includes(t)) setTimes([...times, t].sort((a, b) => a - b));
            }}
            className="h-[42px] px-[16px] bg-[#612BD3] hover:bg-[#7640e0] transition-colors rounded-[8px] flex items-center gap-[6px] text-white text-[14px] font-medium"
          >
            <PlusIcon size={14} />
            Add
          </button>
        </div>
      </div>
      <div className="mt-[20px]">
        <div className="text-[14px] text-newTextColor/60 mb-[12px]">Scheduled Times ({times.length})</div>
        {times.length === 0 ? (
          <div className="text-center py-[32px] text-newTextColor/40 text-[14px] border border-dashed border-newTableBorder rounded-[12px]">No time slots added yet</div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {times.map((t) => (
              <div key={t} className="group flex items-center justify-between h-[48px] px-[16px] rounded-[8px] bg-newBgColorInner border border-newTableBorder hover:border-[#612BD3]/40 transition-colors animate-normalFadeIn">
                <div className="flex items-center gap-[12px]">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#612BD3]" />
                  <span className="text-[15px] font-medium tabular-nums">{format(t)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTimes(times.filter((x) => x !== t))}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-[8px] hover:bg-red-500/10 rounded-[6px] text-red-400 hover:text-red-500"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Button
        className="mt-[20px] w-full"
        onClick={() => {
          update(integration.id, { time: times.map((time) => ({ time })) });
          toaster.show('Time slots updated', 'success');
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const MenuRow: FC<{ icon: ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <div
    className={clsx('flex gap-[12px] items-center py-[8px] px-[10px] rounded-[6px] hover:bg-boxHover transition-colors cursor-pointer', danger && 'text-red-400')}
    onClick={onClick}
  >
    <div className="w-[18px] flex justify-center">{icon}</div>
    <div className="text-[14px]">{label}</div>
  </div>
);

export const ChannelMenu: FC<{ integration: Integration; onReconnect: () => void }> = ({ integration, onReconnect }) => {
  const [show, setShow] = useState<{ x: number; y: number } | null>(null);
  const ref = useClickOutside<HTMLDivElement>(() => setShow(null));
  const modals = useModals();
  const toaster = useToaster();
  const db = useDb();

  const open = (title: string, Component: FC<{ integration: Integration; close: () => void }>) => () => {
    setShow(null);
    modals.openModal({
      title,
      closeOnClickOutside: true,
      children: (close) => <Component integration={integration} close={close} />,
    });
  };

  const items: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [
    ...(!integration.disabled && !integration.refreshNeeded
      ? [
          {
            icon: <span className="text-green-500">✎</span>,
            label: 'Create a new post',
            onClick: () => {
              setShow(null);
              openComposer({ selectedChannels: [integration.id] });
            },
          },
        ]
      : []),
    {
      icon: '⧉',
      label: 'Copy Channel ID',
      onClick: async () => {
        setShow(null);
        try {
          await navigator.clipboard.writeText(integration.id);
        } catch {}
        toaster.show('Channel ID copied to clipboard', 'success');
      },
    },
    { icon: '↻', label: 'Reconnect channel', onClick: () => { setShow(null); onReconnect(); } },
    { icon: '🖼', label: 'Change Bot Picture', onClick: open('Change Bot Picture', BotPictureModal) },
    { icon: 'Aa', label: 'Rename channel', onClick: open('Rename channel', RenameModal) },
    { icon: '⇄', label: 'Move / add to group', onClick: open('Move / Add to group', GroupModal) },
    { icon: '◷', label: 'Edit Time Slots', onClick: open('Time Table Slots', TimeTableModal) },
    integration.disabled
      ? {
          icon: '●',
          label: 'Enable Channel',
          onClick: () => {
            setShow(null);
            db.updateIntegration(integration.id, { disabled: false });
            toaster.show('Channel Enabled', 'success');
          },
        }
      : {
          icon: '○',
          label: 'Disable Channel',
          onClick: async () => {
            setShow(null);
            if (await decisionModal({ title: 'Disable Channel', description: 'Are you sure you want to disable this channel?' })) {
              db.updateIntegration(integration.id, { disabled: true });
              toaster.show('Channel Disabled', 'success');
            }
          },
        },
    {
      icon: <TrashIcon size={16} />,
      label: 'Delete',
      danger: true,
      onClick: async () => {
        setShow(null);
        if (await deleteDialog('Are you sure you want to delete this channel?', 'Delete Channel')) {
          const hasPosts = db.posts.some((p) => p.integrationId === integration.id && p.state !== 'PUBLISHED');
          if (hasPosts && !(await deleteDialog('There are posts scheduled for this channel. Delete them as well?', 'Yes, delete them'))) {
            return;
          }
          db.deleteIntegration(integration.id);
          toaster.show('Channel Deleted', 'success');
        }
      },
    },
  ];

  return (
    <div
      className="cursor-pointer relative select-none flex"
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const height = items.length * 52 + 24;
        const y = Math.min(rect.bottom + 4, window.innerHeight - height - 12);
        setShow(show ? null : { x: rect.left, y: Math.max(12, y) });
      }}
      ref={ref}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-menuDots group-hover/profile:text-menuDotsHover transition-colors">
        <path d="M13.125 12C13.125 12.2225 13.059 12.44 12.9354 12.625C12.8118 12.81 12.6361 12.9542 12.4305 13.0394C12.225 13.1245 11.9988 13.1468 11.7805 13.1034C11.5623 13.06 11.3618 12.9528 11.2045 12.7955C11.0472 12.6382 10.94 12.4377 10.8966 12.2195C10.8532 12.0012 10.8755 11.775 10.9606 11.5695C11.0458 11.3639 11.19 11.1882 11.375 11.0646C11.56 10.941 11.7775 10.875 12 10.875C12.2984 10.875 12.5845 10.9935 12.7955 11.2045C13.0065 11.4155 13.125 11.7016 13.125 12ZM12 6.75C12.2225 6.75 12.44 6.68402 12.625 6.5604C12.81 6.43679 12.9542 6.26109 13.0394 6.05552C13.1245 5.84995 13.1468 5.62375 13.1034 5.40552C13.06 5.1873 12.9528 4.98684 12.7955 4.82951C12.6382 4.67217 12.4377 4.56503 12.2195 4.52162C12.0012 4.47821 11.775 4.50049 11.5695 4.58564C11.3639 4.67078 11.1882 4.81498 11.0646 4.99998C10.941 5.18499 10.875 5.4025 10.875 5.625C10.875 5.92337 10.9935 6.20952 11.2045 6.4205C11.4155 6.63147 11.7016 6.75 12 6.75ZM12 17.25C11.7775 17.25 11.56 17.316 11.375 17.4396C11.19 17.5632 11.0458 17.7389 10.9606 17.9445C10.8755 18.15 10.8532 18.3762 10.8966 18.5945C10.94 18.8127 11.0472 19.0132 11.2045 19.1705C11.3618 19.3278 11.5623 19.435 11.7805 19.4784C11.9988 19.5218 12.225 19.4995 12.4305 19.4144C12.6361 19.3292 12.8118 19.185 12.9354 19C13.059 18.815 13.125 18.5975 13.125 18.375C13.125 18.0766 13.0065 17.7905 12.7955 17.5795C12.5845 17.3685 12.2984 17.25 12 17.25Z" fill="currentColor" />
      </svg>
      {show &&
        createPortal(
          <div
            // stops the click outside handler, the menu is portaled out of the ref
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ left: show.x, top: show.y }}
            className="fixed p-[12px] bg-newBgColorInner shadow-menu flex flex-col gap-[4px] z-[350] rounded-[8px] border border-tableBorder text-nowrap animate-normalFadeDown opacity-0"
          >
            {items.map((item) => (
              <MenuRow key={item.label} {...item} />
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
