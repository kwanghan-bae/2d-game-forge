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

  it('shares concurrent initialization with one provider call', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    (AdMob.initialize as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    const first = mgr.initialize();
    const second = mgr.initialize();
    await Promise.resolve();
    expect((AdMob.initialize as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    release();
    await Promise.all([first, second]);
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

  it('reconciles a hide request that arrives while showing the banner', async () => {
    let releaseShow!: () => void;
    const showPending = new Promise<void>((resolve) => { releaseShow = resolve; });
    (AdMob.showBanner as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(showPending)
      .mockResolvedValue(undefined);

    const show = mgr.showBanner();
    const hide = mgr.hideBanner();
    await Promise.resolve();

    expect(AdMob.showBanner).toHaveBeenCalledTimes(1);
    expect(AdMob.hideBanner).not.toHaveBeenCalled();

    releaseShow();
    await Promise.all([show, hide]);

    expect(AdMob.hideBanner).toHaveBeenCalledTimes(1);
    expect(mgr.isBannerVisible()).toBe(false);
  });

  it('does not show a rewarded ad after disposal wins the prepare race', async () => {
    let releasePrepare!: () => void;
    const preparePending = new Promise<void>((resolve) => { releasePrepare = resolve; });
    (AdMob.prepareRewardVideoAd as ReturnType<typeof vi.fn>).mockReturnValueOnce(preparePending);

    const rewarded = mgr.showRewardedAd();
    await Promise.resolve();
    await mgr.dispose();
    releasePrepare();

    await expect(rewarded).resolves.toBe(false);
    expect(AdMob.showRewardVideoAd).not.toHaveBeenCalled();
  });

  it('hides a banner when disposal races with an in-flight show', async () => {
    let releaseShow!: () => void;
    const showPending = new Promise<void>((resolve) => { releaseShow = resolve; });
    (AdMob.showBanner as ReturnType<typeof vi.fn>).mockReturnValueOnce(showPending);

    const show = mgr.showBanner();
    await Promise.resolve();
    const dispose = mgr.dispose();
    releaseShow();

    await Promise.all([show, dispose]);

    expect(AdMob.hideBanner).toHaveBeenCalledTimes(1);
    expect(mgr.isBannerVisible()).toBe(false);
  });
});
