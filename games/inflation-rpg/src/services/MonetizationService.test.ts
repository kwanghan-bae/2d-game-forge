import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdManager } from './AdManager';
import { IapManager } from './IapManager';
import { MonetizationService } from './MonetizationService';

vi.mock('./AdManager');
vi.mock('./IapManager');

describe('MonetizationService', () => {
  let adShowRewarded: ReturnType<typeof vi.fn>;
  let adShowBanner: ReturnType<typeof vi.fn>;
  let adHideBanner: ReturnType<typeof vi.fn>;
  let iapInit: ReturnType<typeof vi.fn>;
  let iapRestore: ReturnType<typeof vi.fn>;
  let iapPurchase: ReturnType<typeof vi.fn>;
  let svc: MonetizationService;
  let onAdFreeChanged: ReturnType<typeof vi.fn> & ((owned: boolean) => void);

  beforeEach(() => {
    adShowRewarded = vi.fn().mockResolvedValue(true);
    adShowBanner = vi.fn().mockResolvedValue(undefined);
    adHideBanner = vi.fn().mockResolvedValue(undefined);
    iapInit = vi.fn().mockResolvedValue(undefined);
    iapRestore = vi.fn().mockResolvedValue([]);
    iapPurchase = vi.fn();
    onAdFreeChanged = vi.fn() as ReturnType<typeof vi.fn> & ((owned: boolean) => void);

    (AdManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(function () {
      return {
        initialize: vi.fn().mockResolvedValue(undefined),
        showRewardedAd: adShowRewarded,
        showBanner: adShowBanner,
        hideBanner: adHideBanner,
      };
    });
    (IapManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(function () {
      return {
        initialize: iapInit,
        queryProducts: vi.fn().mockResolvedValue([]),
        restorePurchases: iapRestore,
        purchase: iapPurchase,
      };
    });

    svc = new MonetizationService({
      adFreeOwned: false,
      onAdFreeChanged,
      onCrackStonesAwarded: vi.fn(),
      licenseKey: 'TEST',
      rewardedUnitId: 'r',
      bannerUnitId: 'b',
    });
  });

  it('initialize triggers IAP restore', async () => {
    await svc.initialize();
    expect(iapInit).toHaveBeenCalled();
    expect(iapRestore).toHaveBeenCalled();
  });

  it('shares concurrent initialization across the ad and IAP bootstrap', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    iapInit.mockReturnValueOnce(pending);

    const first = svc.initialize();
    const second = svc.initialize();
    await Promise.resolve();
    expect(iapInit).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);
    expect(iapRestore).toHaveBeenCalledTimes(1);
    expect(adShowBanner).toHaveBeenCalledTimes(1);
  });

  it('initialize banner shown when adFreeOwned=false', async () => {
    await svc.initialize();
    expect(adShowBanner).toHaveBeenCalled();
  });

  it('showRewardedAd: when adFreeOwned=true, short-circuits to success without calling AdMob', async () => {
    svc.setAdFreeOwned(true);
    const ok = await svc.showRewardedAd();
    expect(ok).toBe(true);
    expect(adShowRewarded).not.toHaveBeenCalled();
  });

  it('restore returning ad_free updates adFreeOwned via onAdFreeChanged', async () => {
    iapRestore.mockResolvedValue([
      { productId: 'ad_free', purchaseToken: 't', purchaseTime: 0, acknowledged: true },
    ]);
    await svc.initialize();
    expect(onAdFreeChanged).toHaveBeenCalledWith(true);
  });

  it('does not revoke a previously owned ad-free entitlement when initialize restore is empty', async () => {
    svc = new MonetizationService({
      adFreeOwned: true,
      onAdFreeChanged,
      onCrackStonesAwarded: vi.fn(),
      licenseKey: 'TEST',
      rewardedUnitId: 'r',
      bannerUnitId: 'b',
    });

    await svc.initialize();

    expect(svc.isAdFreeOwned()).toBe(true);
    expect(onAdFreeChanged).not.toHaveBeenCalledWith(false);
    expect(adHideBanner).toHaveBeenCalled();
  });

  it('does not revoke a previously owned ad-free entitlement on an empty manual restore', async () => {
    svc.setAdFreeOwned(true);

    await svc.restorePurchasesManually();

    expect(svc.isAdFreeOwned()).toBe(true);
    expect(onAdFreeChanged).not.toHaveBeenCalledWith(false);
  });
});
