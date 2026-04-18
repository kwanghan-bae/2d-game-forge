import Phaser from 'phaser';
import { buildPhaserConfig } from './game/main';
import { EventBus } from './game/EventBus';
import { GameState } from './game/GameState';
import { InflationManager } from './game/utils/InflationManager';
import { ReincarnationManager } from './game/utils/ReincarnationManager';
import { exposeTestHooks } from '@forge/core';

export interface StartGameConfig {
  /** DOM id of the container div into which Phaser will render. */
  parent: string;
  /** Base URL prepended to every asset load (Phaser `load.setBaseURL`). */
  assetsBasePath: string;
  /** If true, attach GameState / managers / scene refs to window for E2E. */
  exposeTestHooks: boolean;
}

export function StartGame(config: StartGameConfig): Phaser.Game {
  const phaserConfig = buildPhaserConfig({ parent: config.parent });
  const game = new Phaser.Game(phaserConfig);

  // Preloader reads the base URL off the game registry before loading.
  game.registry.set('assetsBasePath', config.assetsBasePath);

  if (config.exposeTestHooks) {
    exposeTestHooks({
      gameState: GameState.getInstance(),
      inflationManager: InflationManager.getInstance(),
      ReincarnationManager,
      phaserGame: game,
    });
    EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
      exposeTestHooks({ currentScene: scene });
    });
  }

  return game;
}
