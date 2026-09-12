import { getVillageFacilityDefinition } from '../../data';
import type { FacilityId, VillageSaveEnvelope } from '../../types';
import type { DomainResult, FacilityUpgradeCost } from '../contracts';
import { MAX_ECONOMY_VALUE, positiveFiniteLevel } from '../shared/guards';
import { nextSaveId } from '../shared/ids';
import { canPay, pay, safeScaledEconomyAmount } from '../shared/resourceMath';
import { cloneSave, eventTimestamp, touchSave } from '../shared/saveMutation';

const FACILITY_UPGRADE_GROWTH = 1.35;

export function upgradeFacility(source: VillageSaveEnvelope, facilityId: FacilityId, now: number): DomainResult {
  const save = cloneSave(source);
  const eventAt = eventTimestamp(save, now);
  const facility = save.meta.facilities[facilityId];
  if (!facility) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (facility.activeTaskId) return { ok: false, save: source, error: '작업 중인 시설은 강화할 수 없습니다.' };
  if (!Number.isFinite(facility.level) || !Number.isInteger(facility.level) || facility.level < 1) {
    return { ok: false, save: source, error: '시설 레벨을 확인할 수 없습니다.' };
  }
  if (facility.level >= MAX_ECONOMY_VALUE) {
    return { ok: false, save: source, error: '시설 레벨이 더 이상 오르지 않습니다.' };
  }
  const cost = getFacilityUpgradeCost(source, facilityId);
  if (!cost) return { ok: false, save: source, error: '시설을 찾을 수 없습니다.' };
  if (!canPay(save, cost)) return { ok: false, save: source, error: '시설 강화 재료가 부족합니다.' };
  pay(save, cost);
  facility.level += 1;
  touchSave(save, now);
  return {
    ok: true,
    save,
    task: {
      id: nextSaveId(save, `upgrade-${facilityId}-${eventAt}`),
      facilityId,
      type: '시설 강화',
      startedAt: eventAt,
      completesAt: eventAt,
      input: cost,
      outputPreview: {},
      assignedAgentId: null,
    },
  };
}

export function getFacilityUpgradeCost(
  source: VillageSaveEnvelope,
  facilityId: FacilityId,
): FacilityUpgradeCost | null {
  const facility = source.meta.facilities[facilityId];
  if (!facility || !getVillageFacilityDefinition(facilityId)) return null;
  const growth = Math.pow(FACILITY_UPGRADE_GROWTH, positiveFiniteLevel(facility.level) - 1);
  return {
    gold: safeScaledEconomyAmount(80, growth),
    materials: safeScaledEconomyAmount(4, growth),
  };
}
