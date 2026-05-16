import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor-community/admob', () => {
  const showRewardVideoAd = vi.fn().mockResolvedValue({ amount: 1, type: 'boost' });
  const prepareRewardVideoAd = vi.fn().mockResolvedValue(undefined);
  const showBanner = vi.fn().mockResolvedValue(undefined);
  const hideBanner = vi.fn().mockResolvedValue(undefined);
  const initialize = vi.fn().mockResolvedValue(undefined);
  return {
    AdMob: { initialize, prepareRewardVideoAd, showRewardVideoAd, showBanner, hideBanner },
    BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
    BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  };
});

import { AdMob } from '@capacitor-community/admob';
import { AdManager } from './AdManager';

describe('AdManager', () => {
  let mgr: AdManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = new AdManager({
      rewardedUnitId: 'test-rewarded',
      bannerUnitId: 'test-banner',
    });
  });

  it('initialize calls AdMob.initialize once (idempotent)', async () => {
    await mgr.initialize();
    await mgr.initialize();
    expect((AdMob.initialize as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('showRewardedAd resolves true on completion', async () => {
    await mgr.initialize();
    const ok = await mgr.showRewardedAd();
    expect(ok).toBe(true);
    expect(AdMob.showRewardVideoAd).toHaveBeenCalled();
  });

  it('showBanner forwards BOTTOM position and resolves', async () => {
    await mgr.initialize();
    await mgr.showBanner();
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'test-banner', position: 'BOTTOM_CENTER' }),
    );
  });

  it('hideBanner forwards', async () => {
    await mgr.initialize();
    await mgr.showBanner();
    await mgr.hideBanner();
    expect(AdMob.hideBanner).toHaveBeenCalled();
  });
});
