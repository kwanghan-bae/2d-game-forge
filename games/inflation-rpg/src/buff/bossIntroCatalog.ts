/**
 * Cycle 109 F1 — Boss Intro Choice card catalog.
 *
 * Per cycle 109 PRD §F1.동작(4): boss 전투 직전 surface 되는 3 cards 의 source
 * of truth. **BUFF_CATALOG (light-spend meta buff) 와 명확히 분리** — 이 catalog
 * 의 cards 는 cycle 종료까지만 유지되는 *transient* buff. controller instance
 * scope only. persist 안 됨.
 *
 * 10 cards × 3 tier (소량 5 / 중량 3 / 대량 2), 가중치 normalize 시:
 *   - 소량 50% (5 cards × 10 weight)
 *   - 중량 30% (3 cards × 10 weight)
 *   - 대량 20% (2 cards × 10 weight)
 *
 * 카드 magnitude 는 controller seed 무관하게 fixed (이 catalog 의 entry 값).
 * pool 의 *어떤 카드* 가 뽑히냐만 randomized. 같은 카드 = 같은 효과.
 */

import type { SeededRng } from '../cycle/SeededRng';

export type BossIntroBuffId =
  | 'atk_small' | 'hp_small' | 'light_small' | 'move_small' | 'drop_small'
  | 'atk_mid'   | 'hp_mid'   | 'light_mid'
  | 'atk_big'   | 'hp_big';

export type BossIntroBuffTier = 'small' | 'mid' | 'big';

export type BossIntroEffectKind = 'atk_mul' | 'hp_mul' | 'light_mul' | 'move_mul' | 'drop_bonus';

export interface BossIntroEffect {
  kind: BossIntroEffectKind;
  /** atk_mul/hp_mul/light_mul/move_mul → multiplicative factor delta (+0.10 = +10%).
   *  drop_bonus → additive bonus to dropChanceBonus (+0.03 = +3 percentage points). */
  value: number;
}

export interface BossIntroBuff {
  id: BossIntroBuffId;
  nameKR: string;
  descKR: string;
  tier: BossIntroBuffTier;
  /** Weight in the deterministic sample (10 each = equal-within-tier). */
  weight: number;
  effect: BossIntroEffect;
}

/** Master catalog. 10 cards. */
export const BOSS_INTRO_CATALOG: readonly BossIntroBuff[] = [
  // 소량 tier (5 cards × 10 weight = 50% 분포)
  { id: 'atk_small',   nameKR: '날카로운 결의',   descKR: '공격력 +10% (이번 사이클 한정)',
    tier: 'small', weight: 10, effect: { kind: 'atk_mul', value: 0.10 } },
  { id: 'hp_small',    nameKR: '단단한 의지',     descKR: '최대 HP +10% (이번 사이클 한정)',
    tier: 'small', weight: 10, effect: { kind: 'hp_mul', value: 0.10 } },
  { id: 'light_small', nameKR: '빛의 속삭임',     descKR: '빛 누적률 +5% (이번 사이클 한정)',
    tier: 'small', weight: 10, effect: { kind: 'light_mul', value: 0.05 } },
  { id: 'move_small',  nameKR: '바람의 가호',     descKR: '이동속도 +5% (이번 사이클 한정)',
    tier: 'small', weight: 10, effect: { kind: 'move_mul', value: 0.05 } },
  { id: 'drop_small',  nameKR: '운명의 손길',     descKR: '장비 획득 확률 +3%p (이번 사이클 한정)',
    tier: 'small', weight: 10, effect: { kind: 'drop_bonus', value: 0.03 } },

  // 중량 tier (3 cards × 10 weight = 30% 분포)
  { id: 'atk_mid',     nameKR: '전사의 광채',     descKR: '공격력 +25% (이번 사이클 한정)',
    tier: 'mid',   weight: 10, effect: { kind: 'atk_mul', value: 0.25 } },
  { id: 'hp_mid',      nameKR: '수호의 광채',     descKR: '최대 HP +25% (이번 사이클 한정)',
    tier: 'mid',   weight: 10, effect: { kind: 'hp_mul', value: 0.25 } },
  { id: 'light_mid',   nameKR: '빛의 광채',       descKR: '빛 누적률 +15% (이번 사이클 한정)',
    tier: 'mid',   weight: 10, effect: { kind: 'light_mul', value: 0.15 } },

  // 대량 tier (2 cards × 10 weight = 20% 분포)
  { id: 'atk_big',     nameKR: '파괴의 광휘',     descKR: '공격력 +50% (이번 사이클 한정)',
    tier: 'big',   weight: 10, effect: { kind: 'atk_mul', value: 0.50 } },
  { id: 'hp_big',      nameKR: '불멸의 광휘',     descKR: '최대 HP +50% (이번 사이클 한정)',
    tier: 'big',   weight: 10, effect: { kind: 'hp_mul', value: 0.50 } },
];

export function findBossIntroBuff(id: BossIntroBuffId): BossIntroBuff {
  const b = BOSS_INTRO_CATALOG.find(x => x.id === id);
  if (!b) throw new Error(`Unknown boss intro buff: ${id}`);
  return b;
}

/** Deterministic 3-card weighted sample without replacement.
 *
 *  PRD §F1.동작(4) "추첨 seed" = `controller.seed ^ landmarkId hash ^ 0xb0551`.
 *  Caller is responsible for constructing the seeded RNG with that seed so the
 *  sample is reproducible per-(seed, landmarkId) pair.
 *
 *  Algorithm = weighted random sampling without replacement. For each pick:
 *    1. sum remaining weights → total
 *    2. roll rng.int(total) → r
 *    3. iterate cards, subtract weight from r until r < 0 → picked
 *    4. remove picked from pool, repeat for next pick
 *
 *  Returns an array of 3 BossIntroBuff entries from the catalog.
 *
 *  Note: catalog 의 weights 가 모두 동일 (10 each) 이면 사실상 uniform 3-sample.
 *  catalog 가 future 에 unequal weight 도입할 때를 위해 generic weighted 구현.
 */
export function sampleBossIntroCards(rng: SeededRng, count = 3): BossIntroBuff[] {
  if (count > BOSS_INTRO_CATALOG.length) {
    throw new Error(`Cannot sample ${count} cards from ${BOSS_INTRO_CATALOG.length}-entry catalog`);
  }
  const pool: BossIntroBuff[] = [...BOSS_INTRO_CATALOG];
  const picked: BossIntroBuff[] = [];
  for (let i = 0; i < count; i++) {
    const total = pool.reduce((s, b) => s + b.weight, 0);
    let r = rng.int(total);
    let chosenIdx = pool.length - 1; // fallback to last in case of floating drift
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j]!.weight;
      if (r < 0) {
        chosenIdx = j;
        break;
      }
    }
    picked.push(pool[chosenIdx]!);
    pool.splice(chosenIdx, 1);
  }
  return picked;
}

/** Per PRD §F1.동작(4): seed = controller.seed ^ landmarkId hash ^ 0xb0551. */
export function bossIntroSampleSeed(controllerSeed: number, landmarkId: string): number {
  // Simple djb2-style string hash for deterministic seed mixing.
  let h = 5381;
  for (let i = 0; i < landmarkId.length; i++) {
    h = ((h << 5) + h + landmarkId.charCodeAt(i)) | 0;
  }
  return (controllerSeed ^ h ^ 0xb0551) >>> 0;
}
