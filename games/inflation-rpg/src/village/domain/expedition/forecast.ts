import { getVillageRealmDefinition } from '../../data';
import { createVillageHeroRuntime } from '../../heroRuntime';
import type {
  BattleResult,
  ExpeditionForecast,
  RealmId,
  SupportAgentId,
  VillageSaveEnvelope,
} from '../../types';
import { getVillageHeroPower } from '../hero/progression';
import { MAX_ECONOMY_VALUE, positiveFiniteLevel } from '../shared/guards';

const SUCCESS_BASE_BY_TIER = { normal: 0.92, elite: 0.72, boss: 0.55 } as const;

function clampSuccessChance(value: number): number {
  return Number.isFinite(value) ? Math.min(0.97, Math.max(0.05, value)) : 0.05;
}

export function getExpeditionSuccessChance(
  source: VillageSaveEnvelope,
  realmId: RealmId,
  encounterIndex = 2,
  assignedAgentId: SupportAgentId | null = null,
): number {
  const realm = getVillageRealmDefinition(realmId);
  const encounter = realm?.encounters[Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(encounterIndex)))];
  if (!realm || !encounter) return 0.05;

  const readiness = getVillageHeroPower(source) / Math.max(1, encounter.recommendedPower);
  const readinessBonus = Math.max(-0.35, Math.min(0.2, (readiness - 1) * 0.3));
  const guide = assignedAgentId === 'guide' ? source.meta.agents.find((agent) => agent.id === 'guide') : undefined;
  const guideIsAssignedToThisExpedition = Boolean(
    guide?.activeTaskId
      && source.run.expedition?.id === guide.activeTaskId
      && source.run.expedition.realmId === realmId
      && source.run.expedition.assignedAgentId === 'guide',
  );
  const guideIsAvailable = Boolean(
    guide
      && guide.fatigue < 100
      && (!guide.activeTaskId || guideIsAssignedToThisExpedition),
  );
  const guideTrust = guide && typeof guide.trust === 'number' && Number.isFinite(guide.trust)
    ? Math.max(0, guide.trust)
    : 0;
  const guideBonus = guideIsAvailable && guide
    ? Math.min(0.08, guideTrust / 1_250)
    : 0;
  // Once an expedition has departed, its policy is part of the immutable run
  // snapshot. The town policy can be changed for the next departure without
  // rewriting the battle forecast of the hero who is already travelling.
  const expeditionPolicy = source.run.expedition?.realmId === realmId
    ? source.run.expedition.policy
    : source.run.policy;
  const policyBonus = expeditionPolicy === 'hoarding'
    ? 0.04
    : expeditionPolicy === 'training'
      ? (encounter.tier === 'boss' ? -0.02 : 0.02)
      : 0;
  const mudangLevel = positiveFiniteLevel(source.meta.facilities.mudang?.level);
  const mudangBlessing = Math.min(0.06, Math.max(0, mudangLevel - 1) * 0.02);
  const heroHpMax = typeof source.run.hero.hpMax === 'number'
    && Number.isFinite(source.run.hero.hpMax)
    && source.run.hero.hpMax > 0
    ? Math.min(MAX_ECONOMY_VALUE, source.run.hero.hpMax)
    : 1;
  const heroHp = typeof source.run.hero.hp === 'number' && Number.isFinite(source.run.hero.hp)
    ? Math.min(heroHpMax, Math.max(0, source.run.hero.hp))
    : 0;
  const healthPenalty = heroHp / heroHpMax < 0.35 ? 0.15 : 0;
  return clampSuccessChance(
    SUCCESS_BASE_BY_TIER[encounter.tier] + readinessBonus + guideBonus + policyBonus
      + mudangBlessing - encounter.risk * 0.05 - healthPenalty,
  );
}

function emptyBattleResult(): BattleResult {
  return {
    won: false,
    turns: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    heroRemainingHp: 0,
  };
}

/**
 * Builds the player-facing and settlement-facing forecast from one battle
 * calculation. A deterministic battle loss is never presented as a
 * probabilistic chance to win, even when the policy formula would otherwise
 * produce a non-zero value.
 */
export function getExpeditionForecast(
  source: VillageSaveEnvelope,
  realmId: RealmId,
  encounterIndex = 2,
  assignedAgentId: SupportAgentId | null = null,
  expeditionId?: string,
): ExpeditionForecast {
  const realm = getVillageRealmDefinition(realmId);
  const normalizedIndex = realm
    ? Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(encounterIndex)))
    : 0;
  const encounter = realm?.encounters[normalizedIndex];
  if (!realm || !encounter) {
    return {
      realmId,
      encounterIndex: normalizedIndex,
      battle: emptyBattleResult(),
      successChance: 0,
      soloSuccessChance: 0,
      guideSuccessChance: 0,
      roll: 1,
    };
  }

  const battle = createVillageHeroRuntime(source.run.hero).resolveBattle({
    heroAtk: source.run.hero.atk,
    heroDef: source.run.hero.def,
    heroHp: source.run.hero.hp,
    enemyHp: encounter.recommendedPower * encounter.enemyHpMultiplier,
    enemyAtk: encounter.recommendedPower * encounter.enemyAtkMultiplier,
  });
  const soloSuccessChance = battle.won
    ? getExpeditionSuccessChance(source, realmId, normalizedIndex, null)
    : 0;
  const guideSuccessChance = battle.won
    ? getExpeditionSuccessChance(source, realmId, normalizedIndex, 'guide')
    : 0;
  const successChance = assignedAgentId === 'guide' ? guideSuccessChance : soloSuccessChance;
  const rollKey = expeditionId ?? source.run.expedition?.id ?? `forecast:${realmId}:${normalizedIndex}`;
  return {
    realmId,
    encounterIndex: normalizedIndex,
    battle,
    successChance,
    soloSuccessChance,
    guideSuccessChance,
    roll: deterministicRoll(`${rollKey}:${encounter.id}`),
  };
}

export function getNextRealmId(realmId: RealmId): RealmId | null {
  return realmId === 'sacred_fields' ? 'deep_forest' : realmId === 'deep_forest' ? 'underworld' : null;
}

function deterministicRoll(key: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

export function expeditionDurationSeconds(
  save: VillageSaveEnvelope,
  baseDurationSeconds: number,
  hasGuide: boolean,
): number {
  const expeditionFacilityLevel = save.meta.facilities.expedition?.level ?? 1;
  return Math.max(1, Math.round(
    baseDurationSeconds * Math.pow(0.94, expeditionFacilityLevel - 1) * (hasGuide ? 0.9 : 1),
  ));
}
