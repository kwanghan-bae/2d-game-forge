// 5-dim personality matrix. Each dim is integer in [-10, +10].
// Negative side ↔ Positive side:
//   moral:     악 ↔ 선
//   prudent:   충동 ↔ 신중
//   heroic:    회피 ↔ 영웅
//   merciful:  잔혹 ↔ 자비
//   pious:     세속 ↔ 신앙

export const PERSONALITY_DIMS = ['moral', 'prudent', 'heroic', 'merciful', 'pious'] as const;
export type PersonalityDim = (typeof PERSONALITY_DIMS)[number];
export type PersonalitySnapshot = Record<PersonalityDim, number>;

const MIN = -10;
const MAX = 10;

export class PersonalityState {
  private values: PersonalitySnapshot = {
    moral: 0,
    prudent: 0,
    heroic: 0,
    merciful: 0,
    pious: 0,
  };

  static fromTraitPriors(priors: Partial<PersonalitySnapshot>): PersonalityState {
    const p = new PersonalityState();
    for (const dim of PERSONALITY_DIMS) {
      if (priors[dim] !== undefined) p.values[dim] = clamp(priors[dim] as number);
    }
    return p;
  }

  get(dim: PersonalityDim): number {
    return this.values[dim];
  }

  adjust(dim: PersonalityDim, delta: number): void {
    this.values[dim] = clamp(this.values[dim] + delta);
  }

  snapshot(): PersonalitySnapshot {
    return { ...this.values };
  }
}

function clamp(v: number): number {
  return Math.max(MIN, Math.min(MAX, Math.floor(v)));
}
