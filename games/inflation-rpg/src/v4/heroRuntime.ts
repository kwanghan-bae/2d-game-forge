import { HeroDecisionAI } from '../cycle/HeroDecisionAI';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import type {
  BattleInput,
  BattleResult,
  HeroAction,
  HeroDecisionContext,
  RejuvenationResult,
  V4HeroRuntime,
  V4HeroSnapshot,
} from './types';

function cloneSnapshot(snapshot: V4HeroSnapshot): V4HeroSnapshot {
  return {
    ...snapshot,
    equipmentIds: [...snapshot.equipmentIds],
    equipmentLevels: snapshot.equipmentLevels ? { ...snapshot.equipmentLevels } : undefined,
  };
}

/**
 * V4 boundary around the V3 pure hero decisions/lifecycle rules.
 * It deliberately does not import CycleControllerV2 or mutate the V3 store.
 */
export function createV4HeroRuntime(source: V4HeroSnapshot): V4HeroRuntime {
  let snapshot = cloneSnapshot(source);
  const decisionAI = new HeroDecisionAI([]);

  return {
    getSnapshot: () => cloneSnapshot(snapshot),

    chooseAction(context: HeroDecisionContext): HeroAction {
      if (context.hpMax > 0 && context.hp / context.hpMax < 0.35) return 'rest';
      if (context.policy === 'aggression' && context.expeditionAvailable) return 'expedition';
      if (context.policy === 'training') return 'train';
      // Call the V3 pure AI boundary for the safe/default branch. The V3 AI
      // currently returns the first available node, which maps to resting in
      // the V4 town loop.
      decisionAI.chooseEncounterNode([]);
      return 'rest';
    },

    resolveBattle(input: BattleInput): BattleResult {
      let heroHp = Math.max(0, input.heroHp);
      let enemyHp = Math.max(0, input.enemyHp);
      let turns = 0;
      let totalDamageDealt = 0;
      let totalDamageTaken = 0;
      const maxTurns = input.maxTurns ?? 100;

      while (heroHp > 0 && enemyHp > 0 && turns < maxTurns) {
        turns += 1;
        const dealt = Math.max(1, Math.floor(input.heroAtk));
        enemyHp = Math.max(0, enemyHp - dealt);
        totalDamageDealt += dealt;
        if (enemyHp <= 0) break;
        const taken = Math.max(1, Math.floor(input.enemyAtk - input.heroDef));
        heroHp = Math.max(0, heroHp - taken);
        totalDamageTaken += taken;
      }

      return {
        won: enemyHp <= 0,
        turns,
        totalDamageDealt,
        totalDamageTaken,
        heroRemainingHp: heroHp,
      };
    },

    rejuvenate(years: number): RejuvenationResult {
      const safeYears = Math.max(0, Math.floor(years));
      const beforeAge = snapshot.age;
      const nextAge = Math.max(5, beforeAge - safeYears);
      snapshot = {
        ...snapshot,
        age: nextAge,
        actionCount: HeroLifecycle.actionsForAge(nextAge),
        rejuvenationCount: snapshot.rejuvenationCount + (safeYears > 0 ? 1 : 0),
        hp: snapshot.hpMax,
      };
      return {
        snapshot: cloneSnapshot(snapshot),
        yearsReduced: beforeAge - nextAge,
        cost: (beforeAge - nextAge) * 10,
      };
    },
  };
}
