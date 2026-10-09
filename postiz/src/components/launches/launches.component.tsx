'use client';

import clsx from 'clsx';
import { FC, useMemo, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useDb } from '@/lib/db';
import { useLocalState } from '@/lib/hooks';
import { platformIcon } from '@/lib/providers';
import { Customer, Integration } from '@/lib/types';
import { Input } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useMode } from '@/components/layout/mode';
import { openComposer } from '@/components/new-launch/open.composer';
import { AddProviderButton, reconnectChannel } from './add.provider';
import { CalendarProvider } from './calendar.context';
import { Calendar } from './calendar';
import { ChannelMenu } from './channel.menu';
import { Filters } from './filters';

export const SVGLine = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="5" height="52" viewBox="0 0 5 52" fill="none" className="rtl:rotate-180">
    <path d="M0.5 4C0.5 1.79086 2.29086 0 4.5 0V52C2.29086 52 0.5 50.2091 0.5 48V4Z" fill="url(#paint0_linear_1930_1119)" />
    <path d="M0.5 4C0.5 1.79086 2.29086 0 4.5 0V52C2.29086 52 0.5 50.2091 0.5 48V4Z" fill="url(#paint1_radial_1930_1119)" />
    <defs>
      <linearGradient id="paint0_linear_1930_1119" x1="-7" y1="-27.7727" x2="-2.58929" y2="-28.6843" gradientUnits="userSpaceOnUse">
        <stop stopColor="#662FDA" />
        <stop offset="1" stopColor="#5720CB" />
      </linearGradient>
      <radialGradient id="paint1_radial_1930_1119" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1.19333 7.45342) rotate(21.2064) scale(16.1503 188.627)">
        <stop stopColor="#8C66FF" />
        <stop offset="1" stopColor="#8C66FF" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const OpenClose: FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg width="11" height="6" viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={clsx('transition-all', isOpen ? 'rotate-180' : 'rotate-90')}>
    <path d="M21.9245 11.3823C21.8489 11.5651 21.7207 11.7213 21.5563 11.8312C21.3919 11.9411 21.1986 11.9998 21.0008 11.9998H1.00079C0.802892 12 0.609399 11.9414 0.444805 11.8315C0.280212 11.7217 0.151917 11.5654 0.076165 11.3826C0.000412494 11.1998 -0.0193921 10.9986 0.0192583 10.8045C0.0579087 10.6104 0.153276 10.4322 0.293288 10.2923L10.2933 0.29231C10.3862 0.199333 10.4964 0.125575 10.6178 0.0752506C10.7392 0.0249263 10.8694 -0.000976562 11.0008 -0.000976562C11.1322 -0.000976562 11.2623 0.0249263 11.3837 0.0752506C11.5051 0.125575 11.6154 0.199333 11.7083 0.29231L21.7083 10.2923C21.8481 10.4322 21.9433 10.6105 21.9818 10.8045C22.0202 10.9985 22.0003 11.1996 21.9245 11.3823Z" fill="currentColor" />
  </svg>
);

const EditGroupNameModal: FC<{ customer: Customer; close: () => void }> = ({ customer, close }) => {
  const rename = useDb((s) => s.renameCustomer);
  const toaster = useToaster();
  const [name, setName] = useState(customer.name);
  return (
    <div className="min-w-[360px]">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Button
        className="mt-[16px]"
        disabled={!name}
        onClick={() => {
          rename(customer.id, name);
          toaster.show('Group Updated', 'success');
          close();
        }}
      >
        Save
      </Button>
    </div>
  );
};

const MenuComponent: FC<{ integration: Integration; collapsed: boolean }> = ({ integration, collapsed }) => {
  const [, drag, dragPreview] = useDrag(() => ({ type: 'menu', item: { id: integration.id } }), [integration.id]);
  const doReconnect = () => reconnectChannel(integration);
  return (
    <div
      ref={dragPreview as any}
      {...(integration.refreshNeeded && {
        onClick: doReconnect,
        'data-tooltip-id': 'tooltip',
        'data-tooltip-content': 'Channel disconnected, click to reconnect.',
      })}
      {...(collapsed ? { 'data-tooltip-id': 'tooltip', 'data-tooltip-content': integration.name } : {})}
      className={clsx(
        'flex gap-[12px] items-center bg-newBgColorInner hover:bg-boxHover group/profile transition-all rounded-e-[8px] animate-normalFadeIn',
        integration.refreshNeeded && 'cursor-pointer'
      )}
    >
      <div className={clsx('relative gap-[6px] flex justify-center items-center', integration.disabled && 'opacity-50')}>
        <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
          <SVGLine />
        </div>
        {integration.refreshNeeded && (
          <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
            <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-[5px] top-[5px] absolute z-[200] text-[10px] flex justify-center items-center text-white animate-pulse">!</div>
            <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
          </div>
        )}
        <img src={integration.picture || '/no-picture.jpg'} className="rounded-[8px] min-w-[36px] min-h-[36px] w-[36px] h-[36px] object-cover" alt={integration.identifier} />
        <img
          src={platformIcon(integration.identifier)}
          className={clsx('absolute z-10 bottom-[5px] -end-[5px]', integration.identifier !== 'youtube' && 'rounded-[8px] border border-fifth')}
          alt=""
          width={integration.identifier === 'youtube' ? 20 : 18.41}
          height={18.41}
        />
      </div>
      <div
        ref={drag as any}
        className={clsx('group-[.sidebar]:hidden flex-1 whitespace-nowrap text-ellipsis overflow-hidden cursor-move', integration.disabled && 'opacity-50')}
      >
        {integration.name}
      </div>
      <div className="group-[.sidebar]:hidden">
        <ChannelMenu integration={integration} onReconnect={doReconnect} />
      </div>
    </div>
  );
};

const MenuGroupComponent: FC<{
  group: { id: string; name: string; values: Integration[] };
  collapsed: boolean;
}> = ({ group, collapsed }) => {
  const modals = useModals();
  const move = useDb((s) => s.moveIntegrationToCustomer);
  const update = useDb((s) => s.updateIntegration);
  const [isOpen, setIsOpen] = useLocalState(`${group.name}_isOpen`, true);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'menu',
      drop: (item: { id: string }) => {
        if (group.id) move(item.id, group.id);
        else update(item.id, { customer: undefined });
      },
      collect: (monitor) => ({ isOver: !!monitor.isOver() }),
    }),
    [group.id]
  );
  return (
    <div className="gap-[16px] flex flex-col relative" ref={drop as any}>
      {isOver && (
        <div className="absolute start-0 top-0 w-full h-full pointer-events-none animate-fadeIn">
          <div className="bg-white/10 border border-dashed border-[#612BD3] w-full h-full p-[8px] box-content rounded-md -ms-[8px] -mt-[8px]" />
        </div>
      )}
      {!!group.name && (
        <div className="flex items-center gap-[5px] cursor-pointer group select-none" onClick={() => setIsOpen(!isOpen)}>
          <OpenClose isOpen={isOpen} />
          <div className="line-clamp-1" {...(collapsed ? { 'data-tooltip-id': 'tooltip', 'data-tooltip-content': group.name } : {})}>
            {group.name}
          </div>
          {!collapsed && (
            <div
              className="hidden group-hover:block hover:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                modals.openModal({
                  title: 'Edit group name',
                  children: (close) => <EditGroupNameModal customer={{ id: group.id, name: group.name }} close={close} />,
                });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      )}
      <div className={clsx('gap-[12px] flex flex-col relative', !isOpen && 'hidden')}>
        {group.values.map((integration) => (
          <MenuComponent key={integration.id} integration={integration} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
};

export const NewPost = () => (
  <button
    onClick={() => openComposer({})}
    className="text-white flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none transition-all hover:brightness-110 active:scale-95 shadow-[0_8px_24px_-8px_rgba(97,43,211,0.8)]"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none" className="min-w-[21px] min-h-[20px]">
      <path d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div className="flex-1 text-start text-[14px] group-[.sidebar]:hidden">Create Post</div>
  </button>
);

export const LaunchesComponent = () => {
  const integrations = useDb((s) => s.integrations);
  const mode = useMode((s) => s.mode);
  const [collapseMenu, setCollapseMenu] = useLocalState('collapseMenu', '0');
  const [channelsOpen, setChannelsOpen] = useState(false);

  const sortedIntegrations = useMemo(
    () =>
      integrations.slice().sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.identifier.localeCompare(b.identifier)),
    [integrations]
  );

  const menuIntegrations = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; values: Integration[] }>();
    sortedIntegrations.forEach((integration) => {
      const id = integration.customer?.id || '';
      const group = groups.get(id) || { id, name: integration.customer?.name || '', values: [] };
      group.values.push(integration);
      groups.set(id, group);
    });
    return [...groups.values()].sort((a, b) => (a.name ? 1 : 0) - (b.name ? 1 : 0) || a.name.localeCompare(b.name));
  }, [sortedIntegrations]);

  const collapsed = collapseMenu === '1' && !channelsOpen;

  return (
    <CalendarProvider>
      {channelsOpen && <div className="hidden mobile:block fixed inset-0 bg-newBackdrop opacity-60 z-[149] animate-fadeIn" onClick={() => setChannelsOpen(false)} />}
      <div
        className={clsx(
          'flex relative flex-col transition-[width] duration-300',
          collapsed ? 'group sidebar w-[100px]' : 'w-[260px]',
          channelsOpen
            ? 'mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-[150] mobile:w-full mobile:max-h-[80vh] mobile:rounded-t-[16px] mobile:overflow-hidden mobile:animate-slideUp'
            : 'mobile:hidden'
        )}
      >
        <div className="bg-newBgColorInner p-[20px] flex flex-col gap-[15px] transition-all absolute start-0 top-0 w-full h-full mobile:static mobile:h-auto mobile:max-h-[80vh] mobile:pb-[80px] overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
          <div className="flex items-center">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">Channels</h2>
            <div onClick={() => setChannelsOpen(false)} className="hidden mobile:flex text-btnText bg-btnSimple rounded-[6px] w-[28px] h-[28px] items-center justify-center cursor-pointer select-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto mobile:hidden text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none transition-transform duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="7" height="13" viewBox="0 0 7 13" fill="none">
                <path d="M6 11.5L1 6.5L6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-[8px] group-[.sidebar]:mx-auto group-[.sidebar]:w-[44px]">
            <AddProviderButton />
            <div className="flex gap-[8px] group-[.sidebar]:flex-col mobile:hidden">{sortedIntegrations.length > 0 && <NewPost />}</div>
          </div>
          <div className="gap-[32px] flex flex-col select-none flex-1">
            {sortedIntegrations.length === 0 && !collapsed && (
              <div className="flex-1 max-h-[500px] justify-center items-center flex animate-fadeIn">
                <div className="flex flex-col gap-[12px] text-center">
                  <img src={mode === 'dark' ? '/no-channels.svg' : '/no-channels-colors.svg'} alt="No channels" className="mx-auto min-w-[100%]" />
                  <div className="font-[600] text-[20px]">No channels yet</div>
                  <div className="text-[14px]">Connect your social media accounts to start scheduling</div>
                </div>
              </div>
            )}
            {menuIntegrations.map((menu) => (
              <MenuGroupComponent key={menu.id || 'none'} group={menu} collapsed={collapsed} />
            ))}
          </div>
          
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 min-w-0 flex-col flex p-[20px] mobile:p-[12px] gap-[12px] mobile:min-h-[600px]">
        <div className="hidden mobile:flex gap-[8px]">
          <div onClick={() => setChannelsOpen(true)} className="cursor-pointer h-[44px] px-[12px] bg-btnSimple text-btnText rounded-[8px] flex items-center gap-[8px] select-none">
            <div className="flex -space-x-[10px] rtl:space-x-reverse">
              {sortedIntegrations.slice(0, 3).map((integration) => (
                <img key={integration.id} src={integration.picture} className="rounded-full border-2 border-btnSimple w-[24px] h-[24px]" alt="" />
              ))}
            </div>
            <div className="text-[14px] font-[500]">{sortedIntegrations.length || 'Channels'}</div>
          </div>
          {sortedIntegrations.length > 0 ? (
            <NewPost />
          ) : (
            <div className="flex-1">
              <AddProviderButton />
            </div>
          )}
        </div>
        <Filters />
        <div className="flex-1 flex min-h-[400px]">
          <Calendar />
        </div>
      </div>
    </CalendarProvider>
  );
};
