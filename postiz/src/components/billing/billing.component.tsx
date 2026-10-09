'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { useDb } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { decisionModal } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';

// Plans and prices from Postiz (subscriptions/pricing.ts)
const plans = [
  { id: 'STANDARD', name: 'Standard', month: 29, year: 278, channels: 5, features: ['5 channels', 'Unlimited posts', 'AI auto-complete', 'Import content from channels', '2 webhooks'] },
  { id: 'TEAM', name: 'Team', month: 39, year: 374, channels: 10, features: ['10 channels', 'Unlimited posts', 'Unlimited team members', 'AI auto-complete', '10 webhooks', 'Public API'] },
  { id: 'PRO', name: 'Pro', month: 49, year: 470, channels: 30, features: ['30 channels', 'Unlimited posts', 'Unlimited team members', 'AI images & videos', '30 webhooks', 'Auto post from RSS'], popular: true },
  { id: 'ULTIMATE', name: 'Ultimate', month: 99, year: 950, channels: 100, features: ['100 channels', 'Unlimited posts', 'Unlimited team members', 'AI images & videos', 'Unlimited webhooks', 'Priority support'] },
];

export const BillingComponent = () => {
  const user = useDb((s) => s.user);
  const updateUser = useDb((s) => s.updateUser);
  const integrations = useDb((s) => s.integrations);
  const toaster = useToaster();
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  return (
    <div className="bg-newBgColorInner flex-1 flex flex-col p-[20px] mobile:p-[12px] gap-[24px] overflow-y-auto">
      <div className="flex flex-col items-center gap-[12px] text-center animate-normalFadeDown">
        <div className="text-[32px] mobile:text-[24px] font-[600]">Choose the plan that fits you</div>
        <div className="text-textItemBlur">
          You are on the <span className="text-[#FC69FF] font-[600]">{plans.find((p) => p.id === user.tier)?.name}</span> plan, using {integrations.length} of{' '}
          {plans.find((p) => p.id === user.tier)?.channels} channels
        </div>
        <div className="flex p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] relative">
          {(['MONTHLY', 'YEARLY'] as const).map((p) => (
            <div
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx('px-[20px] py-[6px] rounded-[6px] cursor-pointer transition-colors', period === p && 'text-textItemFocused bg-boxFocused')}
            >
              {p === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              {p === 'YEARLY' && <span className="ms-[6px] text-[11px] text-[#32D583]">-20%</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 tablet:grid-cols-2 mobile:!grid-cols-1 gap-[16px] max-w-[1300px] w-full mx-auto">
        {plans.map((plan, index) => {
          const current = plan.id === user.tier;
          const price = period === 'MONTHLY' ? plan.month : plan.year;
          return (
            <div
              key={plan.id}
              style={{ animationDelay: `${index * 80}ms` }}
              className={clsx(
                'relative flex flex-col gap-[20px] p-[24px] rounded-[16px] border bg-newTableHeader opacity-0 animate-normalFadeDown transition-all duration-300 hover:-translate-y-[4px] hover:shadow-menu',
                plan.popular ? 'border-[#612BD3] shadow-[0_0_40px_-12px_rgba(97,43,211,0.8)]' : 'border-newTableBorder'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-[12px] start-[50%] -translate-x-[50%] rtl:translate-x-[50%] bg-[#612BD3] text-white text-[12px] font-[600] px-[12px] py-[4px] rounded-full">
                  Most popular
                </div>
              )}
              <div className="text-[20px] font-[600]">{plan.name}</div>
              <div className="flex items-end gap-[6px]">
                <div key={period} className="text-[44px] font-[700] leading-none animate-normalFadeIn">${price}</div>
                <div className="text-textItemBlur mb-[6px]">/{period === 'MONTHLY' ? 'month' : 'year'}</div>
              </div>
              <div className="flex flex-col gap-[10px] flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-[10px] text-[14px]">
                    <div className="w-[18px] h-[18px] rounded-full bg-[#612BD3]/20 text-[#8C66FF] flex items-center justify-center text-[11px]">✓</div>
                    {f}
                  </div>
                ))}
              </div>
              <Button
                secondary={current}
                disabled={current}
                className="!h-[44px]"
                onClick={async () => {
                  if (
                    await decisionModal({
                      title: `Switch to ${plan.name}?`,
                      description: `You will be charged $${price} per ${period === 'MONTHLY' ? 'month' : 'year'}. (Demo, nothing is charged)`,
                      approveLabel: 'Yes, switch',
                      cancelLabel: 'Cancel',
                    })
                  ) {
                    updateUser({ tier: plan.id, totalChannels: plan.channels });
                    toaster.show(`You are now on the ${plan.name} plan`, 'success');
                  }
                }}
              >
                {current ? 'Current Plan' : 'Choose plan'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
