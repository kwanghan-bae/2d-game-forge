import type { HeroEntity } from '../hero/HeroEntity';
import type { TraitId } from '../cycle/traits';
import { SeededRng } from '../cycle/SeededRng';
import { DestinationResolver, type LandmarkCandidate } from './DestinationResolver';
import type { RealmId } from '../types';

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

  chooseDestination(
    candidates: readonly LandmarkCandidate[],
    extras?: { currentRealm?: RealmId; unlockedRealms?: readonly RealmId[] },
  ): LandmarkCandidate | null {
    return this.resolver.choose(candidates, {
      traits: this.opts.traits,
      personality: this.hero.personality,
      currentRealm: extras?.currentRealm,
      unlockedRealms: extras?.unlockedRealms,
    });
  }

  /**
   * Cycle 301 — Sub-phase γ T1: shouldRetreat method 신설.
   * HP / 다음 arrival 의 회복 가능성 판단. v0 heuristic:
   *   - HP ratio < 0.2 → 항상 retreat
   *   - HP ratio < 0.4 + enemyDifficulty > heroLevel → retreat
   *   - else → no retreat
   *
   * Caller wire 는 cycle 302+ carry-over.
   * 본 method = HeroDecisionAI 의 *third 책임* production-consumed.
   */
  shouldRetreat(ctx: { hpRatio: number; enemyDifficulty: number; heroLevel: number }): boolean {
    if (ctx.hpRatio < 0.2) return true;
    if (ctx.hpRatio < 0.4 && ctx.enemyDifficulty > ctx.heroLevel) return true;
    return false;
  }

  /**
   * Cycle 295 — Sub-phase β T1: chooseSkillId method 신설.
   * available skill ID 목록 + hero context 받아 사용할 skill 결정.
   * v0 heuristic:
   *   - HP < 0.4 + heal/bless 사용 가능 → 우선 선택
   *   - boss target + divine_judgment / execute 사용 가능 → 우선 선택
   *   - else: 가장 첫 available (random 아님, deterministic)
   *
   * Caller (EncounterEngine) 의 wire 는 cycle 296+ carry-over.
   * 본 method 자체는 production-consumed (HeroDecisionAI 의 second 책임).
   */
  chooseSkillId(
    availableSkills: readonly string[],
    ctx: { hpRatio: number; isBossTarget: boolean },
  ): string | null {
    if (availableSkills.length === 0) return null;
    // HP critical → heal/bless 우선
    if (ctx.hpRatio < 0.4) {
      const healSkill = availableSkills.find(s => s === 'heal' || s === 'bless');
      if (healSkill) return healSkill;
    }
    // Boss target → execute 류 우선
    if (ctx.isBossTarget) {
      const execSkill = availableSkills.find(s => s === 'divine_judgment' || s === 'cleave' || s === 'fireball');
      if (execSkill) return execSkill;
    }
    // Default: 첫 available (deterministic)
    return availableSkills[0] ?? null;
  }
}
