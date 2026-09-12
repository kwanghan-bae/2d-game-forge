import { getVillageRealmDefinition } from './data';
import { Village_MAX_INTERVENTION_CHARGES } from './types';
import {
  chooseStoryChoice as chooseStoryChoiceEntry,
  getAvailableStoryChoice,
  hasVillageEpilogue,
} from './story';
import type {
  InterventionType,
  StoryChoiceOptionId,
  VillageCurrencyKey,
  VillagePolicy,
  VillageSaveEnvelope,
  VillageSettings,
} from './types';

import type { InterventionDomainResult } from './domain/contracts';
import {
  isActionClockValid,
  isPersistableFiniteNumber,
  isValidAgentState,
  isValidCurrencyBalance,
  isVillagePolicy,
} from './domain/shared/guards';
import { nextSaveId } from './domain/shared/ids';
import { canApplyCurrencyOutput, give } from './domain/shared/resourceMath';
import { cloneSave, eventTimestamp, touchSave } from './domain/shared/saveMutation';

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
  advanceHeroAutonomy,
  decideHeroAction,
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
export {
  getExpeditionForecast,
  getExpeditionSuccessChance,
  getNextRealmId,
} from './domain/expedition/forecast';
export {
  confirmNextRealmUnlock,
  confirmPendingExpedition,
  startExpedition,
} from './domain/expedition/commands';
export {
  completeFacilityTaskNow,
  completeFacilityTasks,
} from './domain/expedition/settlement';

export { getAvailableStoryChoice, hasVillageEpilogue } from './story';

function isInterventionType(value: unknown): value is InterventionType {
  return value === 'heal' || value === 'retreat';
}

function isValidInterventionCharges(value: number): boolean {
  return Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= Village_MAX_INTERVENTION_CHARGES;
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
