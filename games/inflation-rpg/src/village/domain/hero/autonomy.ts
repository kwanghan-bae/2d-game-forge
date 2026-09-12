import { HeroLifecycle } from '../../../hero/HeroLifecycle';
import { createVillageHeroRuntime } from '../../heroRuntime';
import type { HeroAction, VillageSaveEnvelope } from '../../types';
import { MAX_ECONOMY_VALUE } from '../shared/guards';
import { nextSaveId } from '../shared/ids';
import { cloneSave, eventTimestamp, touchSave } from '../shared/saveMutation';

export function advanceHeroActionsInPlace(save: VillageSaveEnvelope, actions: number, now: number): void {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return;

  const eventAt = eventTimestamp(save, now);
  const hero = save.run.hero;
  const previousAge = hero.age;
  const currentActions = Number.isFinite(hero.actionCount) && Number.isInteger(hero.actionCount) && hero.actionCount >= 0
    ? Math.min(MAX_ECONOMY_VALUE, hero.actionCount)
    : 0;
  const nextActions = Math.min(MAX_ECONOMY_VALUE, currentActions + amount);
  const effectiveActions = nextActions - currentActions;
  if (effectiveActions <= 0) return;
  hero.actionCount = nextActions;
  hero.age = Math.max(previousAge, HeroLifecycle.ageFromActions(hero.actionCount));
  if (hero.age > previousAge) {
    save.meta.sagaEntries.unshift({
      id: nextSaveId(save, `saga-aging-${eventAt}-${hero.actionCount}`),
      kind: 'milestone',
      createdAt: eventAt,
      title: '영웅의 시간',
      text: `${hero.name}이(가) ${previousAge}세에서 ${hero.age}세로 한 걸음 나아갔다.`,
    });
  }
}

/** Advances the Village hero's action clock without mutating the source save. */
export function advanceHeroActions(source: VillageSaveEnvelope, actions: number, now: number): VillageSaveEnvelope {
  const amount = Math.floor(actions);
  if (!Number.isFinite(actions) || amount <= 0) return source;
  const save = cloneSave(source);
  advanceHeroActionsInPlace(save, amount, now);
  touchSave(save, now);
  return save;
}

/**
 * Exposes the same next-action decision used by the hero runtime to the hub.
 * It is a read-only forecast; starting a task or expedition remains an
 * explicit player action and therefore cannot be triggered by rendering.
 */
export function getHeroNextAction(source: VillageSaveEnvelope): HeroAction {
  const hero = source.run.hero;
  if (source.run.expedition) return 'expedition';
  if (Object.values(source.meta.tasks).some((task) => task.facilityId === 'training')) return 'train';
  return createVillageHeroRuntime(hero).chooseAction({
    hp: hero.hp,
    hpMax: hero.hpMax,
    policy: source.run.policy,
    expeditionAvailable: source.meta.unlockedRealms.length > 0,
  });
}
