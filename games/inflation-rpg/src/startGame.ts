import type { ForgeGameInstance } from '@forge/core';
import type { StartGameConfig } from './types';
import { mountGame } from './mountGame';
import { V4App } from './v4/V4App';

export type { StartGameConfig };

/** V4 product entry point. Legacy remains available from the explicit subpath. */
export function StartGame(config: StartGameConfig): ForgeGameInstance {
  return mountGame(config, V4App);
}
