import { HeroDecisionAI } from '../cycle/HeroDecisionAI';
import { HeroLifecycle } from '../hero/HeroLifecycle';
import { resolveDamageTaken, resolvePlayerHit } from '../battle/resolver';
import type {
  BattleInput,
  BattleResult,
  HeroAction,
  HeroDecisionContext,
  RejuvenationResult,
  VillageHeroRuntime,
  VillageHeroSnapshot,
} from './types';

const MAX_BATTLE_VALUE = Number.MAX_SAFE_INTEGER;
const MAX_BATTLE_TURNS = 100;

function cloneSnapshot(snapshot: VillageHeroSnapshot): VillageHeroSnapshot {
  const equipmentIds = Array.isArray(snapshot.equipmentIds)
    ? snapshot.equipmentIds.filter((id): id is string => typeof id === 'string')
    : [];
  const equipmentLevels = snapshot.equipmentLevels
    && typeof snapshot.equipmentLevels === 'object'
    && !Array.isArray(snapshot.equipmentLevels)
    ? Object.fromEntries(
      Object.entries(snapshot.equipmentLevels)
        .filter(([, level]) => typeof level === 'number' && Number.isFinite(level)),
    )
    : undefined;
  return {
    ...snapshot,
    equipmentIds,
    equipmentLevels,
  };
}

function deterministicRoll(key: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function defenseReduction(defense: number): number {
  const safeDefense = Math.max(0, defense);
  return Math.min(0.9, safeDefense / (safeDefense + 100));
}

function nonNegativeFinite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_BATTLE_VALUE, Math.max(0, value))
    : fallback;
}

function positiveFinite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(MAX_BATTLE_VALUE, value)
    : fallback;
}

function safeActionCountForAge(age: number): number {
  const derived = HeroLifecycle.actionsForAge(age);
  return Number.isFinite(derived)
    ? Math.min(MAX_BATTLE_VALUE, Math.max(0, Math.floor(derived)))
    : MAX_BATTLE_VALUE;
}

function safeRejuvenationCost(yearsReduced: number): number {
  if (!Number.isFinite(yearsReduced) || yearsReduced <= 0) return 0;
  const cost = yearsReduced * 10;
  return Number.isFinite(cost)
    ? Math.min(MAX_BATTLE_VALUE, Math.max(0, Math.floor(cost)))
    : MAX_BATTLE_VALUE;
}

function addBattleDamage(total: number, amount: number): number {
  return Math.min(MAX_BATTLE_VALUE, total + amount);
}

/**
 * Village boundary around the legacy pure hero decisions/lifecycle rules.
 * It deliberately does not import CycleControllerV2 or mutate the legacy store.
 */
export function createVillageHeroRuntime(source: VillageHeroSnapshot): VillageHeroRuntime {
  let snapshot = cloneSnapshot(source);
  const decisionAI = new HeroDecisionAI([]);

  return {
    getSnapshot: () => cloneSnapshot(snapshot),

    chooseAction(context: HeroDecisionContext): HeroAction {
      if (context.hpMax > 0 && context.hp / context.hpMax < 0.35) return 'rest';
      if (context.policy === 'aggression' && context.expeditionAvailable) return 'expedition';
      if (context.policy === 'hoarding' && context.expeditionAvailable) return 'expedition';
      if (context.policy === 'training') return 'train';
      // Call the legacy pure AI boundary for the safe/default branch. The legacy AI
      // currently returns the first available node, which maps to resting in
      // the Village town loop.
      decisionAI.chooseEncounterNode([]);
      return 'rest';
    },

    resolveBattle(input: BattleInput): BattleResult {
      let heroHp = nonNegativeFinite(input.heroHp, 0);
      let enemyHp = nonNegativeFinite(input.enemyHp, 1);
      let turns = 0;
      let totalDamageDealt = 0;
      let totalDamageTaken = 0;
      const heroAtk = nonNegativeFinite(input.heroAtk, 0);
      const heroDef = nonNegativeFinite(input.heroDef, 0);
      const enemyAtk = nonNegativeFinite(input.enemyAtk, 0);
      const maxTurns = typeof input.maxTurns === 'number' && Number.isFinite(input.maxTurns)
        ? Math.min(MAX_BATTLE_TURNS, Math.max(0, Math.floor(input.maxTurns)))
        : MAX_BATTLE_TURNS;

      while (heroHp > 0 && enemyHp > 0 && turns < maxTurns) {
        turns += 1;
        const turnKey = `${snapshot.name}:${snapshot.age}:${turns}:${heroAtk}:${enemyHp}`;
        const critChance = Math.max(0, Math.min(1, nonNegativeFinite(snapshot.critRateBase, 0.05)));
        const dealt = Math.min(MAX_BATTLE_VALUE, Math.max(1, nonNegativeFinite(resolvePlayerHit({
          playerATK: heroAtk,
          crit: deterministicRoll(`${turnKey}:crit`) < critChance,
          rngRoll: deterministicRoll(`${turnKey}:damage`),
        }), 1)));
        enemyHp = Math.max(0, enemyHp - dealt);
        totalDamageDealt = addBattleDamage(totalDamageDealt, dealt);
        if (enemyHp <= 0) break;
        const taken = Math.min(MAX_BATTLE_VALUE, Math.max(1, nonNegativeFinite(resolveDamageTaken({
          enemyATK: enemyAtk,
          reduction: defenseReduction(heroDef),
        }), 1)));
        heroHp = Math.max(0, heroHp - taken);
        totalDamageTaken = addBattleDamage(totalDamageTaken, taken);
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
      const safeYears = typeof years === 'number' && Number.isFinite(years)
        ? Math.max(0, Math.floor(years))
        : 0;
      const beforeAge = typeof snapshot.age === 'number'
        && Number.isFinite(snapshot.age)
        && Number.isInteger(snapshot.age)
        && snapshot.age >= 5
        ? Math.min(MAX_BATTLE_VALUE, snapshot.age)
        : 17;
      const currentRejuvenationCount = typeof snapshot.rejuvenationCount === 'number'
        && Number.isFinite(snapshot.rejuvenationCount)
        && Number.isInteger(snapshot.rejuvenationCount)
        && snapshot.rejuvenationCount >= 0
        ? Math.min(MAX_BATTLE_VALUE, snapshot.rejuvenationCount)
        : 0;
      const safeHpMax = positiveFinite(snapshot.hpMax, 1_000);
      const nextAge = Math.max(5, beforeAge - safeYears);
      snapshot = {
        ...snapshot,
        age: nextAge,
        actionCount: safeActionCountForAge(nextAge),
        rejuvenationCount: Math.min(MAX_BATTLE_VALUE, currentRejuvenationCount + (safeYears > 0 ? 1 : 0)),
        hpMax: safeHpMax,
        hp: safeHpMax,
      };
      return {
        snapshot: cloneSnapshot(snapshot),
        yearsReduced: beforeAge - nextAge,
        cost: safeRejuvenationCost(beforeAge - nextAge),
      };
    },
  };
}
