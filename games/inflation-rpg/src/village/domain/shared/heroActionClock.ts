import { HeroLifecycle } from '../../../hero/HeroLifecycle';
import type { VillageSaveEnvelope } from '../../types';
import { MAX_ECONOMY_VALUE } from './guards';
import { nextSaveId } from './ids';
import { eventTimestamp } from './saveMutation';

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
