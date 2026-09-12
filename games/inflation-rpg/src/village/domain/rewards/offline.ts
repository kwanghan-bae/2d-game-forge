import type { VillageCurrencyKey, VillageSaveEnvelope } from '../../types';
import { isActionClockValid, isValidCurrencyBalance } from '../shared/guards';
import { give } from '../shared/resourceMath';
import { cloneSave, touchSave } from '../shared/saveMutation';

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
