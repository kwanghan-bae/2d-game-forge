import type { HeroEntity } from '../hero/HeroEntity';
import type { TraitId } from '../cycle/traits';
import { SeededRng } from '../cycle/SeededRng';
import { DestinationResolver, type LandmarkCandidate } from './DestinationResolver';

export interface HeroDecisionAIOpts {
  seed: number;
  traits: readonly TraitId[];
}

export class HeroDecisionAI {
  private resolver: DestinationResolver;

  constructor(
    private readonly hero: HeroEntity,
    private readonly opts: HeroDecisionAIOpts,
  ) {
    this.resolver = new DestinationResolver(new SeededRng(opts.seed));
  }

  chooseDestination(candidates: readonly LandmarkCandidate[]): LandmarkCandidate | null {
    return this.resolver.choose(candidates, {
      traits: this.opts.traits,
      personality: this.hero.personality,
    });
  }
}
