import type { DeathCause } from './SagaTypes';
import type { RealmId, SeasonId } from '../types';
import { NarrationVariants } from '../data/narrationVariants';

export class NarrativeGenerator {
  /** seed = 0 (기본값) 이면 항상 첫 번째(기존) 텍스트 → 하위 호환. */
  static forBattle(opts: { age: number; enemyNameKR: string }, seed = 0): string {
    return NarrationVariants.battle(opts, seed);
  }

  static forLevelUp(opts: { age: number; newLevel: number }, seed = 0): string {
    return NarrationVariants.levelUp(opts, seed);
  }

  /** Batch form — seed 기반으로 변형 선택. count = 1 이면 단일 form 으로 위임. */
  static forLevelUpBatch(opts: { age: number; fromLevel: number; toLevel: number; count: number }, seed = 0): string {
    if (opts.count <= 1) return NarrativeGenerator.forLevelUp({ age: opts.age, newLevel: opts.toLevel }, seed);
    return NarrationVariants.levelUpBatch(opts, seed);
  }

  static forDrop(opts: { age: number; itemNameKR: string }, seed = 0): string {
    return NarrationVariants.drop(opts, seed);
  }

  static forJobUnlock(opts: { age: number; jobNameKR: string; tier: number }, seed = 0): string {
    return NarrationVariants.jobUnlock(opts, seed);
  }

  static forSkillLearned(opts: { age: number; skillNameKR: string }, seed = 0): string {
    return NarrationVariants.skillLearned(opts, seed);
  }

  static forShrine(opts: { age: number; healed: number }, seed = 0): string {
    if (opts.healed <= 0) {
      return NarrationVariants.shrineCalm({ age: opts.age }, seed);
    }
    return NarrationVariants.shrineHealed(opts, seed);
  }

  static forMoralChoice(opts: { age: number; choiceNameKR: string }, seed = 0): string {
    return NarrationVariants.moralChoice(opts, seed);
  }

  static forRejuvenation(opts: { age: number; yearsBack: number; rejuvenationCount: number }, seed = 0): string {
    return NarrationVariants.rejuvenation(opts, seed);
  }

  /** F2 — realm 진입 이벤트 나레이션. 6 realm × 5 variant. */
  static forRealmEnter(opts: { age: number; realm: RealmId }, seed = 0): string {
    return NarrationVariants.realmEnter(opts, seed);
  }

  /** F2 — 계절 전환 나레이션. 4 season × realm-flavor prefix. */
  static forSeasonChange(opts: { age: number; season: SeasonId; realm: RealmId }, seed = 0): string {
    return NarrationVariants.seasonChange(opts, seed);
  }

  /** F3 — NPC 첫 조우 나레이션. 3 kind × 3 variant. */
  static forNpcEncounter(opts: { age: number; kind: 'mentor' | 'rival' | 'passerby' }, seed = 0): string {
    return NarrationVariants.npcEncounter(opts, seed);
  }

  /** F3 — NPC 사망 나레이션. 3 variant. */
  static forNpcDeath(opts: { age: number }, seed = 0): string {
    return NarrationVariants.npcDeath(opts, seed);
  }

  /** F3 — 가족 이벤트 나레이션 (결혼/자식 출생/자식 성장). 3 type × 2 variant. */
  static forFamilyEvent(opts: { age: number; type: 'marriage' | 'child_born' | 'child_grown' }, seed = 0): string {
    return NarrationVariants.familyEvent(opts, seed);
  }

  static forDeath(opts: { age: number; cause: DeathCause; enemyNameKR?: string; oldLevel?: number; newLevel?: number }): string {
    switch (opts.cause) {
      case '전사': {
        const levelInfo = (opts.oldLevel !== undefined && opts.newLevel !== undefined)
          ? ` [LV ${opts.oldLevel} → ${opts.newLevel}]`
          : '';
        return `${opts.age}세에 ${opts.enemyNameKR ?? '강적'}에게 쓰러져 시련을 받았다.${levelInfo}`;
      }
      case '자연사':
        return `${opts.age}세에 안식을 맞아 잠들었다.`;
      case '영광스러운죽음':
        return `${opts.age}세에 영웅으로서 생을 마감했다.`;
      case '비극':
        return `${opts.age}세에 비극적인 최후를 맞았다.`;
    }
  }
}
