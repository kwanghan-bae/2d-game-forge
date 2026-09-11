import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { mountGame } from './mountGame';
import { VillageApp } from './village/VillageApp';

export type { StartGameConfig };

/** The single product entry point exposed to the portal and native shell. */
export function StartGame(config: StartGameConfig): ForgeGameInstance {
  return mountGame(config, VillageApp);
}
