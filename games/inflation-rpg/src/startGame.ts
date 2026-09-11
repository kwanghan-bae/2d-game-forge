import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { mountGame } from './mountGame';
import { VillageApp } from './village/VillageApp';

export type { StartGameConfig };

/** Current product entry point. Legacy remains available from the explicit subpath. */
export function StartGame(config: StartGameConfig): ForgeGameInstance {
  return mountGame(config, VillageApp);
}
