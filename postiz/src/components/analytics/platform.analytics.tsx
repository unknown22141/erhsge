'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { FC, useMemo, useState } from 'react';
import dayjs from '@/lib/dayjs';
import { useDb } from '@/lib/db';
import { useLocalState } from '@/lib/hooks';
import { getProvider, platformIcon } from '@/lib/providers';
import { Integration, Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { LoadingComponent } from '@/components/ui/loading';
import { useToaster } from '@/components/ui/toaster';
import { SVGLine } from '@/components/launches/launches.component';
import { ChartSocial, TotalList } from './chart.social';

interface AnalyticsDataItem {
  label: string;
  data: TotalList[];
  percentageChange?: number;
}

// counts of your own posts per day, for one channel
const buildAnalytics = (integration: Integration, days: number, posts: Post[]): AnalyticsDataItem[] => {
  const mine = posts.filter((p) => p.integrationId === integration.id);
  const range = Array.from({ length: days }, (_, i) => dayjs().subtract(days - 1 - i, 'day'));
  const series = (label: string, filter: (p: Post) => boolean, future = false) => {
    const dates = future ? range.map((d) => d.add(days - 1, 'day')) : range;
    const data = dates.map((d) => ({
      date: d.format('MMM D'),
      total: mine.filter((p) => filter(p) && dayjs(p.publishDate).isSame(d, 'day')).length,
    }));
    const previous = mine.filter(
      (p) =>
        filter(p) &&
        dayjs(p.publishDate).isBefore(range[0], 'day') &&
        dayjs(p.publishDate).isAfter(range[0].subtract(days + 1, 'day'), 'day')
    ).length;
    const current = data.reduce((a, c) => a + c.total, 0);
    return {
      label,
      data,
      percentageChange: future || !previous ? undefined : Math.round(((current - previous) / previous) * 1000) / 10,
    };
  };
  return [
    series('Published posts', (p) => p.state === 'PUBLISHED'),
    series('Failed posts', (p) => p.state === 'ERROR'),
    series(`Scheduled (next ${days} days)`, (p) => p.state === 'QUEUE', true),
  ];
};

const TrendIndicator: FC<{ value: number }> = ({ value }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-[4px] text-[13px] font-medium ${isPositive ? 'text-[#32d583]' : 'text-[#f97066]'}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isPositive ? '' : 'rotate-180'}>
        <path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor" />
      </svg>
      <span>{Math.abs(value)}%</span>
    </div>
  );
};

const AnalyticsCard: FC<{ item: AnalyticsDataItem; index: number }> = ({ item, index }) => {
  const color = (['purple', 'green', 'blue'] as const)[index % 3];
  const total = item.data.reduce((a, c) => a + c.total, 0);
  return (
    <div className="group relative opacity-0 animate-normalFadeDown" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex flex-col h-full bg-newTableHeader border border-newTableBorder rounded-[12px] overflow-hidden transition-all duration-200 hover:border-[#612bd3]/50 hover:-translate-y-[2px] hover:shadow-menu">
        <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[8px]">
          <div className="flex items-center gap-[10px]">
            <div className={clsx('w-[8px] h-[8px] rounded-full', color === 'purple' && 'bg-[#612bd3]', color === 'green' && 'bg-[#32d583]', color === 'blue' && 'bg-[#1d9bf0]')} />
            <span className="text-[15px] font-medium text-newTableText">{item.label}</span>
          </div>
          {item.percentageChange !== undefined && <TrendIndicator value={item.percentageChange} />}
        </div>
        <div className="flex-1 px-[12px] py-[8px]">
          <div className="h-[120px] relative">
            <ChartSocial data={item.data} color={color} />
          </div>
        </div>
        <div className="px-[16px] pb-[14px]">
          <div className="text-[36px] leading-[42px] font-semibold tracking-tight">{total.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export const PlatformAnalytics = () => {
  const integrations = useDb((s) => s.integrations);
  const posts = useDb((s) => s.posts);
  const router = useRouter();
  const toaster = useToaster();
  const [collapseMenu, setCollapseMenu] = useLocalState('collapseMenu', '0');
  const [current, setCurrent] = useState(0);
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(false);
  const sorted = useMemo(() => integrations.filter((p) => !p.disabled), [integrations]);
  const currentIntegration = sorted[current] || sorted[0];
  const data = useMemo(() => (currentIntegration ? buildAnalytics(currentIntegration, days, posts) : []), [currentIntegration, days, posts]);

  const reload = (fn: () => void) => {
    setRefresh(true);
    fn();
    setTimeout(() => setRefresh(false), 450);
  };

  if (!sorted.length) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-col gap-[15px] transition-all flex-1 justify-center items-center text-center animate-fadeIn">
        <img src="/peoplemarketplace.svg" alt="" />
        <div className="text-[48px] mobile:text-[28px]">
          Can&apos;t show analytics yet
          <br />
          You have to add Social Media channels
        </div>
        <div className="text-[20px]">Supported: Bluesky, Mastodon, Telegram, Discord</div>
        <Button onClick={() => router.push('/launches')}>Go to the calendar to add channels</Button>
      </div>
    );
  }

  return (
    <>
      <div className={clsx('bg-newBgColorInner p-[20px] mobile:p-[12px] flex flex-col gap-[15px] transition-all mobile:w-full', collapseMenu === '1' ? 'group sidebar w-[100px]' : 'w-[260px]')}>
        <div className="flex gap-[12px] flex-col">
          <div className="flex items-center mobile:hidden">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">Channels</h2>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="7" height="13" viewBox="0 0 7 13" fill="none">
                <path d="M6 11.5L1 6.5L6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="flex gap-[15px] mobile:gap-[12px] flex-col mobile:flex-row mobile:overflow-x-auto mobile:ps-[12px] mobile:py-[6px]">
            {sorted.map((integration, index) => (
              <div
                key={integration.id}
                onClick={() => {
                  if (integration.refreshNeeded) {
                    toaster.show('Please refresh the integration from the calendar', 'warning');
                    return;
                  }
                  reload(() => setCurrent(index));
                }}
                {...(collapseMenu === '1' ? { 'data-tooltip-id': 'tooltip', 'data-tooltip-content': integration.name } : {})}
                className={clsx(
                  'flex gap-[12px] items-center group/profile justify-center hover:bg-boxHover rounded-e-[8px] mobile:shrink-0 transition-opacity duration-300',
                  currentIntegration.id !== integration.id && 'opacity-20 hover:opacity-100 cursor-pointer'
                )}
              >
                <div className={clsx('relative rounded-full flex justify-center items-center gap-[6px]')}>
                  {integration.refreshNeeded && (
                    <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
                      <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 top-[5px] absolute z-[200] text-[10px] flex justify-center items-center text-white">!</div>
                      <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
                    </div>
                  )}
                  <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                    <SVGLine />
                  </div>
                  <img src={integration.picture} className="rounded-[8px] w-[36px] h-[36px]" alt="" />
                  <img src={platformIcon(integration.identifier)} className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth w-[18px]" alt="" />
                </div>
                <div className="flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden mobile:hidden">{integration.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] mobile:p-[12px] gap-[12px] min-w-0">
        <div className="flex-1 flex flex-col gap-[14px]">
          <div className="flex items-center gap-[12px] flex-wrap">
            <div className="flex items-center gap-[10px] me-auto">
              <img src={currentIntegration.picture} className="w-[32px] h-[32px] rounded-full" alt="" />
              <div>
                <div className="font-[600]">{currentIntegration.name}</div>
                <div className="text-[12px] text-textItemBlur">{getProvider(currentIntegration.identifier).name.split('\n')[0]}</div>
              </div>
            </div>
            <div className="w-[200px]">
              <Select hideErrors value={days} onChange={(e) => reload(() => setDays(+e.target.value))}>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
              </Select>
            </div>
          </div>
          <div className="flex-1">
            {refresh ? (
              <div className="flex items-center justify-center py-[48px]">
                <LoadingComponent />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                {data.map((item, index) => (
                  <AnalyticsCard key={currentIntegration.id + item.label + days} item={item} index={index} />
                ))}
              </div>
            )}
          </div>
          <div className="text-[12px] text-textItemBlur">Counted from the posts you scheduled and published with this app.</div>
        </div>
      </div>
    </>
  );
};
