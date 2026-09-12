import { getVillageRealmDefinition } from '../../data';
import { getRealmIntroEntry } from '../../story';
import type {
  RealmId,
  SupportAgentId,
  VillagePolicy,
  VillageSaveEnvelope,
} from '../../types';
import type { DomainResult } from '../contracts';
import {
  isActionClockValid,
  isPersistableClock,
  isPersistableFiniteNumber,
  isValidAgentState,
  isVillagePolicy,
  safeCompletionTimestamp,
} from '../shared/guards';
import { nextSaveId } from '../shared/ids';
import { canPay, pay } from '../shared/resourceMath';
import {
  addUniqueStoryEntry,
  cloneSave,
  eventTimestamp,
  touchSave,
} from '../shared/saveMutation';
import { expeditionDurationSeconds, getNextRealmId } from './forecast';
import { completeFacilityTasks } from './settlement';

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
