import { describe, expect, it, vi } from 'vitest';
import { createLocalVillageRewardedUsageStore, createNativeVillageMonetization, createVillageMonetizationAdapter, hasVillageAdFreeEntitlement, Village_DAILY_REWARDED_LIMIT, Village_MONETIZATION_TIMEOUT_MS, VillageMonetizationAdapter } from '../monetization';

const nativeBridge = vi.hoisted(() => ({
  onAdFreeChanged: null as ((owned: boolean) => void) | null,
  initialize: null as (() => Promise<void>) | null,
}));

vi.mock('../../services/MonetizationService', () => ({
  MonetizationService: class {
    constructor(options: { onAdFreeChanged: (owned: boolean) => void }) {
      nativeBridge.onAdFreeChanged = options.onAdFreeChanged;
    }

    async initialize() {
      await nativeBridge.initialize?.();
    }
    async queryProducts() { return []; }
    async restorePurchasesManually() { return []; }
    async showRewardedAd() { return true; }
    async purchase() { return true; }
    isAdFreeOwned() { return false; }
  },
}));

describe('Village monetization adapter', () => {
  it('reads rewarded usage only from the canonical key', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    try {
      const store = createLocalVillageRewardedUsageStore();

      expect(store.read('2026-9-6')).toBe(0);
      expect(getItemSpy).toHaveBeenCalledTimes(1);
      expect(getItemSpy).toHaveBeenCalledWith('shin-ui-eternal-sponsor-rewarded-usage-v1');
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('does not revive unrelated rewarded usage when canonical data is malformed', () => {
    localStorage.setItem('shin-ui-eternal-sponsor-rewarded-usage-v1', '{not-json');
    localStorage.setItem('unrelated-rewarded-usage-v1', JSON.stringify({ day: '2026-9-6', count: 2 }));

    const store = createLocalVillageRewardedUsageStore();

    expect(store.read('2026-9-6')).toBe(0);
    expect(localStorage.getItem('shin-ui-eternal-sponsor-rewarded-usage-v1')).toBe('{not-json');
  });

  it('recognizes only the ad-free product during purchase restoration', () => {
    expect(hasVillageAdFreeEntitlement([])).toBe(false);
    expect(hasVillageAdFreeEntitlement([{ productId: 'crack_stones' }])).toBe(false);
    expect(hasVillageAdFreeEntitlement([{
      productId: 'ad_free', purchaseToken: 'tok_valid', purchaseTime: 0, acknowledged: true,
    }])).toBe(true);
    expect(hasVillageAdFreeEntitlement([{ productId: 'ad_free', purchaseToken: '' }])).toBe(false);
    expect(hasVillageAdFreeEntitlement([{ productId: 'ad_free', purchaseToken: 'tok_valid' }])).toBe(false);
    expect(hasVillageAdFreeEntitlement([{
      productId: 'ad_free', purchaseToken: 'tok_valid', purchaseTime: 0, acknowledged: true,
    }, { productId: 'other', purchaseToken: 'tok_other', purchaseTime: 0, acknowledged: true }])).toBe(true);
  });

  it('limits rewarded ads to five successful views and never blocks play', async () => {
    let calls = 0;
    const adapter = new VillageMonetizationAdapter({
      showRewarded: async () => { calls += 1; return true; },
    }, null);
    for (let i = 0; i < 5; i += 1) expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect((await adapter.watchRewarded('instant_task')).reason).toBe('daily_limit');
    expect(calls).toBe(5);
  });

  it('does not grant rewards when providers fail or a purchase is cancelled', async () => {
    const adapter = new VillageMonetizationAdapter({ showRewarded: async () => false }, { purchase: async () => 'cancelled' });
    expect((await adapter.watchRewarded('intervention_charge')).reason).toBe('provider_failed');
    expect((await adapter.buyAdFree()).reason).toBe('not_purchased');
    expect(adapter.isAdFree()).toBe(false);
  });

  it('does not grant a reward when a provider returns a truthy non-boolean value', async () => {
    const adapter = new VillageMonetizationAdapter({ showRewarded: async () => 'yes' as never }, null);

    expect(await adapter.watchRewarded('offline_double')).toEqual({
      granted: false,
      reason: 'provider_failed',
    });
    expect(adapter.getAdsToday()).toBe(0);
  });

  it('fails a rewarded request when the provider stays pending beyond the safety deadline', async () => {
    vi.useFakeTimers();
    try {
      const pending = new Promise<boolean>(() => {});
      const adapter = new VillageMonetizationAdapter({ showRewarded: async () => pending }, null);
      const reward = adapter.watchRewarded('offline_double');

      await vi.advanceTimersByTimeAsync(Village_MONETIZATION_TIMEOUT_MS);

      await expect(reward).resolves.toEqual({ granted: false, reason: 'provider_failed' });
      expect(adapter.getAdsToday()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails an ad-free purchase when the provider stays pending beyond the safety deadline', async () => {
    vi.useFakeTimers();
    try {
      const pending = new Promise<'purchased' | 'cancelled' | 'failed'>(() => {});
      const adapter = new VillageMonetizationAdapter(null, { purchase: async () => pending });
      const purchase = adapter.buyAdFree();

      await vi.advanceTimersByTimeAsync(Village_MONETIZATION_TIMEOUT_MS);

      await expect(purchase).resolves.toEqual({ granted: false, reason: 'provider_failed' });
      expect(adapter.isAdFree()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails purchase restoration when the provider stays pending beyond the safety deadline', async () => {
    vi.useFakeTimers();
    try {
      const pending = new Promise<boolean>(() => {});
      const adapter = new VillageMonetizationAdapter(null, null, null, async () => pending);
      const restore = adapter.restorePurchases();

      await vi.advanceTimersByTimeAsync(Village_MONETIZATION_TIMEOUT_MS);

      await expect(restore).resolves.toEqual({ granted: false, reason: 'provider_failed' });
      expect(adapter.isAdFree()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects an unknown rewarded placement before calling the provider', async () => {
    const showRewarded = vi.fn(async () => true);
    const adapter = new VillageMonetizationAdapter({ showRewarded }, null);

    expect((await adapter.watchRewarded('unknown' as never)).reason).toBe('provider_failed');
    expect(showRewarded).not.toHaveBeenCalled();
  });

  it('persists ad-free state in the adapter after a successful purchase', async () => {
    const adapter = new VillageMonetizationAdapter(null, { purchase: async () => 'purchased' });
    expect((await adapter.buyAdFree()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('notifies active entitlement subscribers only when the state changes', () => {
    const adapter = new VillageMonetizationAdapter(null, null);
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);

    adapter.setAdFreeOwned(true);
    adapter.setAdFreeOwned(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    adapter.setAdFreeOwned(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not treat malformed native entitlement values as ownership', () => {
    const adapter = new VillageMonetizationAdapter(null, null);

    adapter.setAdFreeOwned('true' as never);
    expect(adapter.isAdFree()).toBe(false);

    adapter.setAdFreeOwned(true);
    expect(adapter.isAdFree()).toBe(true);

    adapter.setAdFreeOwned(0 as never);
    expect(adapter.isAdFree()).toBe(false);
  });

  it('fails native monetization bootstrap when the service stays pending beyond the safety deadline', async () => {
    vi.useFakeTimers();
    nativeBridge.initialize = async () => new Promise<void>(() => {});
    try {
      const handle = await createNativeVillageMonetization();
      const initialized = handle.initialize();

      await vi.advanceTimersByTimeAsync(Village_MONETIZATION_TIMEOUT_MS);

      await expect(initialized).resolves.toBe(false);
    } finally {
      nativeBridge.initialize = null;
      vi.useRealTimers();
    }
  });

  it('restores a native ad-free entitlement through the adapter boundary', async () => {
    const adapter = new VillageMonetizationAdapter(null, null, null, async () => true);

    expect(adapter.canRestorePurchases()).toBe(true);
    expect((await adapter.restorePurchases()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('keeps an already-owned ad-free entitlement when restore returns no purchase', async () => {
    const adapter = new VillageMonetizationAdapter(null, null, null, async () => false);
    adapter.setAdFreeOwned(true);

    expect(await adapter.restorePurchases()).toEqual({ granted: true, reason: 'granted' });
    expect(adapter.isAdFree()).toBe(true);
  });

  it('shares one in-flight purchase restoration across concurrent callers', async () => {
    let restoreCalls = 0;
    let release!: (owned: boolean) => void;
    const pending = new Promise<boolean>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter(null, null, null, async () => {
      restoreCalls += 1;
      return pending;
    });

    const first = adapter.restorePurchases();
    const second = adapter.restorePurchases();
    await Promise.resolve();
    expect(restoreCalls).toBe(1);
    release(true);

    const results = await Promise.all([first, second]);
    expect(results.every((result) => result.granted)).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('does not discard a restore when a duplicate entitlement callback repeats the current state', async () => {
    let releaseRestore!: (owned: boolean) => void;
    const pendingRestore = new Promise<boolean>((resolve) => { releaseRestore = resolve; });
    const adapter = new VillageMonetizationAdapter(null, null, null, async () => pendingRestore);

    const restore = adapter.restorePurchases();
    await Promise.resolve();
    adapter.setAdFreeOwned(false);
    releaseRestore(true);

    expect(await restore).toEqual({ granted: true, reason: 'granted' });
    expect(adapter.isAdFree()).toBe(true);
  });

  it('shares one in-flight ad-free purchase across concurrent callers', async () => {
    let purchaseCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter(null, {
      purchase: async () => {
        purchaseCalls += 1;
        await pending;
        return 'purchased';
      },
    });

    const first = adapter.buyAdFree();
    const second = adapter.buyAdFree();
    await Promise.resolve();
    expect(purchaseCalls).toBe(1);
    release();

    const results = await Promise.all([first, second]);
    expect(results.every((result) => result.granted)).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('does not report a stale purchase failure after entitlement is granted externally', async () => {
    let release!: (result: 'purchased' | 'cancelled' | 'failed') => void;
    const pending = new Promise<'purchased' | 'cancelled' | 'failed'>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter(null, { purchase: () => pending });

    const purchase = adapter.buyAdFree();
    await Promise.resolve();
    adapter.setAdFreeOwned(true);
    release('cancelled');

    expect((await purchase).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('grants a pending rewarded action when ad-free entitlement arrives before the provider resolves', async () => {
    let release!: (watched: boolean) => void;
    const pending = new Promise<boolean>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter({ showRewarded: () => pending }, null);

    const reward = adapter.watchRewarded('offline_double');
    await Promise.resolve();
    adapter.setAdFreeOwned(true);
    release(false);

    expect(await reward).toEqual({ granted: true, reason: 'granted' });
    expect(adapter.getAdsToday()).toBe(0);
  });

  it('keeps a pending rewarded action granted when the stale provider rejects', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter({
      showRewarded: async () => {
        await pending;
        throw new Error('native ad dismissed');
      },
    }, null);

    const reward = adapter.watchRewarded('instant_task');
    await Promise.resolve();
    adapter.setAdFreeOwned(true);
    release();

    expect(await reward).toEqual({ granted: true, reason: 'granted' });
    expect(adapter.getAdsToday()).toBe(0);
  });

  it('does not let a stale restore response revoke a purchase completed while restore was pending', async () => {
    let releaseRestore!: (owned: boolean) => void;
    const pendingRestore = new Promise<boolean>((resolve) => { releaseRestore = resolve; });
    const adapter = new VillageMonetizationAdapter(
      null,
      { purchase: async () => 'purchased' },
      null,
      async () => pendingRestore,
    );

    const restore = adapter.restorePurchases();
    await Promise.resolve();
    expect((await adapter.buyAdFree()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);

    releaseRestore(false);
    expect((await restore).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('removes the rewarded provider and daily cap after ad-free purchase', async () => {
    let providerCalls = 0;
    const adapter = new VillageMonetizationAdapter({
      showRewarded: async () => { providerCalls += 1; return false; },
    }, { purchase: async () => 'purchased' });

    expect((await adapter.buyAdFree()).granted).toBe(true);
    const results = await Promise.all(
      Array.from({ length: Village_DAILY_REWARDED_LIMIT + 2 }, () => adapter.watchRewarded('offline_double')),
    );

    expect(results.every((result) => result.granted)).toBe(true);
    expect(providerCalls).toBe(0);
    expect(adapter.getAdsToday()).toBe(0);
  });

  it('bridges the existing MonetizationService contract without leaking provider details into Village', async () => {
    const service = {
      showRewardedAd: async () => true,
      purchase: async (productId: 'ad_free') => productId === 'ad_free',
    };
    const adapter = createVillageMonetizationAdapter(service);

    expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect((await adapter.buyAdFree()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('does not grant an ad-free purchase when the existing bridge returns a truthy non-boolean value', async () => {
    const adapter = createVillageMonetizationAdapter({
      showRewardedAd: async () => true,
      purchase: async () => 'purchased' as never,
    });

    expect(await adapter.buyAdFree()).toEqual({ granted: false, reason: 'provider_failed' });
    expect(adapter.isAdFree()).toBe(false);
  });

  it('mirrors an already-restored ad-free entitlement from the existing service', () => {
    const adapter = createVillageMonetizationAdapter({
      showRewardedAd: async () => true,
      purchase: async () => true,
      isAdFreeOwned: () => true,
    });

    expect(adapter.isAdFree()).toBe(true);
  });

  it('keeps the game playable when the native entitlement lookup throws', () => {
    const adapter = createVillageMonetizationAdapter({
      showRewardedAd: async () => true,
      purchase: async () => true,
      isAdFreeOwned: () => { throw new Error('native bridge unavailable'); },
    });

    expect(adapter.isAdFree()).toBe(false);
  });

  it('does not treat a malformed existing service entitlement as ownership', () => {
    const adapter = createVillageMonetizationAdapter({
      showRewardedAd: async () => true,
      purchase: async () => true,
      isAdFreeOwned: () => 'yes' as never,
    });

    expect(adapter.isAdFree()).toBe(false);
  });

  it('mirrors an entitlement change delivered through the native bridge callback', async () => {
    nativeBridge.onAdFreeChanged = null;
    const handle = await createNativeVillageMonetization();

    const onAdFreeChanged = nativeBridge.onAdFreeChanged as ((owned: boolean) => void) | null;
    expect(onAdFreeChanged).not.toBeNull();
    if (!onAdFreeChanged) return;
    onAdFreeChanged(true);

    expect(handle.adapter.isAdFree()).toBe(true);
  });

  it('resets the rewarded limit when the local calendar day changes', async () => {
    vi.setSystemTime(new Date(2026, 8, 6, 23, 59));
    const adapter = new VillageMonetizationAdapter({ showRewarded: async () => true }, null);
    for (let i = 0; i < 5; i += 1) await adapter.watchRewarded('offline_double');
    expect(adapter.getAdsToday()).toBe(5);

    vi.setSystemTime(new Date(2026, 8, 7, 0, 1));
    expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect(adapter.getAdsToday()).toBe(1);
  });

  it('does not count an in-flight ad from yesterday against today', async () => {
    vi.setSystemTime(new Date(2026, 8, 6, 23, 59));
    const releases: Array<(watched: boolean) => void> = [];
    const adapter = new VillageMonetizationAdapter({
      showRewarded: () => new Promise<boolean>((resolve) => { releases.push(resolve); }),
    }, null);

    const yesterday = adapter.watchRewarded('offline_double');
    await Promise.resolve();
    vi.setSystemTime(new Date(2026, 8, 7, 0, 1));
    const today = adapter.watchRewarded('offline_double');
    await Promise.resolve();

    releases[0]?.(true);
    await yesterday;
    expect(adapter.getAdsToday()).toBe(0);

    releases[1]?.(true);
    await today;
    expect(adapter.getAdsToday()).toBe(1);
    vi.useRealTimers();
  });

  it('accumulates every ad that crosses midnight after today has been initialized', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 6, 23, 59));
      const counts = new Map<string, number>();
      const releases: Array<(watched: boolean) => void> = [];
      const adapter = new VillageMonetizationAdapter(
        { showRewarded: () => new Promise<boolean>((resolve) => { releases.push(resolve); }) },
        null,
        {
          read: (day) => counts.get(day) ?? 0,
          write: (day, count) => counts.set(day, count),
        },
      );

      const yesterdayFirst = adapter.watchRewarded('offline_double');
      const yesterdaySecond = adapter.watchRewarded('instant_task');
      await Promise.resolve();

      vi.setSystemTime(new Date(2026, 8, 7, 0, 1));
      const today = adapter.watchRewarded('intervention_charge');
      await Promise.resolve();

      releases[0]?.(true);
      releases[1]?.(true);
      await Promise.all([yesterdayFirst, yesterdaySecond]);
      releases[2]?.(true);
      await today;

      expect(counts.get('2026-8-6')).toBe(2);
      expect(counts.get('2026-8-7')).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores the daily usage count when the adapter is recreated', async () => {
    const counts = new Map<string, number>();
    const usageStore = {
      read: (day: string) => counts.get(day) ?? 0,
      write: (day: string, count: number) => counts.set(day, count),
    };
    const first = new VillageMonetizationAdapter({ showRewarded: async () => true }, null, usageStore);
    await first.watchRewarded('offline_double');
    const second = new VillageMonetizationAdapter({ showRewarded: async () => true }, null, usageStore);

    expect(second.getAdsToday()).toBe(1);
  });

  it('keeps a successful rewarded ad when usage persistence fails', async () => {
    const adapter = new VillageMonetizationAdapter(
      { showRewarded: async () => true },
      null,
      { read: () => 0, write: () => { throw new Error('storage unavailable'); } },
    );

    expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect(adapter.getAdsToday()).toBe(1);
  });

  it('keeps the adapter playable when usage restoration fails', async () => {
    const adapter = new VillageMonetizationAdapter(
      { showRewarded: async () => true },
      null,
      { read: () => { throw new Error('storage unavailable'); }, write: () => {} },
    );

    expect(adapter.getAdsToday()).toBe(0);
    expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
  });

  it('clamps a corrupted restored usage count to the daily cap', async () => {
    let providerCalls = 0;
    const adapter = new VillageMonetizationAdapter(
      { showRewarded: async () => { providerCalls += 1; return true; } },
      null,
      { read: () => Number.MAX_SAFE_INTEGER, write: () => {} },
    );

    expect(adapter.getAdsToday()).toBe(Village_DAILY_REWARDED_LIMIT);
    expect((await adapter.watchRewarded('offline_double')).reason).toBe('daily_limit');
    expect(providerCalls).toBe(0);
  });

  it('reserves the daily quota across concurrent rewarded requests', async () => {
    let calls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const adapter = new VillageMonetizationAdapter({
      showRewarded: async () => {
        calls += 1;
        await pending;
        return true;
      },
    }, null);

    const requests = Array.from({ length: 6 }, () => adapter.watchRewarded('instant_task'));
    await Promise.resolve();
    expect(calls).toBe(5);
    expect(adapter.getAdsToday()).toBe(0);
    release();

    const results = await Promise.all(requests);
    expect(results.filter((result) => result.granted)).toHaveLength(5);
    expect(results.filter((result) => result.reason === 'daily_limit')).toHaveLength(1);
    expect(adapter.getAdsToday()).toBe(5);
  });
});
