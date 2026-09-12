import type { VillagePolicy, VillageSaveEnvelope, VillageSettings } from '../../types';
import { isVillagePolicy } from '../shared/guards';
import { cloneSave, touchSave } from '../shared/saveMutation';

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
