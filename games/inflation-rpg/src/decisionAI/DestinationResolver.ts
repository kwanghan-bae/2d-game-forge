import type { SeededRng } from '../cycle/SeededRng';
import type { PersonalityState } from '../hero/PersonalityState';
import type { LandmarkKind } from '../data/landmarks';
import type { TraitId } from '../cycle/traits';
import { findRealm } from '../data/realms';
import type { RealmId } from '../types';

export interface LandmarkCandidate {
  id: string;
  kind: LandmarkKind;
  difficulty: number;
}

export interface DecisionContext {
  traits: readonly TraitId[];
  personality: PersonalityState;
  currentRealm?: RealmId;
  unlockedRealms?: readonly RealmId[];
}

const WEIGHT_BASE: Record<LandmarkKind, number> = {
  enemy:        10,
  // Cycle 23 (cycle 10 P1 carry-over) — boss 3 → 5: short-timeframe UX. dev 2-4분 idle 시 sea+ 도달률 ↑.
  boss:          5,
  shrine:        4,
  cave:          3,
  village:       5,
  market:        3,
  ruin:          3,
  exit:          2,
  rival:         2,
  // V1c-1: personality drift 인카운터 랜드마크
  watchtower:    3,
  treasure_cave: 3,
  holy_ruin:     3,
  crossroads:    3,
  // V3-H F3/F5: 절경 + 시련
  sightseeing:   4,
  trial:         2,
};

export class DestinationResolver {
  constructor(private readonly rng: SeededRng) {}

  choose(candidates: readonly LandmarkCandidate[], ctx: DecisionContext): LandmarkCandidate | null {
    if (candidates.length === 0) return null;

    // Filter out 'exit' landmarks when the next realm is not yet unlocked.
    let filtered: readonly LandmarkCandidate[] = candidates;
    if (ctx.currentRealm && ctx.unlockedRealms) {
      const realm = findRealm(ctx.currentRealm);
      filtered = candidates.filter(c => {
        if (c.kind !== 'exit') return true;
        if (!realm.nextRealm) return false;
        return ctx.unlockedRealms!.includes(realm.nextRealm);
      });
      // If filtering removed all candidates, fall back to unfiltered list.
      if (filtered.length === 0) filtered = candidates;
    }

    const personality = ctx.personality;
    const heroic = personality.get('heroic');
    const pious = personality.get('pious');
    const prudent = personality.get('prudent');

    // Cycle 284 — Sub-phase α T1: trait wire 활성.
    // Cycle 285 — α T2: 추가 5 trait (timid/thrill/genius/miser/fortune).
    const hasTrait = (id: TraitId): boolean => ctx.traits.includes(id);
    const t_challenge = hasTrait('t_challenge');
    const t_boss_hunter = hasTrait('t_boss_hunter');
    const t_zealot = hasTrait('t_zealot');
    const t_swift = hasTrait('t_swift');
    const t_explorer = hasTrait('t_explorer');
    const t_timid = hasTrait('t_timid');
    const t_thrill = hasTrait('t_thrill');
    const t_miser = hasTrait('t_miser');
    const t_fortune = hasTrait('t_fortune');
    const t_fragile = hasTrait('t_fragile');
    // Cycle 286 — α T3: 남은 6 trait wire (berserker/iron/prodigy/lucky/genius/terminal_genius).
    const t_berserker = hasTrait('t_berserker');
    const t_iron = hasTrait('t_iron');
    const t_prodigy = hasTrait('t_prodigy');
    const t_lucky = hasTrait('t_lucky');
    const t_genius = hasTrait('t_genius');
    const t_terminal_genius = hasTrait('t_terminal_genius');

    const weighted = filtered.map(c => {
      let w = WEIGHT_BASE[c.kind] ?? 1;
      if (c.kind === 'boss')          w += heroic * 1.5;
      if (c.kind === 'enemy')         w += heroic * 0.3;
      if (c.kind === 'shrine')        w += pious * 1.5;
      if (c.kind === 'village')       w += prudent * 0.8;
      if (c.kind === 'cave')          w += (heroic - prudent) * 0.4;
      // V1c-1: personality drift 가중치 (base 3 이 floor 역할)
      if (c.kind === 'watchtower')    w += heroic * 0.8;
      if (c.kind === 'treasure_cave') w += prudent * 0.8;
      if (c.kind === 'holy_ruin')     w += pious * 0.8;
      // crossroads: moral drift → base weight 만 (moral 은 +/- 다 valid)
      // Cycle 284 — trait wire (multiplicative on landmark kind).
      if (c.kind === 'boss'  && t_challenge)   w *= 1.3;
      if (c.kind === 'boss'  && t_boss_hunter) w *= 1.5;
      if (c.kind === 'enemy' && t_challenge)   w *= 1.2;
      if (c.kind === 'shrine' && t_zealot)     w *= 1.4;
      if (c.kind === 'exit'  && t_swift)       w *= 1.4;
      if ((c.kind === 'cave' || c.kind === 'treasure_cave' || c.kind === 'holy_ruin' || c.kind === 'ruin') && t_explorer) w *= 1.3;
      // Cycle 285 — α T2: 5 추가 trait wire.
      if (c.kind === 'boss'  && t_timid)       w *= 0.6;  // 겁쟁이: 보스 회피
      if (c.kind === 'village' && t_timid)     w *= 1.3;  // 겁쟁이: 마을 선호
      if (c.kind === 'boss'  && t_thrill)      w *= 1.4;  // 스릴 추구
      if (c.kind === 'shrine' && t_thrill)     w *= 0.7;  // 스릴 추구: 안식 회피
      if (c.kind === 'market' && t_miser)      w *= 1.5;  // 구두쇠: 시장 선호
      if (c.kind === 'treasure_cave' && t_fortune) w *= 1.6;  // 행운: 보물 동굴
      if (c.kind === 'boss'  && t_fragile)     w *= 0.5;  // 약체: 보스 강한 회피
      if (c.kind === 'shrine' && t_fragile)    w *= 1.4;  // 약체: shrine 회복
      // Cycle 286 — α T3: 6 추가 trait wire (16/16 production-consumed).
      if (c.kind === 'enemy' && t_berserker)   w *= 1.3;  // 광전사: 일반 적
      if (c.kind === 'boss'  && t_berserker)   w *= 1.2;  // 광전사: 보스 동등 선호
      if (c.kind === 'trial' && t_iron)        w *= 1.5;  // 강철: 시련 선호
      if (c.kind === 'shrine' && t_prodigy)    w *= 1.3;  // 천재: shrine 배움
      if (c.kind === 'treasure_cave' && t_lucky) w *= 1.4;  // 행운형 (t_fortune 외 lucky)
      if (c.kind === 'cave' && t_lucky)        w *= 1.3;  // 행운: cave 보너스
      if (c.kind === 'holy_ruin' && t_genius)  w *= 1.4;  // 천재: 고대 지혜
      if (c.kind === 'sightseeing' && t_genius) w *= 1.3; // 천재: 관찰
      if (c.kind === 'holy_ruin' && t_terminal_genius) w *= 1.6; // 말기 천재: 강한 boost
      if (c.kind === 'shrine' && t_terminal_genius) w *= 1.4;
      return { candidate: c, weight: Math.max(0.1, w) };
    });

    const totalW = weighted.reduce((a, b) => a + b.weight, 0);
    let r = this.rng.next() * totalW;
    for (const item of weighted) {
      r -= item.weight;
      if (r <= 0) return item.candidate;
    }
    return weighted[weighted.length - 1]!.candidate;
  }
}
