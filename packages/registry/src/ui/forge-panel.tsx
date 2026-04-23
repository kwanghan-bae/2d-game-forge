// packages/registry/src/ui/forge-panel.tsx
import * as React from 'react';
import type { ForgePanelProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 레이아웃 컨테이너.
 * variant: inset (기본, 테두리 + 둥근 10px) / elevated (그림자 강조)
 */
export const ForgePanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgePanelProps
>(({ className, variant = 'inset', children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-panel', variant, className)}
    {...props}
  >
    {children}
  </div>
));
ForgePanel.displayName = 'ForgePanel';
