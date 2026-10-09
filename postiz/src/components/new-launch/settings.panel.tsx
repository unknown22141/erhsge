'use client';

import clsx from 'clsx';
import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Check, Input, Select, Textarea } from '@/components/ui/form';
import { getProvider } from '@/lib/providers';
import { useLaunchStore } from './store';

export const ProviderSettings: FC = () => {
  const { current, selected, setSettings, showErrors } = useLaunchStore(
    useShallow((s) => ({
      current: s.current,
      selected: s.selectedIntegrations.find((p) => p.integration.id === s.current),
      setSettings: s.setSettings,
      showErrors: s.showErrors,
    }))
  );
  if (!selected) return null;
  const provider = getProvider(selected.integration.identifier);
  if (!provider.settings?.length) {
    return <div className="p-[20px] text-textItemBlur">This channel has no extra settings.</div>;
  }
  return (
    <div className="flex flex-col gap-[4px] p-[20px] animate-normalFadeIn" key={current}>
      {provider.settings.map((field) => {
        const value = selected.settings[field.key];
        const error = showErrors && field.required && !value ? `${field.label} is required` : undefined;
        switch (field.type) {
          case 'select':
            return (
              <Select
                key={field.key}
                label={field.label}
                value={value || ''}
                error={error}
                onChange={(e) => setSettings(selected.integration.id, { [field.key]: e.target.value })}
              >
                <option value="">--Select--</option>
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
          case 'checkbox':
            return (
              <div key={field.key} className="flex items-center gap-[8px] py-[8px] cursor-pointer" onClick={() => setSettings(selected.integration.id, { [field.key]: !value })}>
                <Check value={!!value} onChange={(v) => setSettings(selected.integration.id, { [field.key]: v })} />
                <div className="text-[14px]">{field.label}</div>
              </div>
            );
          case 'textarea':
            return (
              <Textarea key={field.key} label={field.label} value={value || ''} onChange={(e) => setSettings(selected.integration.id, { [field.key]: e.target.value })} />
            );
          default:
            return (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={value || ''}
                error={error}
                className={clsx(error && '!border-red-400')}
                onChange={(e) => setSettings(selected.integration.id, { [field.key]: e.target.value })}
              />
            );
        }
      })}
    </div>
  );
};

export const hasSettings = (identifier: string) => !!getProvider(identifier).settings?.length;
