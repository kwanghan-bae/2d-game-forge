import type { DeathCause } from './SagaTypes';
import type { NpcEntity, RealmId, SeasonId } from '../types';
import { NarrationVariants } from '../data/narrationVariants';

export class NarrativeGenerator {
  /** seed = 0 (기본값) 이면 항상 첫 번째(기존) 텍스트 → 하위 호환.
   *  Cycle 101 — opts.realm 추가 (optional, null 허용). */
  static forBattle(opts: { age: number; enemyNameKR: string; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.battle(opts, seed);
  }

  static forLevelUp(opts: { age: number; newLevel: number; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.levelUp(opts, seed);
  }

  /** Batch form — seed 기반으로 변형 선택. count = 1 이면 단일 form 으로 위임.
   *  Cycle 101: realm 도 delegate forward. */
  static forLevelUpBatch(opts: { age: number; fromLevel: number; toLevel: number; count: number; realm?: RealmId | null }, seed = 0): string {
    if (opts.count <= 1) return NarrativeGenerator.forLevelUp({ age: opts.age, newLevel: opts.toLevel, realm: opts.realm }, seed);
    return NarrationVariants.levelUpBatch(opts, seed);
  }

  static forDrop(opts: { age: number; itemNameKR: string; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.drop(opts, seed);
  }

  static forJobUnlock(opts: { age: number; jobNameKR: string; tier: number; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.jobUnlock(opts, seed);
  }

  static forSkillLearned(opts: { age: number; skillNameKR: string; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.skillLearned(opts, seed);
  }

  static forShrine(opts: { age: number; healed: number; realm?: RealmId | null }, seed = 0): string {
    if (opts.healed <= 0) {
      return NarrationVariants.shrineCalm({ age: opts.age, realm: opts.realm }, seed);
    }
    return NarrationVariants.shrineHealed(opts, seed);
  }

  static forMoralChoice(opts: { age: number; choiceNameKR: string; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.moralChoice(opts, seed);
  }

  /** C888: Player choice event narration for saga entries */
  static forChoiceEvent(opts: { age: number; eventType: string; choice: string }, _seed = 0): string {
    const labels: Record<string, string> = {
      proving_accept: '시련의 장에 도전했다',
      proving_decline: '시련의 장을 회피했다',
      crossroads_atk: '갈림길에서 힘의 길을 택했다',
      crossroads_exp: '갈림길에서 지혜의 길을 택했다',
      crossroads_gold: '갈림길에서 부의 길을 택했다',
      mercenary_accept: '용병의 제안을 받아들였다',
      mercenary_decline: '용병의 제안을 거절했다',
      merchant_heal: '방랑 상인에게 치유를 구했다',
      merchant_atk: '방랑 상인에게 힘을 구했다',
      merchant_gamble: '방랑 상인과 도박을 벌였다',
      // C890: Last Stand
      last_stand_accept: '최후의 항전에 뛰어들었다',
      last_stand_decline: '최후의 항전을 거절했다',
      // C911: First Trial
      first_trial_heal: '첫 시련에서 치유의 길을 택했다',
      first_trial_atk: '첫 시련에서 힘의 길을 택했다',
    };
    const key = `${opts.eventType}_${opts.choice}`;
    return `${opts.age}세에 ${labels[key] ?? '선택을 내렸다'}.`;
  }

  /** C888: Consequence event narration for saga entries */
  static forConsequenceEvent(opts: { age: number; eventType: string; style: string; varianceRoll?: number }, _seed = 0): string {
    // C908: 5-tier variance suffix (was 2-tier in C900)
    const vSuffix = opts.varianceRoll !== undefined
      ? (opts.varianceRoll > 0.9 ? ' 운명의 바람이 맹렬히 불었다.'
        : opts.varianceRoll > 0.7 ? ' 운명의 바람이 강하게 불었다.'
        : opts.varianceRoll < 0.1 ? ' 운명의 바람이 거의 잦아들었다.'
        : opts.varianceRoll < 0.3 ? ' 운명의 바람이 약하게 불었다.'
        : '')
      : '';

    if (opts.eventType === 'reputation') {
      const styleLabels: Record<string, string> = {
        aggressive: '공격적 명성이 보답했다 — ATK 강화!',
        defensive: '방어적 명성이 보답했다 — 방패와 회복!',
        greedy: '탐욕적 명성이 보답했다 — 골드 폭발!',
        balanced: '균형잡힌 명성이 보답했다 — EXP 버프!',
      };
      return `${opts.age}세에 ${styleLabels[opts.style] ?? '명성이 보답했다.'}${vSuffix}`;
    }
    if (opts.eventType === 'veterans_trial') {
      const styleLabels: Record<string, string> = {
        aggressive: '노련한 시련에서 전투의 기억이 되살아났다!',
        defensive: '노련한 시련에서 방어의 지혜가 빛났다!',
        greedy: '노련한 시련에서 축적된 부가 쏟아졌다!',
        balanced: '노련한 시련을 균형 있게 극복했다!',
      };
      return `${opts.age}세에 ${styleLabels[opts.style] ?? '노련한 시련을 마쳤다.'}${vSuffix}`;
    }
    if (opts.eventType === 'final_reckoning') {
      const styleLabels: Record<string, string> = {
        aggressive: '최종 심판에서 파괴적인 힘이 폭발했다!',
        defensive: '최종 심판에서 철벽 방어로 생존을 확정했다!',
        greedy: '최종 심판에서 축적된 보물이 쏟아졌다!',
        balanced: '최종 심판을 지혜롭게 완수했다!',
      };
      return `${opts.age}세에 ${styleLabels[opts.style] ?? '최종 심판을 마쳤다.'}${vSuffix}`;
    }
    return `${opts.age}세에 시련을 마쳤다.${vSuffix}`;
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

  /** F3 — NPC 첫 조우 나레이션. 3 kind × 3 variant. Cycle 104: realm wired. */
  static forNpcEncounter(opts: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.npcEncounter(opts, seed);
  }

  /** F3 — NPC 사망 나레이션. Cycle 256: kind-aware 분기 (6 kind, 14 variant). */
  static forNpcDeath(opts: { age: number; kind: NpcEntity['kind']; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.npcDeath(opts, seed);
  }

  /** F3 — 가족 이벤트 나레이션 (결혼/자식 출생/자식 성장). 3 type × 2 variant. Cycle 104: realm wired. */
  static forFamilyEvent(opts: { age: number; type: 'marriage' | 'child_born' | 'child_grown'; realm?: RealmId | null }, seed = 0): string {
    return NarrationVariants.familyEvent(opts, seed);
  }

  static forDeath(opts: { age: number; cause: DeathCause; enemyNameKR?: string; oldLevel?: number; newLevel?: number; realm?: RealmId | null; seed?: number }): string {
    switch (opts.cause) {
      case '전사': {
        const levelInfo = (opts.oldLevel !== undefined && opts.newLevel !== undefined)
          ? ` [LV ${opts.oldLevel} → ${opts.newLevel}]`
          : '';
        return `${opts.age}세에 ${opts.enemyNameKR ?? '강적'}에게 쓰러져 시련을 받았다.${levelInfo}`;
      }
      case '자연사':
        // Cycle 258: 1줄 hardcoded → NarrationVariants.naturalDeath (5 variant + composition).
        return NarrationVariants.naturalDeath({ age: opts.age, realm: opts.realm ?? null }, opts.seed ?? 0);
      case '영광스러운죽음':
        return `${opts.age}세에 영웅으로서 생을 마감했다.`;
      case '비극':
        return `${opts.age}세에 비극적인 최후를 맞았다.`;
      case '무위':
        // Cycle-5 F3: pathfinder candidates-exhausted. 영웅이 갈 곳을 잃어
        // 자취를 감춘 종결. 향후 동급 stale-realm bug 즉시 visible.
        return `${opts.age}세에 갈 길을 잃어 자취를 감추었다.`;
    }
  }
}
