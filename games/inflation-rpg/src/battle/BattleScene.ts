import Phaser from 'phaser';
import { resolveForgeTheme } from '@forge/core';
import { useGameStore } from '../store/gameStore';
import { calcFinalStat, calcDamageReduction, calcCritChance } from '../systems/stats';
import { applyExpGain } from '../systems/experience';
import { calcBaseAbilityMult } from '../systems/progression';
import { getEquippedItemsList } from '../systems/equipment';
import { getCharacterById } from '../data/characters';
import { pickMonster } from '../data/monsters';
import { getBossesForArea } from '../data/bosses';
import { MAP_AREAS } from '../data/maps';
import { isRunOver, onDefeat } from '../systems/bp';

interface BattleCallbacks {
  onLevelUp: (newLevel: number) => void;
  onBattleEnd: (victory: boolean) => void;
  onBossKill: (bossId: string, bpReward: number) => void;
}

export class BattleScene extends Phaser.Scene {
  private callbacks!: BattleCallbacks;
  private combatTimer?: Phaser.Time.TimerEvent;
  private enemyHP = 0;
  private enemyMaxHP = 0;
  private enemyName = '';
  private isBoss = false;
  private bossId?: string;
  private hpBarBg?: Phaser.GameObjects.Rectangle;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private enemyText?: Phaser.GameObjects.Text;
  private logText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleCallbacks) {
    this.callbacks = data;
  }

  create() {
    const theme = resolveForgeTheme();
    const { run } = useGameStore.getState();
    const area = run.currentAreaId;
    const bosses = getBossesForArea(area, run.isHardMode);
    const hasBoss = bosses.length > 0;

    const bg = this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
    void bg;

    if (hasBoss && Math.random() < 0.25) {
      const boss = bosses[0]!;
      this.isBoss = true;
      this.bossId = boss.id;
      this.enemyName = `👹 ${boss.nameKR}`;
      this.enemyMaxHP = Math.floor(run.level * 50 * boss.hpMult);
    } else {
      this.isBoss = false;
      const currentArea = MAP_AREAS.find(a => a.id === area);
      const monster = pickMonster(run.level, currentArea?.regionId);
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = Math.floor(run.level * 20 * monster.hpMult);
    }
    this.enemyHP = this.enemyMaxHP;

    this.enemyText = this.add.text(16, 16, this.enemyName, { fontSize: '16px', color: '#e05050' });
    this.hpBarBg = this.add.rectangle(16, 44, 320, 10, theme.panel).setOrigin(0);
    this.hpBarFill = this.add.rectangle(16, 44, 320, 10, theme.hp).setOrigin(0);
    this.logText = this.add.text(16, 64, '', { fontSize: '12px', color: '#8aaa88', wordWrap: { width: 320 } });

    void this.enemyText; void this.hpBarBg;
    this.combatTimer = this.time.addEvent({ delay: 600, callback: this.doRound, callbackScope: this, loop: true });
  }

  private doRound() {
    const state = useGameStore.getState();
    const { run, meta } = state;
    const char = getCharacterById(run.characterId);
    if (!char) return;

    const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
    const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
    const charLv = meta.characterLevels[run.characterId] ?? 0;
    const charLevelMult = 1 + charLv * 0.1;

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult);
    const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility, charLevelMult);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult);

    const crit = Math.random() < calcCritChance(playerAGI, playerLUC);
    const combo = Math.random() < 0.05 + playerAGI * 0.0005;
    const hits = combo ? 3 : 1;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      totalDmg += Math.floor(playerATK * (crit ? 2.4 : 1) * (0.9 + Math.random() * 0.2));
    }

    this.enemyHP = Math.max(0, this.enemyHP - totalDmg);

    const logParts: string[] = [];
    if (combo) logParts.push(`${hits}연타! `);
    if (crit) logParts.push('치명타! ');
    logParts.push(`${totalDmg.toLocaleString()} 데미지`);
    this.logText?.setText(logParts.join(''));

    const ratio = this.enemyHP / this.enemyMaxHP;
    this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);

    if (this.enemyHP <= 0) {
      this.combatTimer?.remove();

      if (this.isBoss && this.bossId) {
        this.callbacks.onBossKill(this.bossId, 5);
      }

      const expGain = Math.floor(run.level * 10);
      const goldGain = Math.floor(run.level * 5 * (run.isHardMode ? 5 : 1));
      const { newLevel, newExp, spGained } = applyExpGain(run.exp, run.level, expGain, run.isHardMode);

      useGameStore.getState().gainLevels(newLevel - run.level, spGained);
      useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun + goldGain, exp: newExp, monstersDefeated: s.run.monstersDefeated + 1 } }));

      if (spGained > 0) {
        this.callbacks.onLevelUp(newLevel);
      } else {
        this.callbacks.onBattleEnd(true);
      }
      return;
    }

    const enemyATK = Math.floor(run.level * 8 * (this.isBoss ? 2 : 1));
    const reduction = calcDamageReduction(playerDEF);
    const dmgTaken = Math.floor(enemyATK * (1 - reduction));
    const currentHPEstimate = playerHP - (run.monstersDefeated * dmgTaken * 0.1);

    if (currentHPEstimate <= 0) {
      this.combatTimer?.remove();
      const newBP = onDefeat(run.bp, run.isHardMode);
      useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP } }));
      if (isRunOver(newBP)) {
        useGameStore.getState().endRun();
      } else {
        this.callbacks.onBattleEnd(false);
      }
    }
  }
}
