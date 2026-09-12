import {
  getVillageFacilityDefinition,
  getVillageRealmDefinition,
  REALM_DEFINITIONS,
} from './data';
import { Village_HERO_AUTONOMY_DELAY_MS, Village_MAX_INTERVENTION_CHARGES } from './types';
import { applyVillageEquipmentBonuses, getVillageEquipmentBonuses, getVillageEquipmentDefinition } from './equipment';
import { createVillageHeroRuntime } from './heroRuntime';
import {
  applyAgentTrustGain,
  chooseStoryChoice as chooseStoryChoiceEntry,
  getAvailableStoryChoice,
  getRealmIntroEntry,
  getRealmVictoryEntry,
  getVillageEpilogueEntry,
  hasVillageEpilogue,
} from './story';
import type {
  FacilityId,
  BattleResult,
  ExpeditionForecast,
  ExpeditionResult,
  HeroAutonomyDecision,
  HeroAutonomyReason,
  HeroAutonomyResult,
  InterventionType,
  RealmId,
  SupportAgentId,
  VillageCurrencyKey,
  VillagePolicy,
  VillageSaveEnvelope,
  VillageSettings,
  StoryChoiceOptionId,
} from './types';

import type {
  DomainResult,
  InterventionDomainResult,
} from './domain/contracts';
import { getBlacksmithEquipmentRecommendation } from './domain/facility/preview';
import { startFacilityTask } from './domain/facility/tasks';
import { advanceHeroActionsInPlace } from './domain/hero/autonomy';
import { getVillageHeroPower, saturatingAdd } from './domain/hero/progression';
import {
  MAX_ECONOMY_VALUE,
  isActionClockValid,
  isPersistableClock,
  isPersistableFiniteNumber,
  isValidAgentState,
  isValidCompletionWindow,
  isValidCurrencyBalance,
  isVillagePolicy,
  positiveFiniteLevel,
  safeCompletionTimestamp,
} from './domain/shared/guards';
import { nextSaveId } from './domain/shared/ids';
import {
  canApplyCurrencyOutput,
  canPay,
  give,
  pay,
  safeScaledEconomyAmount,
} from './domain/shared/resourceMath';
import {
  addUniqueStoryEntry,
  cloneSave,
  eventTimestamp,
  syncHeroAction,
  touchSave,
} from './domain/shared/saveMutation';

export {
  AGENT_REST_RECOVERY,
  MAX_INTERVENTION_CHARGES,
} from './domain/contracts';
export type {
  AgentDomainResult,
  DomainResult,
  FacilityTaskPreview,
  FacilityUpgradeCost,
  HeroDomainResult,
  InterventionDomainResult,
} from './domain/contracts';

export {
  advanceHeroActions,
  getHeroNextAction,
} from './domain/hero/autonomy';
export { getVillageHeroPower, rejuvenateHero } from './domain/hero/progression';
export {
  getBlacksmithEquipmentOutput,
  getBlacksmithEquipmentRecommendation,
  getFacilityTaskPreview,
} from './domain/facility/preview';
export { cancelFacilityTask, restAgent, startFacilityTask } from './domain/facility/tasks';
export { getFacilityUpgradeCost, upgradeFacility } from './domain/facility/upgrade';

export { getAvailableStoryChoice, hasVillageEpilogue } from './story';

const MAX_HERO_EXP_SETTLEMENT = 100_000;
const MAX_LEVELS_PER_SETTLEMENT = 1_000;

function saturatingCounterAdd(value: number | undefined, amount: number, cap = MAX_ECONOMY_VALUE): number {
  const base = Number.isFinite(value) && (value ?? 0) >= 0
    ? Math.min(cap, Math.floor(value ?? 0))
    : 0;
  const increment = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  return Math.min(cap, base + increment);
}

function isInterventionType(value: unknown): value is InterventionType {
  return value === 'heal' || value === 'retreat';
}

function isValidInterventionCharges(value: number): boolean {
  return Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= Village_MAX_INTERVENTION_CHARGES;
}

function normalizeSettlementEfficiency(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function scaleResources(
  output: Partial<Record<VillageCurrencyKey, number>>,
  multiplier: number,
): Partial<Record<VillageCurrencyKey, number>> {
  return Object.fromEntries(
    Object.entries(output).map(([key, value]) => [key, safeScaledEconomyAmount(value, multiplier)]),
  ) as Partial<Record<VillageCurrencyKey, number>>;
}

function blockedAutonomyDecision(reason: HeroAutonomyReason): HeroAutonomyDecision {
  return {
    action: 'rest',
    facilityId: null,
    realmId: null,
    assignedAgentId: null,
    reason,
  };
}

function getAutonomyRealmId(source: VillageSaveEnvelope, policy: VillagePolicy): RealmId | null {
  const unlocked = Object.values(REALM_DEFINITIONS).filter((realm) => source.meta.unlockedRealms.includes(realm.id));
  if (unlocked.length === 0) return null;
  if (policy === 'aggression') return unlocked[unlocked.length - 1]?.id ?? null;
  return unlocked.reduce((safest, realm) => realm.risk < safest.risk ? realm : safest, unlocked[0]).id;
}

/** Selects the one action the autonomous hero may start after the grace period. */
export function decideHeroAction(source: VillageSaveEnvelope): HeroAutonomyDecision {
  if (source.run.expedition) {
    return blockedAutonomyDecision('active_expedition');
  }
  if (source.run.lastExpeditionResult) {
    const nextRealm = source.run.lastExpeditionResult.outcome === 'victory'
      ? getNextRealmId(source.run.lastExpeditionResult.realmId)
      : null;
    return blockedAutonomyDecision(nextRealm && !source.meta.unlockedRealms.includes(nextRealm)
      ? 'realm_confirmation'
      : 'result_confirmation');
  }
  if (Object.keys(source.meta.tasks).length > 0) {
    return blockedAutonomyDecision('active_work');
  }

  const hero = source.run.hero;
  if (hero.hpMax > 0 && hero.hp / hero.hpMax < 0.35) {
    return {
      action: 'rest',
      facilityId: 'recovery',
      realmId: null,
      assignedAgentId: null,
      reason: 'low_hp',
    };
  }
  if (source.run.policy === 'training') {
    return {
      action: 'train',
      facilityId: 'training',
      realmId: null,
      assignedAgentId: null,
      reason: 'training_policy',
    };
  }

  const realmId = getAutonomyRealmId(source, source.run.policy);
  if (!realmId) return blockedAutonomyDecision('no_action');
  return {
    action: 'expedition',
    facilityId: null,
    realmId,
    assignedAgentId: null,
    reason: source.run.policy === 'aggression' ? 'aggression_policy' : 'hoarding_policy',
  };
}

/**
 * Starts at most one real task or expedition. Every other state is a no-op so
 * an unattended refresh cannot acknowledge results, unlock realms, or spend
 * more than one preparation cost.
 */
export function advanceHeroAutonomy(source: VillageSaveEnvelope, now: number): HeroAutonomyResult {
  if (!Number.isFinite(now) || now < source.updatedAt) {
    return {
      save: source,
      decision: blockedAutonomyDecision('invalid_clock'),
      started: false,
    };
  }
  if (now - source.updatedAt < Village_HERO_AUTONOMY_DELAY_MS) {
    return {
      save: source,
      decision: blockedAutonomyDecision('intervention_window'),
      started: false,
    };
  }

  const decision = decideHeroAction(source);
  if (decision.facilityId) {
    const result = startFacilityTask(source, decision.facilityId, now, decision.assignedAgentId);
    if (result.ok) return { save: result.save, decision, started: true };
    return {
      save: source,
      decision: { ...decision, reason: result.error.includes('부족') ? 'insufficient_resources' : decision.reason },
      started: false,
      error: result.error,
    };
  }
  if (decision.realmId) {
    const result = startExpedition(source, decision.realmId, now, source.run.policy, decision.assignedAgentId);
    if (result.ok) return { save: result.save, decision, started: true };
    return {
      save: source,
      decision: { ...decision, reason: result.error.includes('부족') ? 'insufficient_resources' : decision.reason },
      started: false,
      error: result.error,
    };
  }
  return { save: source, decision, started: false };
}

function applyHeroExperience(save: VillageSaveEnvelope, amount: number): number {
  const hero = save.run.hero;
  hero.level = Number.isFinite(hero.level) && Number.isInteger(hero.level) && hero.level >= 1 ? hero.level : 1;
  const currentExp = Number.isFinite(hero.exp) && hero.exp >= 0
    ? Math.min(MAX_HERO_EXP_SETTLEMENT, hero.exp)
    : 0;
  const safeAmount = Number.isFinite(amount) && amount > 0
    ? Math.min(MAX_HERO_EXP_SETTLEMENT, Math.floor(amount))
    : 0;
  hero.exp = Math.min(MAX_HERO_EXP_SETTLEMENT, currentExp + safeAmount);
  let levelsGained = 0;
  while (hero.exp >= hero.level * 100 && levelsGained < MAX_LEVELS_PER_SETTLEMENT) {
    hero.exp -= hero.level * 100;
    hero.level += 1;
    hero.atk = saturatingAdd(hero.atk, 20);
    hero.def = saturatingAdd(hero.def, 10);
    hero.defBase = saturatingAdd(hero.defBase, 10);
    hero.hpMax = Math.max(1, saturatingAdd(hero.hpMax, 100));
    hero.hp = Math.min(hero.hpMax, saturatingAdd(hero.hp, 100));
    levelsGained += 1;
  }
  if (levelsGained >= MAX_LEVELS_PER_SETTLEMENT) {
    hero.exp = Math.min(hero.exp, Math.max(0, hero.level * 100 - 1));
  }
  return levelsGained;
}

function grantEquipmentLevel(save: VillageSaveEnvelope, equipmentId: string): void {
  if (!getVillageEquipmentDefinition(equipmentId)) return;
  const hero = save.run.hero;
  const equipmentLevels = hero.equipmentLevels;
  const savedLevel = equipmentLevels[equipmentId] ?? 0;
  const currentLevel = Number.isFinite(savedLevel) ? Math.max(0, Math.floor(savedLevel)) : 0;
  if (currentLevel >= 20) return;
  if (!hero.equipmentIds.includes(equipmentId)) hero.equipmentIds.push(equipmentId);
  equipmentLevels[equipmentId] = Math.min(20, currentLevel + 1);
  hero.equipmentLevels = equipmentLevels;
  applyVillageEquipmentBonuses(hero, getVillageEquipmentBonuses([equipmentId], { [equipmentId]: 1 }));
}

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

function expeditionDurationSeconds(save: VillageSaveEnvelope, baseDurationSeconds: number, hasGuide: boolean): number {
  const expeditionFacilityLevel = save.meta.facilities.expedition?.level ?? 1;
  return Math.max(1, Math.round(
    baseDurationSeconds * Math.pow(0.94, expeditionFacilityLevel - 1) * (hasGuide ? 0.9 : 1),
  ));
}

function resolveExpedition(
  save: VillageSaveEnvelope,
  now: number,
  allowPermanentUnlock: boolean,
  efficiency: number,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
): void {
  const eventAt = allowHistoricalSettlement ? now : eventTimestamp(save, now);
  while (save.run.expedition) {
    const expedition = save.run.expedition;
    if (expedition.completesAt > eventAt || expedition.status === 'awaiting_confirmation') return;

    const realm = getVillageRealmDefinition(expedition.realmId);
    if (!realm) return;
    const encounterIndex = Math.min(realm.encounters.length - 1, Math.max(0, Math.floor(expedition.encounterIndex)));
    const encounter = realm.encounters[encounterIndex];
    if (!encounter) return;
    const isBoss = encounter.tier === 'boss';
    if (!allowRiskyBossConfirmation && !allowPermanentUnlock && isBoss) {
      expedition.status = 'awaiting_confirmation';
      return;
    }
    // Preflight the next stage before resolving this encounter. Without this
    // guard, a valid-but-near-ceiling completion time could resolve the battle
    // and then write an unsafe `completesAt` for the next encounter, leaving a
    // save that fails schema validation on the next load.
    const nextEncounter = !isBoss ? realm.encounters[encounterIndex + 1] : undefined;
    const nextCompletionAt = nextEncounter
      ? safeCompletionTimestamp(
        expedition.completesAt,
        expeditionDurationSeconds(save, nextEncounter.durationSeconds, expedition.assignedAgentId === 'guide'),
      )
      : null;
    if (nextEncounter && nextCompletionAt === null) return;

    const guide = expedition.assignedAgentId === 'guide' ? save.meta.agents.find((agent) => agent.id === 'guide') : undefined;
    const forecast = getExpeditionForecast(
      save,
      expedition.realmId,
      encounterIndex,
      expedition.assignedAgentId,
      expedition.id,
    );
    const battle = forecast.battle;
    // One resolved encounter represents one meaningful hero action. Keeping
    // the clock at encounter granularity makes aging predictable and keeps it
    // independent from the number of turns inside the battle loop.
    advanceHeroActionsInPlace(save, 1, eventAt);
    const heroPower = getVillageHeroPower(save);
    const successChance = forecast.successChance;
    const won = battle.won && forecast.roll < successChance;
    save.run.hero.hp = battle.heroRemainingHp;
    if (won) expedition.encountersCleared = saturatingCounterAdd(expedition.encountersCleared, 1, 3);
    expedition.totalTurns = saturatingCounterAdd(expedition.totalTurns, battle.turns);
    expedition.totalDamageDealt = saturatingCounterAdd(expedition.totalDamageDealt, battle.totalDamageDealt);
    expedition.totalDamageTaken = saturatingCounterAdd(expedition.totalDamageTaken, battle.totalDamageTaken);

    if (won && !isBoss) {
      if (!nextEncounter || nextCompletionAt === null) return;
      expedition.encounterIndex = encounterIndex + 1;
      expedition.startedAt = expedition.completesAt;
      expedition.completesAt = nextCompletionAt;
      continue;
    }

    const policyBonus = expedition.policy === 'aggression' ? 1.1 : expedition.policy === 'hoarding' ? 0.9 : 1;
    const reward = won ? scaleResources(realm.reward, policyBonus * efficiency) : {};
    const totalTurns = expedition.totalTurns;
    const totalDamageDealt = expedition.totalDamageDealt;
    const totalDamageTaken = expedition.totalDamageTaken;
    const encountersCleared = expedition.encountersCleared;
    const totalEncounterCount = realm.encounters.length;
    const lowHp = save.run.hero.hpMax > 0 && save.run.hero.hp / save.run.hero.hpMax < 0.35;
    const recommendedFacilityId = lowHp
      ? 'recovery'
      : heroPower < encounter.recommendedPower
        ? 'training'
        : 'blacksmith';
    const expeditionResult: ExpeditionResult = {
      id: expedition.id,
      realmId: expedition.realmId,
      outcome: won ? 'victory' : 'defeat',
      completedAt: eventAt,
      reward,
      heroPower,
      recommendedPower: encounter.recommendedPower,
      turns: totalTurns,
      totalDamageDealt,
      totalDamageTaken,
      heroRemainingHp: battle.heroRemainingHp,
      weaknessKR: won
        ? '다음 영역에 도전하려면 장비와 지원 에이전트를 함께 점검하세요.'
        : lowHp
          ? '영웅의 HP가 부족했습니다. 회복당에서 먼저 회복하세요.'
          : heroPower < encounter.recommendedPower
            ? '전투력이 부족했습니다. 훈련소와 대장간을 먼저 강화하세요.'
            : '정책과 길잡이의 보정을 확인한 뒤 다시 도전하세요.',
      recommendedFacilityId,
      recommendedEquipmentId: getBlacksmithEquipmentRecommendation(save),
      retryAfterSeconds: won ? 0 : encounter.durationSeconds,
      successChance,
      encountersCleared,
      totalEncounterCount,
    };
    if (won) {
      give(save, realm.reward, policyBonus * efficiency);
      save.run.hero.realmId = expedition.realmId;
      save.run.hero.currentAction = 'rest';
      if (allowPermanentUnlock) {
        const next = getNextRealmId(expedition.realmId);
        // The deep forest victory intentionally pauses before the underworld:
        // the player must make the ember choice in the Saga screen first.
        if (next && next !== 'underworld' && !save.meta.unlockedRealms.includes(next)) {
          save.meta.unlockedRealms.push(next);
        }
      }
      addUniqueStoryEntry(save, getRealmVictoryEntry(expedition.realmId, save.run.hero.name, eventAt));
      if (expedition.realmId === 'underworld' && !hasVillageEpilogue(save)) {
        addUniqueStoryEntry(save, getVillageEpilogueEntry(save.run.hero.name, eventAt));
      }
      save.meta.sagaEntries.unshift({
        id: nextSaveId(save, `saga-expedition-${expedition.id}`),
        kind: 'expedition',
        createdAt: eventAt,
        title: `${realm.nameKR} 원정 성공`,
        text: `${save.run.hero.name}이(가) ${realm.boss}을(를) 넘어 마을로 돌아왔다.`,
      });
    } else {
      // A defeated expedition never destroys persistent resources. The
      // preparation cost is refunded so failure teaches the player through
      // the result card without creating an unrecoverable currency loss.
      give(save, realm.cost);
      save.run.hero.currentAction = 'rest';
      save.meta.sagaEntries.unshift({
        id: nextSaveId(save, `saga-expedition-${expedition.id}`),
        kind: 'expedition',
        createdAt: eventAt,
        title: `${realm.nameKR} 원정 중단`,
        text: `${encounter.nameKR}에서 힘이 부족해 돌아왔다. 다음 시설과 장비를 준비하자.`,
      });
    }
    save.run.lastExpeditionResult = expeditionResult;
    save.run.expedition = null;
    if (guide) {
      guide.activeTaskId = null;
      guide.fatigue = Math.min(100, guide.fatigue + 8);
      applyAgentTrustGain(save, guide.id, won ? 2 : 1, eventAt);
    }
  }
}

function settleFacilityTasks(
  source: VillageSaveEnvelope,
  now: number,
  outputEfficiency = 1,
  allowPermanentUnlock = true,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
  onlyTaskId: string | null = null,
  resolveExpeditionOnSettlement = true,
): VillageSaveEnvelope {
  if (!isPersistableClock(now) || (!allowHistoricalSettlement && now < source.updatedAt)) return source;
  const eventAt = allowHistoricalSettlement ? now : eventTimestamp(source, now);
  for (const task of Object.values(source.meta.tasks)) {
    if (onlyTaskId !== null && task.id !== onlyTaskId) continue;
    if (!isValidCompletionWindow(task.startedAt, task.completesAt)) return source;
    if (task.completesAt > eventAt) continue;
    if (!canApplyCurrencyOutput(source, task.outputPreview)) return source;
    if (task.assignedAgentId
      && !isValidAgentState(source.meta.agents.find((agent) => agent.id === task.assignedAgentId))) return source;
  }
  if (resolveExpeditionOnSettlement && source.run.expedition
    && !isValidCompletionWindow(source.run.expedition.startedAt, source.run.expedition.completesAt)) {
    return source;
  }
  if (resolveExpeditionOnSettlement && source.run.expedition
    && source.run.expedition.completesAt <= eventAt) {
    const realm = getVillageRealmDefinition(source.run.expedition.realmId);
    if (realm
      && (!canApplyCurrencyOutput(source, realm.reward)
        || !canApplyCurrencyOutput(source, realm.cost))) {
      return source;
    }
    if (source.run.expedition.assignedAgentId === 'guide'
      && !isValidAgentState(source.meta.agents.find((agent) => agent.id === 'guide'))) return source;
  }
  const save = cloneSave(source);
  // Offline settlement may intentionally resolve the capped historical
  // window before a later manual write timestamp. Real-time callers keep the
  // stricter persisted-write clock guard above.
  const efficiency = normalizeSettlementEfficiency(outputEfficiency);
  for (const task of Object.values(save.meta.tasks)) {
    if (onlyTaskId !== null && task.id !== onlyTaskId) continue;
    if (task.completesAt > eventAt) continue;
    const facility = save.meta.facilities[task.facilityId];
    give(save, task.outputPreview, efficiency);
    if (task.outputEquipmentIds) {
      for (const equipmentId of task.outputEquipmentIds) grantEquipmentLevel(save, equipmentId);
    }
    if (task.heroExpGain) {
      const levelsGained = applyHeroExperience(save, task.heroExpGain * efficiency);
      if (levelsGained > 0) {
        save.meta.sagaEntries.unshift({
          id: nextSaveId(save, `saga-level-${task.id}`),
          kind: 'milestone',
          createdAt: eventAt,
          title: '영웅의 성장',
          text: `${save.run.hero.name}이(가) ${levelsGained}단계 성장해 Lv.${save.run.hero.level}이 되었다.`,
        });
      }
    }
    if (task.facilityId === 'training') advanceHeroActionsInPlace(save, 1, eventAt);
    if (facility) facility.activeTaskId = null;
    if (task.assignedAgentId) {
      const agent = save.meta.agents.find((item) => item.id === task.assignedAgentId);
      if (agent) {
        const previousTrust = agent.trust;
        agent.activeTaskId = null;
        agent.fatigue = Math.min(100, agent.fatigue + 5);
        applyAgentTrustGain(save, agent.id, 1, eventAt);
        if (previousTrust < 100 && agent.trust === 100) {
          save.meta.sagaEntries.unshift({
            id: nextSaveId(save, `saga-agent-trust-${agent.id}-${task.id}`),
            kind: 'milestone',
            createdAt: eventAt,
            title: `${agent.nameKR} 신뢰 최고점`,
            text: `${agent.nameKR}이(가) 마을의 후원자를 완전히 신뢰하게 되었다.`,
          });
        }
      }
    }
    if (task.facilityId === 'recovery') {
      save.run.hero.hp = save.run.hero.hpMax;
    }
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-facility-${task.id}`),
      kind: 'facility',
      createdAt: eventAt,
      title: `${getVillageFacilityDefinition(task.facilityId)?.nameKR ?? '시설'} 작업 완료`,
      text: `${task.type} 작업이 완료되어 마을에 결과가 쌓였다.`,
    });
    delete save.meta.tasks[task.id];
  }
  if (resolveExpeditionOnSettlement) {
    resolveExpedition(save, eventAt, allowPermanentUnlock, efficiency, allowHistoricalSettlement, allowRiskyBossConfirmation);
  }
  syncHeroAction(save);
  save.lastProcessedAt = Math.max(save.lastProcessedAt, eventAt);
  touchSave(save, eventAt);
  return save;
}

export function completeFacilityTasks(
  source: VillageSaveEnvelope,
  now: number,
  outputEfficiency = 1,
  allowPermanentUnlock = true,
  allowHistoricalSettlement = false,
  allowRiskyBossConfirmation = false,
): VillageSaveEnvelope {
  return settleFacilityTasks(
    source,
    now,
    outputEfficiency,
    allowPermanentUnlock,
    allowHistoricalSettlement,
    allowRiskyBossConfirmation,
  );
}

export function completeFacilityTaskNow(
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
  now: number,
): DomainResult {
  if (!isPersistableClock(now)) return { ok: false, save: source, error: '기기 시각을 확인할 수 없어 작업을 완료하지 않았습니다.' };
  const prepared = cloneSave(source);
  const eventAt = eventTimestamp(prepared, now);
  if (now < prepared.updatedAt) return { ok: false, save: source, error: '저장 시각이 미래라 작업을 즉시 완료하지 않았습니다.' };
  const facility = prepared.meta.facilities[facilityId];
  const taskId = facility?.activeTaskId;
  const task = taskId ? prepared.meta.tasks[taskId] : undefined;
  if (!facility || !task) {
    return { ok: false, save: source, error: '즉시 완료할 작업이 없습니다.' };
  }
  if (!isValidCompletionWindow(task.startedAt, task.completesAt)) {
    return { ok: false, save: source, error: '작업 시각 범위를 확인할 수 없어 즉시 완료하지 않았습니다.' };
  }
  task.completesAt = eventAt;
  const settled = settleFacilityTasks(prepared, eventAt, 1, true, false, false, task.id, false);
  if (settled === prepared) {
    return { ok: false, save: source, error: '작업 보상 잔액을 확인할 수 없어 즉시 완료하지 않았습니다.' };
  }
  return {
    ok: true,
    save: settled,
    task,
  };
}

/** Explicit player confirmation for a risky expedition held by offline settlement. */
export function confirmPendingExpedition(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope {
  const pending = source.run.expedition;
  if (pending?.status !== 'awaiting_confirmation') return source;
  if (!isPersistableClock(now) || now < source.updatedAt || now < pending.completesAt) return source;
  const save = cloneSave(source);
  if (!save.run.expedition) return source;
  save.run.expedition.status = 'traveling';
  const settled = completeFacilityTasks(save, now, 1, false, false, true);
  // Confirmation is a single atomic transition. If settlement rejects the
  // cloned state (for example because a persisted balance or agent is
  // malformed), never expose the intermediate `traveling` status to callers.
  if (settled === save || settled.run.expedition) return source;
  return settled;
}

/** Explicitly commits the next Realm record after an offline victory. */
export function confirmNextRealmUnlock(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope {
  const result = source.run.lastExpeditionResult;
  if (!result || result.outcome !== 'victory') return source;
  const next = getNextRealmId(result.realmId);
  if (!next || source.meta.unlockedRealms.includes(next)) return source;
  // The deep-forest branch is intentionally irreversible. Never let the
  // generic Realm confirmation bypass its explicit story choice, even when
  // the corresponding saga entry has already been evicted by history caps.
  if (next === 'underworld') return source;
  const nextRealm = getVillageRealmDefinition(next);
  if (!nextRealm) return source;
  if (!isActionClockValid(source, now)) return source;

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  save.meta.unlockedRealms.push(next);
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-realm-unlock-${next}-${eventAt}`),
    kind: 'milestone',
    createdAt: eventAt,
    title: `${nextRealm.nameKR} 기록 해금`,
    text: `${nextRealm.nameKR}으로 향하는 다음 장이 사가에 기록되었다.`,
  });
  touchSave(save, now);
  return save;
}

/** Explicitly records the one irreversible story choice before the underworld. */
export function chooseStoryChoice(
  source: VillageSaveEnvelope,
  choice: StoryChoiceOptionId,
  now: number,
) {
  return chooseStoryChoiceEntry(source, choice, now);
}

export function grantOfflineResourceBonus(
  source: VillageSaveEnvelope,
  gains: Partial<Record<VillageCurrencyKey, number>>,
  now: number,
): VillageSaveEnvelope {
  if (!isActionClockValid(source, now) || !gains || Array.isArray(gains)) return source;
  const positiveGains = Object.fromEntries(
    Object.entries(gains).filter(([key, value]) =>
      Object.prototype.hasOwnProperty.call(source.meta.currencies, key)
      && Number.isFinite(value) && value > 0),
  ) as Partial<Record<VillageCurrencyKey, number>>;
  if (Object.keys(positiveGains).length === 0) return source;
  if (!Object.keys(positiveGains).every((key) =>
    isValidCurrencyBalance(source.meta.currencies[key as VillageCurrencyKey]),
  )) return source;
  const save = cloneSave(source);
  give(save, positiveGains);
  touchSave(save, now);
  return save;
}

export function grantInterventionCharge(source: VillageSaveEnvelope, now: number): VillageSaveEnvelope {
  if (!isActionClockValid(source, now)
    || !isValidInterventionCharges(source.run.interventionCharges)
    || source.run.interventionCharges >= Village_MAX_INTERVENTION_CHARGES) return source;
  const save = cloneSave(source);
  save.run.interventionCharges = Math.min(
    Village_MAX_INTERVENTION_CHARGES,
    save.run.interventionCharges + 1,
  );
  touchSave(save, now);
  return save;
}

export function useIntervention(
  source: VillageSaveEnvelope,
  intervention: InterventionType,
  now: number,
): InterventionDomainResult {
  if (!isInterventionType(intervention)) {
    return { ok: false, save: source, error: '알 수 없는 신의 개입입니다.' };
  }
  if (!isActionClockValid(source, now)) {
    return { ok: false, save: source, error: '저장 시각을 확인할 수 없어 신의 개입을 적용하지 않았습니다.' };
  }
  if (!isValidInterventionCharges(source.run.interventionCharges)) {
    return { ok: false, save: source, error: '신의 개입 충전 정보를 확인할 수 없습니다.' };
  }
  if (source.run.interventionCharges <= 0) {
    return { ok: false, save: source, error: '신의 개입 충전이 없습니다.' };
  }
  if (intervention === 'heal') {
    const sourceHero = source.run.hero;
    if (!isPersistableFiniteNumber(sourceHero.hp)
      || !isPersistableFiniteNumber(sourceHero.hpMax)
      || sourceHero.hpMax <= 0
      || sourceHero.hp < 0
      || sourceHero.hp > sourceHero.hpMax) {
      return { ok: false, save: source, error: '영웅 HP 정보를 확인할 수 없어 회복하지 않았습니다.' };
    }
  }

  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const hero = save.run.hero;
  if (intervention === 'heal') {
    if (hero.hp >= hero.hpMax) {
      return { ok: false, save: source, error: '영웅의 HP가 이미 가득 찼습니다.' };
    }
    hero.hp = hero.hpMax;
    save.run.interventionCharges -= 1;
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-intervention-heal-${eventAt}`),
      kind: 'milestone',
      createdAt: eventAt,
      title: '신의 개입: 즉시 회복',
      text: `${hero.name}의 상처가 신력으로 즉시 아물었다.`,
    });
    touchSave(save, now);
    return { ok: true, save, intervention };
  }

  const expedition = save.run.expedition;
  if (!expedition) {
    return { ok: false, save: source, error: '후퇴할 원정이 없습니다.' };
  }

  const realm = getVillageRealmDefinition(expedition.realmId);
  if (!realm) return { ok: false, save: source, error: '원정 기록을 확인할 수 없습니다.' };
  if (!canApplyCurrencyOutput(source, realm.cost)) {
    return { ok: false, save: source, error: '환불할 원정 재화 잔액을 확인할 수 없습니다.' };
  }
  if (expedition.assignedAgentId
    && !isValidAgentState(source.meta.agents.find((agent) => agent.id === expedition.assignedAgentId))) {
    return { ok: false, save: source, error: '원정 지원 에이전트 정보를 확인할 수 없습니다.' };
  }
  // A retreat refunds half of the preparation cost. It preserves the
  // no-permanent-loss rule while making the charge a meaningful safety valve.
  give(save, realm.cost, 0.5);
  save.run.expedition = null;
  hero.currentAction = 'rest';
  save.run.interventionCharges -= 1;
  if (expedition.assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === expedition.assignedAgentId);
    if (agent) {
      agent.activeTaskId = null;
      agent.fatigue = Math.min(100, agent.fatigue + 2);
    }
  }
  save.meta.sagaEntries.unshift({
    id: nextSaveId(save, `saga-intervention-retreat-${expedition.id}`),
    kind: 'expedition',
    createdAt: eventAt,
    title: '신의 개입: 원정 후퇴',
    text: `${hero.name}이(가) 신의 명을 받아 ${realm.nameKR}에서 안전하게 돌아왔다.`,
  });
  touchSave(save, now);
  return { ok: true, save, intervention };
}

export function startExpedition(
  source: VillageSaveEnvelope,
  realmId: RealmId,
  now: number,
  policy: VillagePolicy,
  assignedAgentId: SupportAgentId | null,
): DomainResult {
  if (!isVillagePolicy(policy)) {
    return { ok: false, save: source, error: '알 수 없는 원정 정책입니다.' };
  }
  const sourceHero = source.run.hero;
  if (!isPersistableFiniteNumber(sourceHero.hp)
    || !isPersistableFiniteNumber(sourceHero.hpMax)
    || sourceHero.hpMax <= 0
    || sourceHero.hp < 0
    || sourceHero.hp > sourceHero.hpMax) {
    return { ok: false, save: source, error: '영웅 HP 정보를 확인할 수 없어 원정을 시작하지 않았습니다.' };
  }
  const save = cloneSave(source);
  const realm = getVillageRealmDefinition(realmId);
  if (!realm) {
    return { ok: false, save: source, error: '알 수 없는 영역입니다.' };
  }
  if (!save.meta.unlockedRealms.includes(realmId)) {
    return { ok: false, save: source, error: '아직 기록되지 않은 영역입니다.' };
  }
  if (save.run.expedition) {
    return { ok: false, save: source, error: '동시에 진행할 수 있는 원정은 1개뿐입니다.' };
  }
  const pendingRealmUnlock = save.run.lastExpeditionResult?.outcome === 'victory'
    ? getNextRealmId(save.run.lastExpeditionResult.realmId)
    : null;
  if (pendingRealmUnlock && !save.meta.unlockedRealms.includes(pendingRealmUnlock)) {
    return { ok: false, save: source, error: '다음 영역 기록을 먼저 확정해 주세요.' };
  }
  if (save.run.hero.hp <= 0) {
    return { ok: false, save: source, error: '영웅이 쓰러져 있습니다. 회복당에서 먼저 회복하세요.' };
  }
  if (Object.values(save.meta.tasks).some((task) => task.facilityId === 'training')) {
    return { ok: false, save: source, error: '영웅이 훈련 중입니다. 훈련을 마친 뒤 원정을 시작하세요.' };
  }
  if (assignedAgentId !== null && assignedAgentId !== 'guide') {
    return { ok: false, save: source, error: '원정에는 길잡이만 배정할 수 있습니다.' };
  }
  if (!canPay(save, realm.cost)) {
    return { ok: false, save: source, error: '원정 준비에 필요한 신력 또는 재료가 부족합니다.' };
  }
  if (assignedAgentId && !save.meta.agents.some((agent) => agent.id === assignedAgentId && !agent.activeTaskId)) {
    return { ok: false, save: source, error: '길잡이가 다른 작업 중입니다.' };
  }
  const assignedGuide = assignedAgentId === 'guide'
    ? save.meta.agents.find((agent) => agent.id === 'guide')
    : undefined;
  if (assignedAgentId === 'guide' && (!assignedGuide || !isValidAgentState(assignedGuide))) {
    return { ok: false, save: source, error: '길잡이 정보를 확인할 수 없습니다.' };
  }
  if (assignedAgentId === 'guide' && assignedGuide && assignedGuide.fatigue >= 100) {
    return { ok: false, save: source, error: '길잡이가 너무 피로합니다. 휴식 후 다시 출발하세요.' };
  }
  const eventAt = eventTimestamp(save, now);
  const firstEncounterDuration = expeditionDurationSeconds(
    save,
    realm.encounters[0]?.durationSeconds ?? realm.durationSeconds,
    assignedAgentId === 'guide',
  );
  const completesAt = safeCompletionTimestamp(eventAt, firstEncounterDuration);
  if (completesAt === null) return { ok: false, save: source, error: '원정 시각 범위를 확인할 수 없어 출발하지 않았습니다.' };
  pay(save, realm.cost);
  const id = nextSaveId(save, `expedition-${realmId}-${eventAt}`);
  save.run.expedition = {
    id,
    realmId,
    policy,
    assignedAgentId,
    startedAt: eventAt,
    completesAt,
    status: 'traveling',
    encounterIndex: 0,
    encountersCleared: 0,
    totalTurns: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
  };
  save.run.lastExpeditionResult = null;
  save.run.hero.currentAction = 'expedition';
  if (assignedAgentId) {
    const agent = save.meta.agents.find((item) => item.id === assignedAgentId);
    if (agent) agent.activeTaskId = id;
  }
  addUniqueStoryEntry(save, getRealmIntroEntry(realmId, save.run.hero.name, eventAt));
  touchSave(save, now);
  return {
    ok: true,
    save,
    task: {
      id,
      facilityId: 'expedition',
      type: '원정',
      startedAt: eventAt,
      completesAt: save.run.expedition.completesAt,
      input: realm.cost,
      outputPreview: realm.reward,
      assignedAgentId,
    },
  };
}

export function setVillagePolicy(source: VillageSaveEnvelope, policy: VillagePolicy, now: number): VillageSaveEnvelope {
  if (!isVillagePolicy(policy)) return source;
  const save = cloneSave(source);
  save.run.policy = policy;
  touchSave(save, now);
  return save;
}

function clampVolume(value: number | undefined, fallback: number): number {
  return typeof value !== 'number' || !Number.isFinite(value)
    ? fallback
    : Math.min(1, Math.max(0, value));
}

export function updateVillageSettings(
  source: VillageSaveEnvelope,
  patch: Partial<VillageSettings>,
  now: number,
): VillageSaveEnvelope {
  const save = cloneSave(source);
  const safePatch: Partial<VillageSettings> = patch && typeof patch === 'object' && !Array.isArray(patch)
    ? patch
    : {};
  save.meta.settings = {
    music: clampVolume(safePatch.music, source.meta.settings.music),
    sfx: clampVolume(safePatch.sfx, source.meta.settings.sfx),
    muted: typeof safePatch.muted === 'boolean' ? safePatch.muted : source.meta.settings.muted,
  };
  touchSave(save, now);
  return save;
}
