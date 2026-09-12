import type { getRealmIntroEntry } from '../../story';
import { Village_MAX_SAGA_ENTRIES } from '../../types';
import type { VillageSaveEnvelope } from '../../types';
import { MAX_ECONOMY_VALUE, isPersistableClock } from './guards';

export function cloneSave(save: VillageSaveEnvelope): VillageSaveEnvelope {
  return JSON.parse(JSON.stringify(save)) as VillageSaveEnvelope;
}

export function eventTimestamp(save: VillageSaveEnvelope, now: number): number {
  const requested = isPersistableClock(now)
    ? now
    : save.updatedAt;
  return Math.min(MAX_ECONOMY_VALUE, Math.max(save.updatedAt, requested));
}

export function touchSave(save: VillageSaveEnvelope, now: number): void {
  const requested = eventTimestamp(save, now);
  save.updatedAt = Math.min(MAX_ECONOMY_VALUE, Math.max(save.updatedAt, save.lastProcessedAt, requested));
  if (save.meta.sagaEntries.length > Village_MAX_SAGA_ENTRIES) {
    save.meta.sagaEntries.length = Village_MAX_SAGA_ENTRIES;
  }
}

export function addUniqueStoryEntry(save: VillageSaveEnvelope, entry: ReturnType<typeof getRealmIntroEntry>): void {
  if (!save.meta.sagaEntries.some((candidate) => candidate.id === entry.id)) {
    save.meta.sagaEntries.unshift(entry);
  }
}

export function syncHeroAction(save: VillageSaveEnvelope): void {
  if (save.run.expedition) {
    save.run.hero.currentAction = 'expedition';
    return;
  }
  save.run.hero.currentAction = Object.values(save.meta.tasks).some((task) => task.facilityId === 'training')
    ? 'train'
    : 'rest';
}
