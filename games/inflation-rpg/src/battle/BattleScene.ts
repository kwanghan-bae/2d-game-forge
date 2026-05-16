import Phaser from 'phaser';
import { resolveForgeTheme } from '@forge/core';
import { useGameStore } from '../store/gameStore';
import { calcFinalStat, calcDamageReduction, calcCritChance } from '../systems/stats';
import { applyExpGain } from '../systems/experience';
import { playSfx } from '../systems/sound';
import { calcBaseAbilityMult } from '../systems/progression';
import { getEquippedInstances } from '../systems/equipment';
import { getCharacterById } from '../data/characters';
import { pickMonsterFromPool } from '../data/monsters';
import { getDungeonById } from '../data/dungeons';
import { getFloorInfo, getBossType } from '../data/floors';
import { getBossById } from '../data/bosses';
import type { BossType } from '../types';
import { getBossDefeatStory } from '../data/stories';
import { resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken } from './resolver';
import { isRunOver, onDefeat } from '../systems/bp';
import {
  createSkillState, isSkillReady, fireSkill, computeSkillEffect,
  type SkillState, type SkillEffectResult,
} from './SkillSystem';
import type { ActiveSkill } from '../types';
import { buildActiveSkillsForCombat } from '../systems/buildActiveSkills';
import { applyMetaDropMult } from '../systems/economy';
import {
  createEffectsState, tickEffects, processIncomingDamage, addEffect, getDebuffStatMultiplier,
  registerMythicProcs, evaluateMythicProcs,
  type CombatStateForEffects,
} from '../systems/effects';
import { getMythicFlatMult, getMythicXpMult, getMythicProcs, getMythicReviveCount } from '../systems/mythics';
import { getRelicFlatMult, getRelicXpMult, relicNoDeathLoss, relicReviveCount } from '../systems/relics';
import type { EffectsState } from '../types';
import { computeMaxHp } from '../systems/playerHp';

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
  onBossKill: (bossId: string, bpReward: number, bossType: 'mini' | 'major' | 'sub' | 'final') => void;
}

export class BattleScene extends Phaser.Scene {
  private callbacks!: BattleCallbacks;
  private combatTimer?: Phaser.Time.TimerEvent;
  private enemyHP = 0;
  private enemyMaxHP = 0;
  private enemyName = '';
  private isBoss = false;
  private bossId?: string;
  private cachedBossType?: 'mini' | 'major' | 'sub' | 'final';
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
  private effectsState: EffectsState = createEffectsState();

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
        this.cachedBossType = bossType;
        const bossEmoji = bossType === 'final' ? '⭐' : '👹';
        this.enemyName = `${bossEmoji} ${boss.nameKR}`;
        this.enemyMaxHP = resolveEnemyMaxHp({
          monsterLevel,
          isBoss: true,
          hpMult: boss.hpMult,
        });
      } else {
        // 데이터 결함 — 일반 몹으로 fallback
        this.isBoss = false;
        const monster = pickMonsterFromPool(monsterLevel, dungeon.monsterPool);
        this.currentMonsterId = monster.id;
        this.enemyName = `${monster.emoji} ${monster.nameKR}`;
        this.enemyMaxHP = resolveEnemyMaxHp({
          monsterLevel,
          isBoss: false,
          hpMult: monster.hpMult,
        });
      }
    } else {
      // 신 flow — 일반 floor
      this.isBoss = false;
      const monster = pickMonsterFromPool(monsterLevel, dungeon!.monsterPool);
      this.currentMonsterId = monster.id;
      this.enemyName = `${monster.emoji} ${monster.nameKR}`;
      this.enemyMaxHP = resolveEnemyMaxHp({
        monsterLevel,
        isBoss: false,
        hpMult: monster.hpMult,
      });
    }
    this.enemyHP = this.enemyMaxHP;

    this.enemyText = this.add.text(16, 16, this.enemyName, { fontSize: '16px', color: '#e05050' });
    this.hpBarBg = this.add.rectangle(16, 44, 320, 10, theme.panel).setOrigin(0);
    this.hpBarFill = this.add.rectangle(16, 44, 320, 10, theme.hp).setOrigin(0);
    this.logText = this.add.text(16, 64, '', { fontSize: '12px', color: '#8aaa88', wordWrap: { width: 320 } });

    void this.enemyText; void this.hpBarBg;
    this.combatTimer = this.time.addEvent({ delay: 600, callback: this.doRound, callbackScope: this, loop: true });

    this.effectsState = createEffectsState();

    // Phase Realms — ensure run.playerHp is hydrated to maxHp at entry if null.
    useGameStore.getState().hydratePlayerHpIfNull();

    // Phase E — register mythic proc triggers from meta (independent of `active` map).
    {
      const { meta } = useGameStore.getState();
      registerMythicProcs(this.effectsState, getMythicProcs(meta));
    }

    // Cache player stats and active skills for skill system
    const char = getCharacterById(run.characterId);
    if (char) {
      const { meta } = useGameStore.getState();
      this.activeSkills = buildActiveSkillsForCombat(run.characterId, meta);
      const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
      const allEquipped = getEquippedInstances(meta.inventory, meta.equippedItemIds);
      const charLv = meta.characterLevels[run.characterId] ?? 0;
      const charLevelMult = 1 + charLv * 0.1;
      const ascTierMult = 1 + 0.1 * meta.ascTier;
      const ascTree = meta.ascTree;
      const ascTreeAtkMult = 1 + 0.05 * ascTree.atk_pct;
      const ascTreeHpMult = 1 + 0.05 * ascTree.hp_pct;
      const atkMetaMult = getMythicFlatMult(meta, 'atk') * getRelicFlatMult(meta, 'atk');
      const hpMetaMult = getMythicFlatMult(meta, 'hp') * getRelicFlatMult(meta, 'hp');
      this.cachedPlayerAtk = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult, ascTreeAtkMult, atkMetaMult);
      this.cachedPlayerHpMax = calcFinalStat('hp', run.allocated.hp, char.statMultipliers.hp, allEquipped, baseAbility, charLevelMult, ascTierMult, ascTreeHpMult, hpMetaMult);
    }
  }

  private doRound() {
    const state = useGameStore.getState();
    const { run, meta } = state;
    const char = getCharacterById(run.characterId);
    if (!char) return;

    const baseAbility = calcBaseAbilityMult(meta.baseAbilityLevel);
    const allEquipped = getEquippedInstances(meta.inventory, meta.equippedItemIds);
    const charLv = meta.characterLevels[run.characterId] ?? 0;
    const charLevelMult = 1 + charLv * 0.1;
    const ascTierMult = 1 + 0.1 * meta.ascTier;
    const ascTree = meta.ascTree;
    const ascTreeAtkMult = 1 + 0.05 * ascTree.atk_pct;
    const atkMetaMult = getMythicFlatMult(meta, 'atk') * getRelicFlatMult(meta, 'atk');
    const defMetaMult = getMythicFlatMult(meta, 'def') * getRelicFlatMult(meta, 'def');
    const agiMetaMult = getMythicFlatMult(meta, 'agi') * getRelicFlatMult(meta, 'agi');
    const lucMetaMult = getMythicFlatMult(meta, 'luc') * getRelicFlatMult(meta, 'luc');

    const playerATK = calcFinalStat('atk', run.allocated.atk, char.statMultipliers.atk, allEquipped, baseAbility, charLevelMult, ascTierMult, ascTreeAtkMult, atkMetaMult);
    const playerDEF = calcFinalStat('def', run.allocated.def, char.statMultipliers.def, allEquipped, baseAbility, charLevelMult, ascTierMult, 1, defMetaMult);
    const playerAGI = calcFinalStat('agi', run.allocated.agi, char.statMultipliers.agi, allEquipped, baseAbility, charLevelMult, ascTierMult, 1, agiMetaMult);
    const playerLUC = calcFinalStat('luc', run.allocated.luc, char.statMultipliers.luc, allEquipped, baseAbility, charLevelMult, ascTierMult, 1, lucMetaMult);

    const crit = Math.random() < calcCritChance(playerAGI, playerLUC);
    const combo = Math.random() < 0.05 + playerAGI * 0.0005;
    const hits = combo ? 3 : 1;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      totalDmg += resolvePlayerHit({
        playerATK,
        crit,
        rngRoll: Math.random(),
        critMultBonus: 0.20 * ascTree.crit_damage,
      });
    }

    // Phase Realms — magnitudeBuff for light_of_truth mythic.
    const lightBuff = meta.mythicEquipped.includes('light_of_truth') ? 1.25 : 1.0;

    // Phase E — mythic on_player_attack procs (lifesteal / magic_burst).
    // damageDealt feeds all; magic_burst adds bonus damage to enemy.
    const attackProcs = evaluateMythicProcs(this.effectsState, 'on_player_attack', {
      damageDealt: totalDmg,
      magnitudeBuff: lightBuff,
    });
    const totalEnemyDmg = totalDmg + attackProcs.magicBurstDamage;
    this.enemyHP = Math.max(0, this.enemyHP - totalEnemyDmg);

    // Phase Realms — apply lifesteal heal to run.playerHp.
    if (attackProcs.lifestealHeal > 0) {
      useGameStore.getState().applyLifestealHeal(attackProcs.lifestealHeal);
    }

    const logParts: string[] = [];
    if (combo) logParts.push(`${hits}연타! `);
    if (crit) logParts.push('치명타! ');
    logParts.push(`${totalEnemyDmg.toLocaleString()} 데미지`);
    if (attackProcs.magicBurstDamage > 0) logParts.push(' (마법 폭발!)');
    this.logText?.setText(logParts.join(''));

    const ratio = this.enemyHP / this.enemyMaxHP;
    this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);

    if (this.enemyHP <= 0) {
      // Phase Realms — on_kill procs (sp_steal → cooldownReduce).
      const killProcs = evaluateMythicProcs(this.effectsState, 'on_kill', { magnitudeBuff: lightBuff });
      if (killProcs.cooldownReduce > 0) {
        const reduceMs = killProcs.cooldownReduce * 1000;
        for (const skill of this.activeSkills) {
          const nextFireMs = this.skillState.cooldownsMs.get(skill.id) ?? 0;
          this.skillState.cooldownsMs.set(skill.id, Math.max(0, nextFireMs - reduceMs));
        }
      }

      this.combatTimer?.remove();

      if (this.isBoss && this.bossId) {
        this.callbacks.onBossKill(this.bossId, 5, this.cachedBossType ?? 'mini');
        useGameStore.getState().trackBossDefeat(this.bossId);
        const story = getBossDefeatStory(this.bossId);
        if (story) useGameStore.getState().setPendingStory(story.id);
        playSfx('boss-victory');
      } else {
        playSfx('hit');
      }

      const expGain = Math.floor(run.level * 10);
      const rawGoldGain = Math.floor(run.level * 5 * (run.isHardMode ? 5 : 1));
      const goldGain = applyMetaDropMult(rawGoldGain, 'gold', meta);
      const xpMetaMult = getMythicXpMult(meta) * getRelicXpMult(meta);
      const { newLevel, newExp, spGained } = applyExpGain(run.exp, run.level, expGain, run.isHardMode, meta.ascTree.sp_per_lvl, xpMetaMult);

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

        // Phase Compass — mini/major-boss 첫 처치 시 compass 부여 (idempotent)
        if (bossType === 'mini') {
          stateAfterKill.awardMiniBossCompass(dungeonId);
        } else if (bossType === 'major') {
          stateAfterKill.awardMajorBossCompass(dungeonId);
        }

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
    const debuffMult = getDebuffStatMultiplier(this.effectsState, 'enemy');
    const enemyATK = Math.floor(resolveEnemyAtk({
      monsterLevel: monsterLevelForAtk,
      isBoss: this.isBoss,
    }) * debuffMult);
    const reduction = calcDamageReduction(playerDEF);
    const rawDmgTaken = resolveDamageTaken({ enemyATK, reduction });
    const incomingResult = processIncomingDamage(this.effectsState, rawDmgTaken);
    const finalDmgTaken = incomingResult.damageAfterShield;
    // Phase E — mythic on_player_hit_received procs (thorns).
    const hitProcs = evaluateMythicProcs(this.effectsState, 'on_player_hit_received', { damageReceived: finalDmgTaken });
    const totalReflect = incomingResult.reflectDamage + hitProcs.thornsReflect;
    if (totalReflect > 0) {
      this.enemyHP = Math.max(0, this.enemyHP - totalReflect);
      const ratio = this.enemyHP / this.enemyMaxHP;
      this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);
    }
    // Phase Realms — apply damage to run.playerHp and check defeat.
    useGameStore.getState().applyDamageToPlayer(finalDmgTaken);
    const runAfterHit = useGameStore.getState().run;
    const currentPlayerHp = runAfterHit?.playerHp ?? 0;

    if (currentPlayerHp <= 0) {
      // Phase E — Revive check (feather_of_fate relic + phoenix_feather mythic).
      // NOTE: do NOT remove combatTimer here — revive keeps the loop running.
      const totalRevives = relicReviveCount(meta) + getMythicReviveCount(meta);
      if ((runAfterHit?.featherUsed ?? 0) < totalRevives) {
        // Revive: full HP + featherUsed++.
        useGameStore.setState((s) => {
          if (!s.run) return {};
          const maxHp = computeMaxHp(s.run, s.meta);
          return {
            run: {
              ...s.run,
              featherUsed: s.run.featherUsed + 1,
              playerHp: maxHp,
            },
          };
        });
        playSfx('levelup');
        return; // don't trigger defeat path — combat continues on next tick
      }

      this.combatTimer?.remove();
      playSfx('defeat');
      const monsterLevel = this.cachedMonsterLevel;
      // Phase E — undead_coin (no_death_loss): skip BP loss but defeat still ends the run.
      const newBP = relicNoDeathLoss(meta)
        ? run.bp
        : onDefeat(run.bp, monsterLevel, run.isHardMode);
      // Phase Realms — set playerHp=null on defeat so next run re-hydrates.
      useGameStore.setState((s) => ({ run: { ...s.run, bp: newBP, playerHp: null } }));
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
    const tickResult = tickEffects(this.effectsState, this.buildCombatStateForEffects(), _delta);
    if (tickResult.stateDelta.enemyHpDelta) {
      this.enemyHP = Math.max(0, this.enemyHP + tickResult.stateDelta.enemyHpDelta);
      const ratio = this.enemyHP / this.enemyMaxHP;
      this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);
    }
  }

  private buildCombatStateForEffects(): CombatStateForEffects {
    return {
      selfHp: this.cachedPlayerHpMax,
      selfMaxHp: this.cachedPlayerHpMax,
      enemyHp: this.enemyHP,
      enemyMaxHp: this.enemyMaxHP,
      selfAtk: this.cachedPlayerAtk,
      selfDef: 0,
    };
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
        this.applySkillResult(result, skill.id);
        fireSkill(this.skillState, skill, time);
      }
    }
  }

  private applySkillResult(result: SkillEffectResult, skillId: string) {
    if (result.damage !== undefined) {
      this.enemyHP = Math.max(0, this.enemyHP - result.damage);
      const ratio = this.enemyHP / this.enemyMaxHP;
      this.hpBarFill?.setDisplaySize(Math.max(0, 320 * ratio), 10);
    }
    if (result.debuff !== undefined) {
      addEffect(this.effectsState, {
        id: `debuff_${skillId}`,
        effectType: 'debuff',
        source: 'ult',
        target: 'enemy',
        durationMs: result.debuff.durationMs,
        remainingMs: result.debuff.durationMs,
        magnitude: result.debuff.statPercent,
        stack: 1,
      });
    }
    if (result.reflect !== undefined) {
      addEffect(this.effectsState, {
        id: `reflect_${skillId}`,
        effectType: 'reflect',
        source: 'ult',
        target: 'self',
        durationMs: result.reflect.durationMs,
        remainingMs: result.reflect.durationMs,
        magnitude: result.reflect.reflectPercent,
        stack: 1,
      });
    }
    // Phase 5 — heal wiring: applyLifestealHeal 가 max 까지 clamp + null 처리 자체 수행.
    if (result.heal !== undefined && result.heal > 0) {
      useGameStore.getState().applyLifestealHeal(result.heal);
    }
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
