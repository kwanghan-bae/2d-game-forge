import type { MetaState, RelicId } from '../types';
import { applyStackIncrement, isAtCap } from './relics';

export const AD_COOLDOWN_MS = 8_000;
export const AD_DAILY_CAP = 30;

export function canWatchAd(meta: MetaState, nowTs: number): { ok: boolean; reason?: 'cap' } {
  const refreshed = checkDailyReset(meta, nowTs);
  if (refreshed.adsToday >= AD_DAILY_CAP) return { ok: false, reason: 'cap' };
  return { ok: true };
}

export function startAdWatch(_meta: MetaState, _nowTs: number): { adRunId: string; endsAt: number } {
  return {
    adRunId: `ad_${Math.random().toString(36).slice(2, 10)}`,
    endsAt: AD_COOLDOWN_MS,
  };
}

export function finishAdWatch(
  meta: MetaState,
  _adRunId: string,
  relicId: RelicId,
  _nowTs: number,
): { ok: boolean; relicId: RelicId; capReached: boolean; nextMeta: MetaState } {
  const capReached = isAtCap(meta, relicId);
  const nextStacks = capReached ? meta.relicStacks : applyStackIncrement(meta, relicId);
  const nextMeta: MetaState = {
    ...meta,
    adsWatched: (meta.adsWatched ?? 0) + 1,
    adsToday: meta.adsToday + 1,
    relicStacks: nextStacks,
  };
  return { ok: true, relicId, capReached, nextMeta };
}

export function checkDailyReset(meta: MetaState, nowTs: number): MetaState {
  const lastDate = new Date(meta.adsLastResetTs);
  const nowDate = new Date(nowTs);
  if (
    lastDate.getFullYear() !== nowDate.getFullYear() ||
    lastDate.getMonth() !== nowDate.getMonth() ||
    lastDate.getDate() !== nowDate.getDate()
  ) {
    return { ...meta, adsToday: 0, adsLastResetTs: nowTs };
  }
  return meta;
}
