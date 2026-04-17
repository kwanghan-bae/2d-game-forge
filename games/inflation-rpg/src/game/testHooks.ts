import type { GameState } from './GameState';
import type { InflationManager } from './utils/InflationManager';
import type { ReincarnationManager } from './utils/ReincarnationManager';
import type Phaser from 'phaser';

export interface TestHookSlots {
  gameState?: GameState;
  inflationManager?: InflationManager;
  ReincarnationManager?: typeof ReincarnationManager;
  phaserGame?: Phaser.Game;
  currentScene?: Phaser.Scene;
  E2E_AUTO_BATTLE?: boolean;
}

/**
 * Attach testing affordances to window only when the caller opts in.
 * In production builds (Capacitor release), the caller must pass
 * exposeTestHooks: false so nothing leaks.
 */
export function exposeTestHooks(slots: TestHookSlots): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined) w[key] = value;
  }
}
