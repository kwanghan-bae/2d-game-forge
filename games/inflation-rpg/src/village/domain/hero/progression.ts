import { createVillageHeroRuntime } from '../../heroRuntime';
import { getRejuvenationStoryEntry } from '../../story';
import type { VillageSaveEnvelope } from '../../types';
import type { HeroDomainResult } from '../contracts';
import { MAX_ECONOMY_VALUE, isValidCurrencyBalance } from '../shared/guards';
import { addUniqueStoryEntry, cloneSave, eventTimestamp, touchSave } from '../shared/saveMutation';

export function saturatingAdd(value: number, amount: number): number {
  const base = Number.isFinite(value) && value >= 0 ? Math.min(MAX_ECONOMY_VALUE, value) : 0;
  return Math.min(MAX_ECONOMY_VALUE, base + amount);
}

export function rejuvenateHero(source: VillageSaveEnvelope, years: number, now: number): HeroDomainResult {
  if (!Number.isFinite(years) || years <= 0) {
    return { ok: false, save: source, error: '회춘할 기간을 확인해 주세요.' };
  }
  if (source.run.expedition) {
    return { ok: false, save: source, error: '원정 중에는 회춘 의식을 진행할 수 없습니다.' };
  }

  const gold = source.meta.currencies.gold;
  if (!isValidCurrencyBalance(gold)) {
    return { ok: false, save: source, error: '금화 잔액을 확인할 수 없어 회춘하지 않았습니다.' };
  }

  const eventAt = eventTimestamp(source, now);
  const runtime = createVillageHeroRuntime(source.run.hero);
  const result = runtime.rejuvenate(years);
  if (result.yearsReduced <= 0) {
    return { ok: false, save: source, error: '영웅은 이미 가장 젊은 상태입니다.' };
  }
  if (gold < result.cost) {
    return { ok: false, save: source, error: `회춘 비용 ${result.cost} 금화가 부족합니다.` };
  }

  const save = cloneSave(source);
  save.meta.currencies.gold = gold;
  save.meta.currencies.gold -= result.cost;
  save.run.hero = result.snapshot;
  addUniqueStoryEntry(save, getRejuvenationStoryEntry(save.run.hero.name, result.yearsReduced, eventAt));
  touchSave(save, now);
  return { ok: true, save, result };
}

export function getVillageHeroPower(save: VillageSaveEnvelope): number {
  const hero = save.run.hero;
  const rawParts = [hero.atk, hero.def, hero.hpMax];
  // A present numeric NaN indicates a corrupted stat snapshot. Preserve the
  // existing fail-closed behavior for that case, while treating an omitted
  // field as zero instead of allowing derived arithmetic to poison every
  // otherwise valid combat stat.
  if (rawParts.some((part) => typeof part === 'number' && Number.isNaN(part))) return 0;
  const parts = rawParts.map((part, index) => {
    if (typeof part !== 'number') return 0;
    return index === 2 ? part / 100 : part;
  });
  let power = 0;
  for (const part of parts) {
    if (typeof part !== 'number') continue;
    if (part < 0) continue;
    const safePart = Number.isFinite(part)
      ? Math.min(MAX_ECONOMY_VALUE, Math.floor(part))
      : MAX_ECONOMY_VALUE;
    if (power >= MAX_ECONOMY_VALUE - safePart) return MAX_ECONOMY_VALUE;
    power += safePart;
  }
  return power;
}
