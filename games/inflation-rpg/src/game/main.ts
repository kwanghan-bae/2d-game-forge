import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { WorldMap } from './scenes/WorldMap';
import { BattleScene } from './scenes/BattleScene';
import { InventoryScene } from './scenes/InventoryScene';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';

import { AUTO } from 'phaser';
import Phaser from 'phaser';

export interface PhaserConfigOptions {
  parent: string;
}

export function buildPhaserConfig(opts: PhaserConfigOptions): Phaser.Types.Core.GameConfig {
  return {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: opts.parent,
    backgroundColor: '#028af8',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [
      Boot,
      Preloader,
      MainMenu,
      ClassSelectScene,
      WorldMap,
      BattleScene,
      InventoryScene,
      MainGame,
      GameOver,
    ],
  };
}
