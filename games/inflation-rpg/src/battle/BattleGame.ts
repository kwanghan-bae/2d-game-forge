import Phaser from 'phaser';
import { BattleScene } from './BattleScene';

interface BattleGameOptions {
  parent: string;
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number) => void;
}

export function createBattleGame(opts: BattleGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: 360,
    height: 400,
    backgroundColor: '#0a1218',
    scene: BattleScene,
    callbacks: {
      postBoot: (game) => {
        game.scene.start('BattleScene', {
          onLevelUp: opts.onLevelUp,
          onBattleEnd: opts.onBattleEnd,
          onBossKill: opts.onBossKill,
        });
      },
    },
  });
}
