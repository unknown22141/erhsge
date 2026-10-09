'use client';

import { FC, useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useMode } from '@/components/layout/mode';

export interface TotalList {
  date: string;
  total: number;
}

const colorSchemes = {
  purple: { start: 'rgba(97, 43, 211, 0.8)', end: 'rgba(97, 43, 211, 0.1)', border: 'rgb(97, 43, 211)' },
  green: { start: 'rgba(50, 213, 131, 0.8)', end: 'rgba(50, 213, 131, 0.1)', border: 'rgb(50, 213, 131)' },
  blue: { start: 'rgba(29, 155, 240, 0.8)', end: 'rgba(29, 155, 240, 0.1)', border: 'rgb(29, 155, 240)' },
};

const mergeDataPoints = (data: TotalList[], numPoints: number): TotalList[] => {
  const size = Math.ceil(data.length / numPoints);
  const out: TotalList[] = [];
  for (let i = 0; i < data.length; i += size) {
    const row = data.slice(i, i + size);
    out.push({ date: `${row[0].date} - ${row[row.length - 1].date}`, total: row.reduce((a, c) => a + c.total, 0) });
  }
  return out;
};

// Ported from Postiz analytics/chart-social.tsx
export const ChartSocial: FC<{ data: TotalList[]; color?: keyof typeof colorSchemes }> = ({ data, color = 'purple' }) => {
  const mode = useMode((s) => s.mode);
  const ref = useRef<HTMLCanvasElement>(null);
  const list = useMemo(() => {
    const merged = data.length < 7 ? data : mergeDataPoints(data, 7);
    return merged.length === 1 ? [merged[0], merged[0]] : merged;
  }, [data]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const colors = colorSchemes[color];
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);
    const chart = new Chart(canvas, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: { duration: 750, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { left: 0, right: 0, top: 4, bottom: 0 } },
        scales: { y: { beginAtZero: true, display: false }, x: { display: false } },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: mode === 'dark' ? '#1e1d1d' : '#fff',
            titleColor: mode === 'dark' ? '#fff' : '#000',
            bodyColor: mode === 'dark' ? '#9c9c9c' : '#777',
            borderColor: mode === 'dark' ? '#2b2b2b' : '#e7e9eb',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: { size: 12, weight: 'normal' },
            bodyFont: { size: 14, weight: 'bold' },
          },
        },
      },
      data: {
        labels: list.map((row) => row.date),
        datasets: [
          {
            borderColor: colors.border,
            borderWidth: 2,
            label: 'Total',
            backgroundColor: gradient,
            fill: true,
            data: list.map((row) => row.total),
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: mode === 'dark' ? '#1e1d1d' : '#fff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
    });
    return () => chart.destroy();
  }, [list, color, mode]);

  return <canvas className="w-full h-full" ref={ref} />;
};
