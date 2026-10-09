'use client';

import clsx from 'clsx';
import { FC, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { openModal, useModals } from '@/components/ui/modal';
import { toast, useToaster } from '@/components/ui/toaster';
import { useDb } from '@/lib/db';
import { getProvider, platformIcon, ProviderDefinition, providers } from '@/lib/providers';
import { Integration } from '@/lib/types';

// the address the platform sends the user back to after "Sign in"
export const redirectUriFor = (provider: ProviderDefinition, publicUrl: string) => {
  const base = (publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const uri = `${base}/api/oauth/${provider.identifier}/callback`;
  // like Postiz, an http address goes through redirectmeto.com for the platforms that require https
  return provider.httpsRedirect && !uri.startsWith('https://') ? `https://redirectmeto.com/${uri}` : uri;
};

// Connects an account with its keys (checked against the platform) or with the platform sign in page
const ConnectChannel: FC<{ provider: ProviderDefinition; existing?: Integration; close: () => void }> = ({ provider, existing, close }) => {
  const addIntegration = useDb((s) => s.addIntegration);
  const publicUrl = useDb((s) => s.publicUrl);
  const toaster = useToaster();
  const providerName = provider.name.split('\n')[0];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((provider.connect || []).map((f) => [f.key, existing?.credentials?.[f.key] || f.default || '']))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const redirectUri = redirectUriFor(provider, publicUrl);

  const connect = async () => {
    setLoading(true);
    setError('');
    try {
      if (provider.oauth) {
        const res = await fetch('/api/oauth/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: provider.identifier, credentials: values, redirectUri, returnTo: window.location.origin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        window.location.href = data.url;
        return;
      }
      const res = await fetch('/api/integrations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: provider.identifier, credentials: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not connect the channel');
      addIntegration({
        identifier: provider.identifier,
        name: data.name,
        display: data.display,
        picture: data.picture,
        internalId: data.internalId,
        credentials: data.credentials || values,
        dynamicOptions: data.options,
      });
      setDone(true);
      toaster.show(existing ? 'Channel reconnected' : 'Channel added', 'success');
      setTimeout(close, 800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-[20px] py-[40px] min-w-[360px]">
        <div className="relative">
          <img src={platformIcon(provider.identifier)} className="w-[64px] h-[64px] rounded-full" alt="" />
          <div className="absolute -bottom-[4px] -end-[4px] w-[28px] h-[28px] rounded-full bg-green-500 flex items-center justify-center text-white animate-scaleIn">✓</div>
        </div>
        <div className="text-[18px] font-[600]">Channel connected!</div>
      </div>
    );
  }

  const filled = (provider.connect || []).every((f) => f.optional || values[f.key]?.trim());

  return (
    <div className="flex flex-col gap-[12px] w-[520px] max-w-full">
      <div className="flex gap-[12px] p-[16px] rounded-[12px] bg-newTableHeader">
        <img src={platformIcon(provider.identifier)} className="w-[40px] h-[40px] rounded-full" alt="" />
        <div className="text-[14px] flex flex-col gap-[4px] min-w-0">
          <div className="font-[600]">How to connect {providerName}</div>
          <ol className="list-decimal ps-[18px] text-textItemBlur text-[13px] flex flex-col gap-[4px]">
            {provider.help?.map((h) =>
              h.includes('{redirectUri}') ? (
                <li key={h}>
                  {h.split('{redirectUri}')[0]}
                  <span
                    className="text-newTextColor bg-newBgColorInner border border-newTableBorder rounded-[6px] px-[6px] py-[2px] font-mono text-[12px] break-all cursor-pointer hover:border-[#612BD3]"
                    data-tooltip-id="tooltip"
                    data-tooltip-content="Click to copy"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(redirectUri);
                      } catch {}
                      toaster.show('Redirect URI copied', 'success');
                    }}
                  >
                    {redirectUri}
                  </span>
                  {h.split('{redirectUri}')[1]}
                </li>
              ) : (
                <li key={h}>{h}</li>
              )
            )}
          </ol>
        </div>
      </div>
      {provider.connect?.map((f) =>
        f.type === 'select' ? (
          <Select key={f.key} label={f.label} hideErrors value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            key={f.key}
            label={f.label}
            type={f.type}
            placeholder={f.placeholder}
            value={values[f.key] || ''}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            removeError
          />
        )
      )}
      {error && <div className="text-red-400 text-[13px] bg-red-500/10 border border-red-500/30 rounded-[8px] p-[10px] break-words whitespace-pre-wrap">{error}</div>}
      <div className="text-[12px] text-textItemBlur">Your keys are stored on this computer only and sent only to {providerName}.</div>
      <Button onClick={connect} loading={loading} disabled={!filled} className="mt-[4px] !h-[44px]">
        {provider.oauth ? `Sign in with ${providerName}` : `${existing ? 'Reconnect' : 'Connect'} ${providerName}`}
      </Button>
    </div>
  );
};

export const openConnect = (provider: ProviderDefinition, existing?: Integration) =>
  openModal({
    title: `${existing ? 'Reconnect' : 'Connect'} ${provider.name.split('\n')[0]}`,
    closeOnClickOutside: false,
    children: (close) => <ConnectChannel provider={provider} existing={existing} close={close} />,
  });

export const reconnectChannel = (integration: Integration) => openConnect(getProvider(integration.identifier), integration);

// Finishes a "Sign in with ..." when the platform sends the user back
export const OAuthReturn = () => {
  const addIntegration = useDb((s) => s.addIntegration);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('oauth');
    const error = params.get('oauth_error');
    if (!state && !error) return;
    window.history.replaceState(null, '', window.location.pathname);
    const fail = (message: string) =>
      openModal({
        title: 'Could not connect the channel',
        closeOnClickOutside: true,
        children: <div className="text-[14px] text-textItemBlur max-w-[520px] break-words">{message}</div>,
      });
    if (error) {
      fail(error);
      return;
    }
    (async () => {
      const res = await fetch(`/api/oauth/result?state=${state}`);
      const data = await res.json();
      if (!res.ok) return fail(data.message);
      addIntegration({
        identifier: data.identifier,
        name: data.name,
        display: data.display,
        picture: data.picture,
        internalId: data.internalId,
        credentials: data.credentials,
        dynamicOptions: data.options,
      });
      toast('Channel added', 'success');
    })();
  }, [addIntegration]);
  return null;
};

export const AddProviderComponent: FC<{ onPick: (provider: ProviderDefinition) => void }> = ({ onPick }) => {
  const sorted = [...providers.filter((p) => p.real), ...providers.filter((p) => !p.real)];
  return (
    <div className="w-full flex flex-col gap-[20px] rounded-[4px] relative">
      <div className="grid grid-cols-5 gap-[10px] justify-items-center justify-center mobile:!grid-cols-3">
        {sorted.map((item, index) => (
          <div
            key={item.identifier}
            onClick={() => item.real && onPick(item)}
            style={{ animationDelay: `${index * 15}ms` }}
            {...(!item.real && {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': 'Not available in this app yet',
            })}
            className={clsx(
              'flex-col p-[10px] h-[100px] justify-center mobile:text-[13px] mobile:leading-[1.2] w-full text-[14px] rounded-[8px] bg-newTableHeader text-textColor relative items-center flex gap-[10px] opacity-0 animate-fadeIn border border-transparent',
              item.real ? 'cursor-pointer hover:bg-boxHover hover:scale-[1.04] transition-transform hover:border-[#612BD3]/50' : 'cursor-not-allowed grayscale'
            )}
          >
            <div className={clsx(!item.real && 'opacity-40')}>
              {item.identifier === 'youtube' ? (
                <img src="/icons/platforms/youtube.svg" alt="" />
              ) : (
                <img className={clsx('w-[32px] h-[32px]', item.identifier !== 'gmb' && 'rounded-full')} src={`/icons/platforms/${item.identifier}.png`} alt="" />
              )}
            </div>
            <div className={clsx('whitespace-pre-wrap text-center', !item.real && 'opacity-40')}>{item.name}</div>
            {item.real && <div className="absolute top-[6px] end-[6px] w-[8px] h-[8px] rounded-full bg-green-500" />}
          </div>
        ))}
      </div>
      <div className="text-[13px] text-textItemBlur flex items-center gap-[6px]">
        <div className="w-[8px] h-[8px] rounded-full bg-green-500" /> Connects and publishes for real with your own account and keys.
      </div>
    </div>
  );
};

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
            openConnect(provider);
          }}
        />
      ),
    });
  }, [modals]);
};

export const AddProviderButton: FC = () => {
  const add = useAddProvider();
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
    </div>
  );
};
