import Phaser from 'phaser';
import { BattleScene } from './BattleScene';

interface BattleGameOptions {
  parent: string;
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number, bossType: 'mini' | 'major' | 'sub' | 'final') => void;
}

export function createBattleGame(opts: BattleGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    backgroundColor: '#0a1218',
    scene: BattleScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 360,
      height: 400,
    },
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
