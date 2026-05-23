import type { DeathCause } from './SagaTypes';

/** Object marker (을/를) by trailing jongseong. Falls back to '를' for any
 *  non-hangul tail so foreign / mixed strings stay readable. */
function obj(noun: string): string {
  const last = noun.charCodeAt(noun.length - 1);
  if (Number.isNaN(last) || last < 0xAC00 || last > 0xD7A3) return `${noun}를`;
  const jongseong = (last - 0xAC00) % 28;
  return jongseong === 0 ? `${noun}를` : `${noun}을`;
}

export class NarrativeGenerator {
  static forBattle(opts: { age: number; enemyNameKR: string }): string {
    return `${opts.age}세에 ${obj(opts.enemyNameKR)} 처치했다.`;
  }

  static forLevelUp(opts: { age: number; newLevel: number }): string {
    return `${opts.age}세에 한 단계 더 강해졌다. (LV ${opts.newLevel})`;
  }

  /** Batch form for an arrival that triggered many consecutive level-ups —
   *  late-game `expGain ∝ lv^1.8` 가 한 kill 마다 수십 level-up 을 fire 하므로,
   *  saga 가 동일 line 으로 도배되지 않게 압축한다. */
  static forLevelUpBatch(opts: { age: number; fromLevel: number; toLevel: number; count: number }): string {
    if (opts.count <= 1) return NarrativeGenerator.forLevelUp({ age: opts.age, newLevel: opts.toLevel });
    return `${opts.age}세에 LV ${opts.fromLevel} → LV ${opts.toLevel} 까지 ${opts.count}단계 폭풍 성장했다.`;
  }

  static forDrop(opts: { age: number; itemNameKR: string }): string {
    return `${opts.age}세에 ${obj(opts.itemNameKR)} 손에 넣었다.`;
  }

  static forJobUnlock(opts: { age: number; jobNameKR: string; tier: number }): string {
    return `${opts.age}세에 ${opts.jobNameKR}이(가) 되었다. (Tier ${opts.tier})`;
  }

  static forSkillLearned(opts: { age: number; skillNameKR: string }): string {
    return `${opts.age}세에 ${obj(opts.skillNameKR)} 익혔다.`;
  }

  static forShrine(opts: { age: number; healed: number }): string {
    if (opts.healed <= 0) {
      return `${opts.age}세에 사당에서 평온한 마음을 얻었다.`;
    }
    return `${opts.age}세에 사당에서 기도하여 ${opts.healed.toLocaleString()} 회복했다.`;
  }

  static forMoralChoice(opts: { age: number; choiceNameKR: string }): string {
    return `${opts.age}세에 ${opts.choiceNameKR}.`;
  }

  static forDeath(opts: { age: number; cause: DeathCause; enemyNameKR?: string }): string {
    switch (opts.cause) {
      case '전사':
        return `${opts.age}세에 ${opts.enemyNameKR ?? '강적'}에게 쓰러져 생을 마감했다.`;
      case '자연사':
        return `${opts.age}세에 안식을 맞아 잠들었다.`;
      case '영광스러운죽음':
        return `${opts.age}세에 영웅으로서 생을 마감했다.`;
      case '비극':
        return `${opts.age}세에 비극적인 최후를 맞았다.`;
    }
  }
}
