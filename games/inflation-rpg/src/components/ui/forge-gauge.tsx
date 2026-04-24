import * as React from 'react';
import type { ForgeGaugeProps, ForgeStatToken } from '@forge/core';
import { cn } from '@/lib/utils';

const STAT_COLORS: Record<ForgeStatToken, string> = {
  hp: 'var(--forge-stat-hp)',
  atk: 'var(--forge-stat-atk)',
  def: 'var(--forge-stat-def)',
  agi: 'var(--forge-stat-agi)',
  luc: 'var(--forge-stat-luc)',
  bp: 'var(--forge-stat-bp)',
};

/**
 * Forge-UI 스텟 게이지 바.
 * value: 0-1 사이 비율. stat 토큰에 따라 채움 색상 자동 선택.
 */
export const ForgeGauge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeGaugeProps
>(({ className, value, stat = 'hp', label, ...props }, ref) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = STAT_COLORS[stat];
  return (
    <div
      ref={ref}
      className={cn('forge-gauge', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      {...props}
    >
      <div
        style={{ width: `${pct}%`, background: color, height: '100%' }}
      />
    </div>
  );
});
ForgeGauge.displayName = 'ForgeGauge';
