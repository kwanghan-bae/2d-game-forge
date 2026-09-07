import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PurchaseInfo } from '@forge/inflation-rpg-native-onestore-iap';

import { AdManager } from './AdManager';
import { IapManager } from './IapManager';
import { MonetizationService } from './MonetizationService';

vi.mock('./AdManager');
vi.mock('./IapManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./IapManager')>();
  return { ...actual, IapManager: vi.fn() };
});

describe('MonetizationService', () => {
  let adShowRewarded: ReturnType<typeof vi.fn>;
  let adShowBanner: ReturnType<typeof vi.fn>;
  let adHideBanner: ReturnType<typeof vi.fn>;
  let adDispose: ReturnType<typeof vi.fn>;
  let iapInit: ReturnType<typeof vi.fn>;
  let iapRestore: ReturnType<typeof vi.fn>;
  let iapPurchase: ReturnType<typeof vi.fn>;
  let svc: MonetizationService;
  let onAdFreeChanged: ReturnType<typeof vi.fn> & ((owned: boolean) => void);
  let onCrackStonesAwarded: ReturnType<typeof vi.fn> & ((amount: number) => void);
  let emitPurchaseUpdated: ((purchase: PurchaseInfo) => void) | undefined;

  beforeEach(() => {
    adShowRewarded = vi.fn().mockResolvedValue(true);
    adShowBanner = vi.fn().mockResolvedValue(undefined);
    adHideBanner = vi.fn().mockResolvedValue(undefined);
    adDispose = vi.fn().mockResolvedValue(undefined);
    iapInit = vi.fn().mockResolvedValue(undefined);
    iapRestore = vi.fn().mockResolvedValue([]);
    iapPurchase = vi.fn();
    onAdFreeChanged = vi.fn() as ReturnType<typeof vi.fn> & ((owned: boolean) => void);
    onCrackStonesAwarded = vi.fn() as ReturnType<typeof vi.fn> & ((amount: number) => void);
    emitPurchaseUpdated = undefined;

    (AdManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(function () {
      return {
        initialize: vi.fn().mockResolvedValue(undefined),
        showRewardedAd: adShowRewarded,
        showBanner: adShowBanner,
        hideBanner: adHideBanner,
        dispose: adDispose,
      };
    });
    (IapManager as unknown as { mockImplementation: (fn: (...args: unknown[]) => unknown) => void }).mockImplementation(function (...args: unknown[]) {
      emitPurchaseUpdated = typeof args[2] === 'function'
        ? args[2] as (purchase: PurchaseInfo) => void
        : undefined;
      return {
        initialize: iapInit,
        queryProducts: vi.fn().mockResolvedValue([]),
        restorePurchases: iapRestore,
        purchase: iapPurchase,
        dispose: vi.fn().mockResolvedValue(undefined),
      };
    });

    svc = new MonetizationService({
      adFreeOwned: false,
      onAdFreeChanged,
      onCrackStonesAwarded,
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

  it('does not promote a malformed restore record to ad-free ownership', async () => {
    iapRestore.mockResolvedValue([
      { productId: 'ad_free' } as unknown as PurchaseInfo,
    ]);

    await svc.initialize();

    expect(svc.isAdFreeOwned()).toBe(false);
    expect(onAdFreeChanged).not.toHaveBeenCalledWith(true);
    expect(adShowBanner).toHaveBeenCalled();
  });

  it('grants a validated ad-free purchase through the service boundary', async () => {
    iapPurchase.mockResolvedValue({
      status: 'success',
      purchase: { productId: 'ad_free', purchaseToken: 'tok', purchaseTime: 0, acknowledged: true },
    });

    expect(await svc.purchase('ad_free')).toBe(true);
    expect(svc.isAdFreeOwned()).toBe(true);
    expect(onAdFreeChanged).toHaveBeenCalledWith(true);
  });

  it('awards a validated consumable purchase and ignores cancellation', async () => {
    iapPurchase.mockResolvedValueOnce({
      status: 'success',
      purchase: {
        productId: 'crack_stone_pack_small',
        purchaseToken: 'tok-small',
        purchaseTime: 0,
        acknowledged: true,
      },
    });
    expect(await svc.purchase('crack_stone_pack_small')).toBe(true);
    expect(onCrackStonesAwarded).toHaveBeenCalledWith(10);

    iapPurchase.mockResolvedValueOnce({ status: 'canceled' });
    expect(await svc.purchase('crack_stone_pack_small')).toBe(false);
    expect(onCrackStonesAwarded).toHaveBeenCalledTimes(1);
  });

  it('applies a validated late ad-free purchaseUpdated event immediately', async () => {
    await svc.initialize();

    emitPurchaseUpdated?.({
      productId: 'ad_free', purchaseToken: 'tok_late_event', purchaseTime: 100, acknowledged: false,
    });

    expect(svc.isAdFreeOwned()).toBe(true);
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

  it('does not show a banner when dispose races with an in-flight initialization', async () => {
    let releaseRestore!: (purchases: never[]) => void;
    iapRestore.mockReturnValueOnce(new Promise((resolve) => { releaseRestore = resolve; }));

    const initialize = svc.initialize();
    await Promise.resolve();
    const dispose = svc.dispose();
    releaseRestore([]);

    await Promise.all([initialize, dispose]);

    expect(adDispose).toHaveBeenCalled();
    expect(adShowBanner).not.toHaveBeenCalled();
  });

  it('does not report a rewarded success when dispose wins the provider race', async () => {
    let releaseRewarded!: (result: boolean) => void;
    adShowRewarded.mockReturnValueOnce(new Promise<boolean>((resolve) => { releaseRewarded = resolve; }));

    const rewarded = svc.showRewardedAd();
    await Promise.resolve();
    const dispose = svc.dispose();
    releaseRewarded(true);

    await Promise.all([dispose, expect(rewarded).resolves.toBe(false)]);
    expect(adDispose).toHaveBeenCalledOnce();
  });
});
