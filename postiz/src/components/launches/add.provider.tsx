'use client';

import clsx from 'clsx';
import { FC, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';
import { useDb } from '@/lib/db';
import { platformIcon, ProviderDefinition, providers } from '@/lib/providers';

// Stands in for the OAuth popup of each platform
const ConnectChannel: FC<{ provider: ProviderDefinition; close: () => void }> = ({ provider, close }) => {
  const addIntegration = useDb((s) => s.addIntegration);
  const toaster = useToaster();
  const providerName = provider.name.split('\n')[0];
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'form' | 'connecting' | 'done'>('form');

  const connect = async () => {
    setStep('connecting');
    await new Promise((r) => setTimeout(r, 1400));
    addIntegration(provider.identifier, name || `${providerName} Account`, handle ? (handle.startsWith('@') ? handle : '@' + handle) : '@' + (name || providerName).toLowerCase().replace(/\s+/g, ''));
    setStep('done');
    toaster.show('Channel added', 'success');
    setTimeout(close, 900);
  };

  if (step !== 'form') {
    return (
      <div className="flex flex-col items-center justify-center gap-[20px] py-[40px] min-w-[360px]">
        <div className="relative">
          <img src={platformIcon(provider.identifier)} className={clsx('w-[64px] h-[64px] rounded-full', step === 'connecting' && 'animate-pulse')} alt="" />
          {step === 'connecting' && (
            <div className="absolute -inset-[8px] rounded-full border-[3px] border-[#612BD3] border-t-transparent animate-spin" />
          )}
          {step === 'done' && (
            <div className="absolute -bottom-[4px] -end-[4px] w-[28px] h-[28px] rounded-full bg-green-500 flex items-center justify-center text-white animate-scaleIn">✓</div>
          )}
        </div>
        <div className="text-[18px] font-[600]">{step === 'connecting' ? `Connecting to ${providerName}...` : 'Channel connected!'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px] w-[420px] max-w-full">
      <div className="flex items-center gap-[12px] p-[16px] rounded-[12px] bg-newTableHeader">
        <img src={platformIcon(provider.identifier)} className="w-[40px] h-[40px] rounded-full" alt="" />
        <div className="text-[14px]">
          <div className="font-[600]">Postiz wants to access your {providerName} account</div>
          <div className="text-textItemBlur text-[13px]">This is a demo, no real account is connected.</div>
        </div>
      </div>
      {provider.customFields ? (
        provider.customFields.map((f) => (
          <Input key={f.key} label={f.label} type={f.type} value={fields[f.key] || ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} removeError />
        ))
      ) : null}
      <Input label="Account name" placeholder={`My ${providerName} account`} value={name} onChange={(e) => setName(e.target.value)} removeError autoFocus />
      <Input label="Username" placeholder="@username" value={handle} onChange={(e) => setHandle(e.target.value)} removeError />
      <Button onClick={connect} className="mt-[8px] !h-[44px]">
        Authorize Postiz
      </Button>
    </div>
  );
};

export const AddProviderComponent: FC<{ onPick: (provider: ProviderDefinition) => void }> = ({ onPick }) => (
  <div className="w-full flex flex-col gap-[20px] rounded-[4px] relative">
    <div className="grid grid-cols-5 gap-[10px] justify-items-center justify-center mobile:!grid-cols-3">
      {providers.map((item, index) => (
        <div
          key={item.identifier}
          onClick={() => onPick(item)}
          style={{ animationDelay: `${index * 15}ms` }}
          className="flex-col p-[10px] h-[100px] justify-center mobile:text-[13px] mobile:leading-[1.2] w-full text-[14px] rounded-[8px] bg-newTableHeader text-textColor relative items-center flex gap-[10px] cursor-pointer opacity-0 animate-fadeIn hover:bg-boxHover hover:scale-[1.04] transition-transform border border-transparent hover:border-[#612BD3]/50"
        >
          <div>
            {item.identifier === 'youtube' ? (
              <img src="/icons/platforms/youtube.svg" alt="" />
            ) : (
              <img className={clsx('w-[32px] h-[32px]', item.identifier !== 'gmb' && 'rounded-full')} src={`/icons/platforms/${item.identifier}.png`} alt="" />
            )}
          </div>
          <div className="whitespace-pre-wrap text-center">{item.name}</div>
        </div>
      ))}
    </div>
  </div>
);

export const useAddProvider = () => {
  const modals = useModals();
  return useCallback(() => {
    modals.openModal({
      title: 'Add Channel',
      closeOnClickOutside: true,
      size: 'min(900px, 95vw)',
      children: (closeGrid) => (
        <AddProviderComponent
          onPick={(provider) => {
            closeGrid();
            modals.openModal({
              title: `Connect ${provider.name.split('\n')[0]}`,
              closeOnClickOutside: false,
              children: (close) => <ConnectChannel provider={provider} close={close} />,
            });
          }}
        />
      ),
    });
  }, [modals]);
};

export const AddProviderButton: FC = () => {
  const add = useAddProvider();
  const toaster = useToaster();
  return (
    <div className="flex group-[.sidebar]:block gap-[8px]">
      <button
        className="flex-1 group-[.sidebar]:w-[100%] group-[.sidebar]:flex-none text-btnText bg-btnSimple h-[44px] pt-[12px] pb-[14px] ps-[16px] pe-[20px] justify-center items-center flex rounded-[8px] gap-[8px] transition-all hover:brightness-110 active:scale-95"
        onClick={add}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="min-w-[20px]">
          <path d="M1.66675 10.0417C3.35907 10.2299 4.93698 10.9884 6.14101 12.1924C7.34504 13.3964 8.10353 14.9743 8.29175 16.6667M1.66675 13.4167C2.46749 13.58 3.20253 13.9751 3.7804 14.553C4.35827 15.1309 4.75344 15.8659 4.91675 16.6667M1.66675 16.6667H1.67508M11.6667 17.5H14.3334C15.7335 17.5 16.4336 17.5 16.9684 17.2275C17.4388 16.9878 17.8212 16.6054 18.0609 16.135C18.3334 15.6002 18.3334 14.9001 18.3334 13.5V6.5C18.3334 5.09987 18.3334 4.3998 18.0609 3.86502C17.8212 3.39462 17.4388 3.01217 16.9684 2.77248C16.4336 2.5 15.7335 2.5 14.3334 2.5H5.66675C4.26662 2.5 3.56655 2.5 3.03177 2.77248C2.56137 3.01217 2.17892 3.39462 1.93923 3.86502C1.66675 4.3998 1.66675 5.09987 1.66675 6.5V6.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-start text-[14px] group-[.sidebar]:hidden">Add Channel</div>
      </button>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/launches?invite=demo`);
          } catch {}
          toaster.show('Invite link copied to clipboard', 'success');
        }}
        data-tooltip-id="tooltip"
        data-tooltip-content="Send Invite Link to a customer to add channel"
        className="group-[.sidebar]:hidden min-h-[44px] min-w-[44px] bg-btnSimple justify-center items-center flex rounded-[8px] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M6.6668 8.66599C6.9531 9.04875 7.31837 9.36545 7.73783 9.59462C8.1573 9.82379 8.62114 9.96007 9.0979 9.99422C9.57466 10.0284 10.0532 9.95957 10.501 9.79251C10.9489 9.62546 11.3555 9.36404 11.6935 9.02599L13.6935 7.02599C14.3007 6.39732 14.6366 5.55531 14.629 4.68132C14.6215 3.80733 14.2709 2.97129 13.6529 2.35326C13.0348 1.73524 12.1988 1.38467 11.3248 1.37708C10.4508 1.36948 9.60881 1.70547 8.98013 2.31266L7.83347 3.45266M9.33347 7.33266C9.04716 6.94991 8.68189 6.6332 8.26243 6.40403C7.84297 6.17486 7.37913 6.03858 6.90237 6.00444C6.4256 5.97029 5.94708 6.03908 5.49924 6.20614C5.0514 6.3732 4.64472 6.63461 4.3068 6.97266L2.3068 8.97266C1.69961 9.60133 1.36363 10.4433 1.37122 11.3173C1.37881 12.1913 1.72938 13.0274 2.3474 13.6454C2.96543 14.2634 3.80147 14.614 4.67546 14.6216C5.54945 14.6292 6.39146 14.2932 7.02013 13.686L8.16013 12.546" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
};
