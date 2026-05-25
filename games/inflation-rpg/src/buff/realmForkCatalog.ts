/**
 * Cycle 110 F1 — Realm Fork card catalog.
 *
 * Per cycle 110 PRD §F1.동작(3): realm 전환 직전 surface 되는 2 fixed cards
 * (risk / safe) 의 source of truth. **BOSS_INTRO_CATALOG (boss 카드) 와 분리** —
 * 본 catalog 의 cards 는 cycle 종료까지만 유지되는 *transient* buff (boss intro
 * 와 동형 retention). controller instance scope only. persist 안 됨.
 *
 * 카드 = 2 fixed (risk / safe). controller seed 무관 — random sampling 없음.
 * cycle 109 boss intro 의 weighted 3-sample 과 의도적 분리 (realm fork = *결정의
 * 무거움* 강조 → 2 명확한 갈래).
 *
 * effect schema = additive bonus on dropChanceBonus + dampingBonus, multiplicative
 * on atkBonus + agingSpeedMul. 4 channel.
 */

import type { TraitId } from '../cycle/traits';

export type RealmForkCardId = 'risk' | 'safe';

export interface RealmForkEffect {
  /** multiplicative atk delta (+0.20 = +20% atk). 0 = no effect. */
  atkBonus: number;
  /** additive bonus to encounter.setOpts dropChanceBonus (+0.05 = +5 percentage points). */
  dropChanceBonus: number;
  /** additive bonus to encounter.setOpts damping (-0.1 / +0.1).
   *  damping ∈ [0, 1.0], smaller = hero weaker. Risk = -0.1 (enemies harder).
   *  Safe = +0.1 (smoother). Clamp at usage site. */
  dampingBonus: number;
  /** multiplicative tickAge multiplier (+0.05 = aging 5% faster). 0 = no effect. */
  agingSpeedMul: number;
}

export interface RealmForkCard {
  id: RealmForkCardId;
  nameKR: string;
  descKR: string;
  effect: RealmForkEffect;
}

/** Master catalog. 2 fixed cards. */
export const REALM_FORK_CATALOG: { risk: RealmForkCard; safe: RealmForkCard } = {
  risk: {
    id: 'risk',
    nameKR: '위험한 길',
    descKR: '적이 강해진다 (damping −0.1), 그러나 공격력 +20% / 드롭율 +5%p',
    effect: {
      atkBonus: 0.20,
      dropChanceBonus: 0.05,
      dampingBonus: -0.10,
      agingSpeedMul: 0,
    },
  },
  safe: {
    id: 'safe',
    nameKR: '안전한 길',
    descKR: '평탄한 여정 (damping +0.1), 그러나 시간이 5% 더 흐른다',
    effect: {
      atkBonus: 0,
      dropChanceBonus: 0,
      dampingBonus: 0.10,
      agingSpeedMul: 0.05,
    },
  },
};

export function findRealmForkCard(id: RealmForkCardId): RealmForkCard {
  return REALM_FORK_CATALOG[id];
}

/**
 * Cycle 110 F1.동작(4) — trait-based auto-choice for sim driver + 6초 timeout.
 *
 * Mapping:
 *   - heroic-aligned (5): t_challenge, t_thrill, t_berserker, t_boss_hunter, t_zealot
 *   - prudent-aligned (4): t_timid, t_fragile, t_iron, t_miser
 *   - neutral (7): rest
 *
 * Policy:
 *   - heroicCnt > prudentCnt → 'risk'
 *   - prudentCnt > heroicCnt → 'safe'
 *   - tie (incl. 0=0) → 'safe' (보수 default, fate-roll auto-decline 정신)
 *
 * Deterministic — same trait set = same auto-choice. sim-real parity 보장.
 */

const HEROIC_ALIGNED: ReadonlySet<TraitId> = new Set<TraitId>([
  't_challenge',
  't_thrill',
  't_berserker',
  't_boss_hunter',
  't_zealot',
]);

const PRUDENT_ALIGNED: ReadonlySet<TraitId> = new Set<TraitId>([
  't_timid',
  't_fragile',
  't_iron',
  't_miser',
]);

export function computeRealmForkAutoChoice(traits: readonly TraitId[]): RealmForkCardId {
  let heroicCnt = 0;
  let prudentCnt = 0;
  for (const t of traits) {
    if (HEROIC_ALIGNED.has(t)) heroicCnt += 1;
    else if (PRUDENT_ALIGNED.has(t)) prudentCnt += 1;
  }
  if (heroicCnt > prudentCnt) return 'risk';
  return 'safe'; // prudent > heroic OR tie → safe
}

/** Helper for tests + sim driver: 2-card pair from the fixed catalog. */
export function getRealmForkPair(): { risk: RealmForkCard; safe: RealmForkCard } {
  return { risk: REALM_FORK_CATALOG.risk, safe: REALM_FORK_CATALOG.safe };
}
