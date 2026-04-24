import * as React from 'react';
import type { ForgeInventoryGridProps } from '@forge/core';
import { cn } from '@/lib/utils';

/**
 * Forge-UI 인벤토리 그리드.
 * columns: 2 / 3 / 4 (기본 2). CSS grid-template-columns 자동 설정.
 */
export const ForgeInventoryGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ForgeInventoryGridProps
>(({ className, columns = 2, style, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('forge-inventory-grid', className)}
    style={{
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
));
ForgeInventoryGrid.displayName = 'ForgeInventoryGrid';
