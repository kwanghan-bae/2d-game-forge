import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import { useCycleStoreV2 } from './overworld/cycleSliceV2';
import { mountGame } from './mountGame';

/** Explicit V3 entry point. It keeps the legacy store and save key untouched. */
export function StartLegacyGame(config: StartGameConfig): ForgeGameInstance {
  return mountGame(config, App, {
    legacyStore: useGameStore,
    cycleStore: useCycleStoreV2,
  });
}
