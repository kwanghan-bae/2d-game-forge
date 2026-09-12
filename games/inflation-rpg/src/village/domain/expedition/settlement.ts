import { getVillageFacilityDefinition, getVillageRealmDefinition } from '../../data';
import { applyVillageEquipmentBonuses, getVillageEquipmentBonuses, getVillageEquipmentDefinition } from '../../equipment';
import {
  getRealmVictoryEntry,
  getVillageEpilogueEntry,
  hasVillageEpilogue,
} from '../../story';
import type {
  ExpeditionResult,
  FacilityId,
  VillageCurrencyKey,
  VillageSaveEnvelope,
} from '../../types';
import type { DomainResult } from '../contracts';
import { getBlacksmithEquipmentRecommendation } from '../facility/preview';
import { getVillageHeroPower, saturatingAdd } from '../hero/progression';
import { applyAgentTrustGain } from '../shared/agentTrust';
import {
  MAX_ECONOMY_VALUE,
  isPersistableClock,
  isValidAgentState,
  isValidCompletionWindow,
  safeCompletionTimestamp,
} from '../shared/guards';
import { advanceHeroActionsInPlace } from '../shared/heroActionClock';
import { nextSaveId } from '../shared/ids';
import {
  canApplyCurrencyOutput,
  give,
  safeScaledEconomyAmount,
} from '../shared/resourceMath';
import {
  addUniqueStoryEntry,
  cloneSave,
  eventTimestamp,
  syncHeroAction,
  touchSave,
} from '../shared/saveMutation';
import {
  expeditionDurationSeconds,
  getExpeditionForecast,
  getNextRealmId,
} from './forecast';

const MAX_HERO_EXP_SETTLEMENT = 100_000;
const MAX_LEVELS_PER_SETTLEMENT = 1_000;

function saturatingCounterAdd(value: number | undefined, amount: number, cap = MAX_ECONOMY_VALUE): number {
  const base = Number.isFinite(value) && (value ?? 0) >= 0
    ? Math.min(cap, Math.floor(value ?? 0))
    : 0;
  const increment = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  return Math.min(cap, base + increment);
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
