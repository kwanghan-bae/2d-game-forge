import { describe, expect, it } from 'vitest';
import { createV4MonetizationAdapter, V4MonetizationAdapter } from '../monetization';

describe('v4 monetization adapter', () => {
  it('limits rewarded ads to five successful views and never blocks play', async () => {
    let calls = 0;
    const adapter = new V4MonetizationAdapter({
      showRewarded: async () => { calls += 1; return true; },
    }, null);
    for (let i = 0; i < 5; i += 1) expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect((await adapter.watchRewarded('instant_task')).reason).toBe('daily_limit');
    expect(calls).toBe(5);
  });

  it('does not grant rewards when providers fail or a purchase is cancelled', async () => {
    const adapter = new V4MonetizationAdapter({ showRewarded: async () => false }, { purchase: async () => 'cancelled' });
    expect((await adapter.watchRewarded('intervention_charge')).reason).toBe('provider_failed');
    expect((await adapter.buyAdFree()).reason).toBe('not_purchased');
    expect(adapter.isAdFree()).toBe(false);
  });

  it('persists ad-free state in the adapter after a successful purchase', async () => {
    const adapter = new V4MonetizationAdapter(null, { purchase: async () => 'purchased' });
    expect((await adapter.buyAdFree()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });

  it('bridges the existing MonetizationService contract without leaking provider details into V4', async () => {
    const service = {
      showRewardedAd: async () => true,
      purchase: async (productId: 'ad_free') => productId === 'ad_free',
    };
    const adapter = createV4MonetizationAdapter(service);

    expect((await adapter.watchRewarded('offline_double')).granted).toBe(true);
    expect((await adapter.buyAdFree()).granted).toBe(true);
    expect(adapter.isAdFree()).toBe(true);
  });
});
