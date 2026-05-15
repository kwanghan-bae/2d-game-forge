import { describe, it, expect } from 'vitest';
import type { MetaState } from '../types';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import {
  canWatchAd, startAdWatch, finishAdWatch, checkDailyReset,
  AD_COOLDOWN_MS, AD_DAILY_CAP,
} from './ads';

function makeMeta(adsToday = 0, adsLastReset = Date.now()): MetaState {
  return {
    relicStacks: { ...EMPTY_RELIC_STACKS },
    adsWatched: 0,
    adsToday,
    adsLastResetTs: adsLastReset,
  } as unknown as MetaState;
}

describe('canWatchAd', () => {
  it('ok when not at daily cap', () => {
    expect(canWatchAd(makeMeta(0), Date.now()).ok).toBe(true);
  });
  it('rejects when daily cap reached', () => {
    const r = canWatchAd(makeMeta(AD_DAILY_CAP), Date.now());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cap');
  });
});

describe('startAdWatch → finishAdWatch flow', () => {
  it('happy path: increments adsWatched, adsToday, and relicStacks', () => {
    const before = makeMeta(0);
    const { adRunId, endsAt } = startAdWatch(before, 0);
    expect(adRunId).toMatch(/^ad_/);
    expect(endsAt).toBe(AD_COOLDOWN_MS);
    const after = finishAdWatch(before, adRunId, 'warrior_banner', AD_COOLDOWN_MS);
    expect(after.ok).toBe(true);
    expect(after.relicId).toBe('warrior_banner');
    expect(after.nextMeta.adsWatched).toBe(1);
    expect(after.nextMeta.adsToday).toBe(1);
    expect(after.nextMeta.relicStacks.warrior_banner).toBe(1);
  });
  it('cap-reached relic: stack does not increase but ad counter does', () => {
    const meta = { ...makeMeta(0), relicStacks: { ...EMPTY_RELIC_STACKS, undead_coin: 1 } };
    const { adRunId } = startAdWatch(meta, 0);
    const r = finishAdWatch(meta, adRunId, 'undead_coin', AD_COOLDOWN_MS);
    expect(r.ok).toBe(true);
    expect(r.capReached).toBe(true);
    expect(r.nextMeta.relicStacks.undead_coin).toBe(1);  // unchanged
    expect(r.nextMeta.adsToday).toBe(1);
  });
});

describe('finishAdWatch daily-reset integration', () => {
  it('finishAdWatch on next day starts adsToday from 1 (not 21)', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const meta = { ...makeMeta(20, yesterday.getTime()), relicStacks: { ...EMPTY_RELIC_STACKS } };
    const { adRunId } = startAdWatch(meta, Date.now());
    const result = finishAdWatch(meta, adRunId, 'warrior_banner', Date.now());
    expect(result.nextMeta.adsToday).toBe(1);   // reset + this watch = 1, NOT 21
    expect(result.nextMeta.relicStacks.warrior_banner).toBe(1);
  });
});

describe('checkDailyReset', () => {
  it('resets adsToday when nowTs date > lastReset date (local)', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const meta = makeMeta(20, yesterday.getTime());
    const result = checkDailyReset(meta, Date.now());
    expect(result.adsToday).toBe(0);
    expect(result.adsLastResetTs).toBeGreaterThan(meta.adsLastResetTs);
  });
  it('no-op when same day', () => {
    const meta = makeMeta(20, Date.now() - 60_000);  // 1 min ago, same day
    const result = checkDailyReset(meta, Date.now());
    expect(result.adsToday).toBe(20);
  });
});
