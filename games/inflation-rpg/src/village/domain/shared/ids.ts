import type { VillageSaveEnvelope } from '../../types';
import { eventTimestamp } from './saveMutation';

export function isSaveIdUsed(save: VillageSaveEnvelope, id: string): boolean {
  if (Object.prototype.hasOwnProperty.call(save.meta.tasks, id)) return true;
  if (save.run.expedition?.id === id || save.run.lastExpeditionResult?.id === id) return true;
  return save.meta.sagaEntries.some((entry) => entry.id === id || entry.id.endsWith(`-${id}`));
}

export function nextSaveId(save: VillageSaveEnvelope, base: string): string {
  if (!isSaveIdUsed(save, base)) return base;
  let suffix = 2;
  while (isSaveIdUsed(save, `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function nextTaskId(save: VillageSaveEnvelope, prefix: string, now: number): string {
  const timestamp = eventTimestamp(save, now);
  return nextSaveId(save, `${prefix}-${timestamp}-${Object.keys(save.meta.tasks).length + 1}`);
}
