import Phaser from 'phaser';
import { resolveForgeTheme } from '@forge/core';
import { useGameStore } from '../store/gameStore';
import { calcFinalStat, calcDamageReduction, calcCritChance } from '../systems/stats';
import { applyExpGain } from '../systems/experience';
import { playSfx } from '../systems/sound';
import { calcBaseAbilityMult } from '../systems/progression';
import { getEquippedItemsList } from '../systems/equipment';
import { getCharacterById } from '../data/characters';
import { pickMonsterFromPool } from '../data/monsters';
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo, getBossType } from '../data/floors';
import { getBossById } from '../data/bosses';
import type { BossType } from '../types';
import { getBossDefeatStory } from '../data/stories';
import { isRunOver, onDefeat } from '../systems/bp';
import {
  createSkillState, isSkillReady, fireSkill, computeSkillEffect,
  type SkillState, type SkillEffectResult,
} from './SkillSystem';
import type { ActiveSkill } from '../types';

function pickBossIdByType(
  bossIds: { mini: string; major: string; sub: [string, string, string]; final: string },
  type: BossType,
  floor: number,
): string {
  switch (type) {
    case 'mini':
      return bossIds.mini;
    case 'major':
      return bossIds.major;
    case 'final':
      return bossIds.final;
    case 'sub': {
      // floor 15→sub[0], 20→sub[1], 25→sub[2]. 심층 (>30, every 5) 은 floor 기반 라운드 로빈.
      if (floor === 15) return bossIds.sub[0];
      if (floor === 20) return bossIds.sub[1];
      if (floor === 25) return bossIds.sub[2];
      const idx = Math.floor((floor - 30) / 5) % 3;
      return bossIds.sub[idx]!;
    }
  }
}

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
  private currentMonsterId = '';
  private hpBarBg?: Phaser.GameObjects.Rectangle;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private enemyText?: Phaser.GameObjects.Text;
  private logText?: Phaser.GameObjects.Text;
  private skillState: SkillState = createSkillState();
  private activeSkills: ActiveSkill[] = [];
  private cachedPlayerAtk = 0;
  private cachedPlayerHpMax = 0;
  // floor 기반 monsterLevel 을 전투 내내 캐시. create() 에서 항상 셋.
  private cachedMonsterLevel = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleCallbacks) {
    this.callbacks = data;
  }

  create() {
    const theme = resolveForgeTheme();
    const { run } = useGameStore.getState();

    const bg = this.add.rectangle(0, 0, 360, 600, theme.bg).setOrigin(0);
    void bg;

    // 신 flow only — currentDungeonId is invariant non-null at this point.
    const dungeon = getDungeonById(run.currentDungeonId!);
    const info = getFloorInfo(run.currentDungeonId!, run.currentFloor);
    const monsterLevel = info.monsterLevel;
    this.cachedMonsterLevel = monsterLevel;

    const bossType: BossType | null = info.bossType;
    if (bossType !== null && dungeon) {
      const bossId = pickBossIdByType(dungeon.bossIds, bossType, run.currentFloor);
      const boss = getBossById(bossId);
      if (boss) {
        this.isBoss = true;
        this.bossId = boss.id;
        const bossEmoji = bossType === 'final' ? '⭐' : '👹';
        this.enemyName = `${bossEmoji} ${boss.nameKR}`;
        this.enemyMaxHP = Math.floor(monsterLevel * 50 * boss.hpMult);
      } else {
        // 데이터 결함 — 일반 몹으로 fallback
        this.isBoss = false;
        const monster = pickMonsterFromPool(monsterLevel, dungeon.monsterPool);
        this.currentMonsterId = monster.id;
        this.enemyName = `${monster.emoji} ${monster.nameKR}`;
        this.enemyMaxHP = Math.floor(monsterLevel * 20 * monster.hpMult);
      }
    } else {
      // 신 flow — 일반 floor
      this.isBoss = false;
      const monster = pickMonsterFromPool(monsterLevel, dungeon!.monsterPool);
      this.currentMonsterId = monster.id;
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = Math.floor(monsterLevel * 20 * monster.hpMult);
    }
    this.enemyHP = this.enemyMaxHP;

    this.enemyText = this.add.text(16, 16, this.enemyName, { fontSize: '16px', color: '#e05050' });
    this.hpBarBg = this.add.rectangle(16, 44, 320, 10, theme.panel).setOrigin(0);
    this.hpBarFill = this.add.rectangle(16, 44, 320, 10, theme.hp).setOrigin(0);
    this.logText = this.add.text(16, 64, '', { fontSize: '12px', color: '#8aaa88', wordWrap: { width: 320 } });

    void this.enemyText; void this.hpBarBg;
    this.combatTimer = this.time.addEvent({ delay: 600, callback: this.doRound, callbackScope: this, loop: true });

    // Cache player stats and active skills for skill system
    const char = getCharacterById(run.characterId);
    if (char) {
      this.activeSkills = [...char.activeSkills];
      const { meta } = useGameStore.getState();
      const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
      const allEquipped = getEquippedItemsList(meta.inventory, meta.equippedItemIds);
      const charLv = meta.characterLevels[run.characterId] ?? 0;
      const charLevelMult = 1 + charLv * 0.1;
      const ascTierMult = 1 + 0.1 * meta.ascTier;
      this.cachedPlayerAtk = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult);
      this.cachedPlayerHpMax = calcFinalStat('hp', run.allocated.hp, char.statMultipliers.hp, allEquipped, baseAbility, charLevelMult, ascTierMult);
    }
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
    const ascTierMult = 1 + 0.1 * meta.ascTier;

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerHP  = calcFinalStat('hp',  run.allocated.hp,  char.statMultipliers.hp,  allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult, ascTierMult);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult, ascTierMult);

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
        useGameStore.getState().trackBossDefeat(this.bossId);
        const story = getBossDefeatStory(this.bossId);
        if (story) useGameStore.getState().setPendingStory(story.id);
        playSfx('boss-victory');
      } else {
        playSfx('hit');
      }

      const expGain = Math.floor(run.level * 10);
      const goldGain = Math.floor(run.level * 5 * (run.isHardMode ? 5 : 1));
      const { newLevel, newExp, spGained } = applyExpGain(run.exp, run.level, expGain, run.isHardMode);

      useGameStore.getState().gainLevels(newLevel - run.level, spGained);
      useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun + goldGain, exp: newExp } }));
      if (!this.isBoss) {
        // Non-boss: DR = round(level * 0.5), counter increments owned by incrementDungeonKill
        useGameStore.getState().incrementDungeonKill(run.level);
        if (this.currentMonsterId) {
          useGameStore.getState().trackKill(this.currentMonsterId);
        }
      }
      // Boss: DR + stones + counter increments are all owned by bossDrop (called via onBossKill above)

      // Check stage progression after each kill
      const stateAfterKill = useGameStore.getState();
      const currentRun = stateAfterKill.run;

      if (currentRun.currentDungeonId !== null) {
        // 신 flow — 처치 후 다음 행동 결정
        // (combatTimer 는 이미 line 204 에서 제거됨.)
        if (spGained > 0) {
          playSfx('levelup');
          this.callbacks.onLevelUp(newLevel);
        }

        const dungeonId = currentRun.currentDungeonId;
        const finishedFloor = currentRun.currentFloor;
        const bossType = getBossType(finishedFloor);

        // Phase F-1: 심층 floor 균열석 drop (floor / 50, 0 for floor < 50).
        const stonesGained = Math.floor(finishedFloor / 50);
        if (stonesGained > 0) {
          stateAfterKill.gainCrackStones(stonesGained);
        }

        if (bossType === 'final') {
          const isFirstClear = !stateAfterKill.meta.dungeonFinalsCleared.includes(dungeonId);
          if (isFirstClear) {
            // 첫 final 처치 — 정복자 의식 + 1회 영구 보상 + 마을 강제 복귀.
            // (this.bossId / bossDrop 은 이미 위쪽 onBossKill 콜백 통해 처리됨.)
            stateAfterKill.markFinalCleared(dungeonId);
            stateAfterKill.markDungeonProgress(dungeonId, 31); // unlock 심층
            stateAfterKill.setPendingFinalCleared(dungeonId);
            stateAfterKill.selectDungeon(null);
            stateAfterKill.setScreen('town');
            return;
          }
          // 두 번째 이후 final — 일반 procedural 진행 (모달 X, run 계속).
          // bossDrop 은 이미 onBossKill 통해 처리됨. fall through to advancement.
        }

        // 일반 / mini / major / sub / subsequent-final — 다음 floor 로 진행 (cap 없음).
        const nextFloor = finishedFloor + 1;
        stateAfterKill.markDungeonProgress(dungeonId, nextFloor);
        stateAfterKill.setCurrentFloor(nextFloor);
        stateAfterKill.setScreen('dungeon-floors');
        return;
      }

      // currentDungeonId is invariant non-null in new flow — the dungeon-flow branch above always returns.
      // Defensive: if we somehow reach here, end the battle as a level-up or normal victory.
      if (spGained > 0) {
        playSfx('levelup');
        this.callbacks.onLevelUp(newLevel);
      } else {
        this.callbacks.onBattleEnd(true);
      }
      return;
    }

    const monsterLevelForAtk = this.cachedMonsterLevel;
    const enemyATK = Math.floor(monsterLevelForAtk * 8 * (this.isBoss ? 2 : 1));
    const reduction = calcDamageReduction(playerDEF);
    const dmgTaken = Math.floor(enemyATK * (1 - reduction));
    const currentHPEstimate = playerHP - (run.monstersDefeated * dmgTaken * 0.1);

    if (currentHPEstimate <= 0) {
      this.combatTimer?.remove();
      playSfx('defeat');
      const monsterLevel = this.cachedMonsterLevel;
      const newBP = onDefeat(run.bp, monsterLevel, run.isHardMode);
      useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP } }));
      useGameStore.getState().resetDungeon();
      if (isRunOver(newBP)) {
        useGameStore.getState().endRun();
      } else {
        this.callbacks.onBattleEnd(false);
      }
    }
  }

  update(time: number, _delta: number) {
    this.updateSkills(time);
  }

  private updateSkills(time: number) {
    if (!this.activeSkills.length) return;
    if (this.enemyHP <= 0) return; // 전투 종료 후 발동 방지

    for (const skill of this.activeSkills) {
      if (isSkillReady(this.skillState, skill, time)) {
        const result = computeSkillEffect(
          skill,
          this.cachedPlayerAtk,
          this.cachedPlayerHpMax,
          this.enemyHP,
          this.enemyMaxHP,
        );
        this.applySkillResult(result);
        fireSkill(this.skillState, skill, time);
      }
    }
  }

  private applySkillResult(result: SkillEffectResult) {
    if (result.damage !== undefined) {
      this.enemyHP = Math.max(0, this.enemyHP - result.damage);
      // HP 바 갱신
      const ratio = this.enemyHP / this.enemyMaxHP;
      this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);
    }
    // heal: 플레이어 HP 는 doRound 에서 추정치 사용 — 스킬 힐은 캐시값 조정
    // buff: 현재 구현에서는 no-op (고급 구현 시 stat 버프 레이어 추가)
    this.showVfxEmoji(result.vfxEmoji);
  }

  private showVfxEmoji(emoji: string) {
    const text = this.add.text(180, 250, emoji, { fontSize: '40px' }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: 200,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

}
