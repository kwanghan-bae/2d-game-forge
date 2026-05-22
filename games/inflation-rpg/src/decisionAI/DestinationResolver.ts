import type { SeededRng } from '../cycle/SeededRng';
import type { PersonalityState } from '../hero/PersonalityState';
import type { LandmarkKind } from '../data/landmarks';
import type { TraitId } from '../cycle/traits';

export interface LandmarkCandidate {
  id: string;
  kind: LandmarkKind;
  difficulty: number;
}

export interface DecisionContext {
  traits: readonly TraitId[];
  personality: PersonalityState;
}

const WEIGHT_BASE: Record<LandmarkKind, number> = {
  enemy:        10,
  boss:          3,
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
};

export class DestinationResolver {
  constructor(private readonly rng: SeededRng) {}

  choose(candidates: readonly LandmarkCandidate[], ctx: DecisionContext): LandmarkCandidate | null {
    if (candidates.length === 0) return null;

    const personality = ctx.personality;
    const heroic = personality.get('heroic');
    const pious = personality.get('pious');
    const prudent = personality.get('prudent');

    const weighted = candidates.map(c => {
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
