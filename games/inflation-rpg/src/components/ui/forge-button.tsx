// packages/registry/src/ui/forge-button.tsx
import * as React from 'react';
import type { ForgeButtonProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 기본 버튼.
 * variant: primary (골드) / secondary (다크) / disabled (둘 중 하나 + 비활성)
 * 최소 터치 타겟 44px 준수.
 */
export const ForgeButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & ForgeButtonProps
>(({ className, variant = 'primary', disabled, ...props }, ref) => {
  const resolvedVariant = disabled ? 'disabled' : variant;
  return (
    <button
      ref={ref}
      disabled={disabled || variant === 'disabled'}
      className={cn('forge-btn', resolvedVariant, className)}
      {...props}
    />
  );
});
ForgeButton.displayName = 'ForgeButton';
