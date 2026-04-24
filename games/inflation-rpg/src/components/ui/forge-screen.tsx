import * as React from 'react';
import type { ForgeScreenProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * 앱 최상위 래퍼. min-height: 100dvh + env(safe-area-inset-*) padding.
 * iOS notch / Dynamic Island / Android gesture bar 를 자동 회피.
 */
export const ForgeScreen = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeScreenProps
>(({ className, safeArea = true, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-screen', !safeArea && 'forge-screen--no-safe-area', className)}
    {...props}
  >
    {children}
  </div>
));
ForgeScreen.displayName = 'ForgeScreen';
