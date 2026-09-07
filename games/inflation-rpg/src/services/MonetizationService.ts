import { OnestoreIap } from '@forge/inflation-rpg-native-onestore-iap';
import type { PurchaseInfo } from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from './IapTypes';
import { AdManager } from './AdManager';
import { IAP_CATALOG } from './IapCatalog';
import { IapManager } from './IapManager';

export interface MonetizationServiceOptions {
  adFreeOwned: boolean;
  onAdFreeChanged: (owned: boolean) => void;
  onCrackStonesAwarded: (amount: number) => void;
  licenseKey: string;
  rewardedUnitId: string;
  bannerUnitId: string;
}

export class MonetizationService {
  private ad: AdManager;
  private iap: IapManager;
  private adFreeOwned: boolean;

  constructor(private opts: MonetizationServiceOptions) {
    this.adFreeOwned = opts.adFreeOwned;
    this.ad = new AdManager({
      rewardedUnitId: opts.rewardedUnitId,
      bannerUnitId: opts.bannerUnitId,
    });
    this.iap = new IapManager(OnestoreIap, opts.licenseKey);
  }

  private applyRestoredAdFreeEntitlement(restored: PurchaseInfo[]): void {
    const hasAdFree = restored.some((purchase) => purchase.productId === 'ad_free');
    // A non-consumable purchase is permanent for the current session. Restore
    // may be empty while the store/account bridge is still unavailable; an
    // empty response must not turn a previously confirmed entitlement off.
    if (hasAdFree && !this.adFreeOwned) {
      this.adFreeOwned = true;
      this.opts.onAdFreeChanged(true);
    }
  }

  async initialize(): Promise<void> {
    await Promise.all([this.ad.initialize(), this.iap.initialize()]);
    await this.iap.queryProducts();

    const restored = await this.iap.restorePurchases();
    this.applyRestoredAdFreeEntitlement(restored);

    if (!this.adFreeOwned) await this.ad.showBanner();
    else await this.ad.hideBanner();
  }

  setAdFreeOwned(owned: boolean): void {
    this.adFreeOwned = owned;
    if (owned) void this.ad.hideBanner();
    else void this.ad.showBanner();
  }

  async showRewardedAd(): Promise<boolean> {
    if (this.adFreeOwned) return true;
    return this.ad.showRewardedAd();
  }

  async purchase(productId: IapProductId): Promise<boolean> {
    const result = await this.iap.purchase(productId);
    if (result.status !== 'success') return false;

    if (productId === 'ad_free') {
      this.setAdFreeOwned(true);
      this.opts.onAdFreeChanged(true);
    } else {
      const entry = IAP_CATALOG[productId];
      if (entry.type === 'consumable') {
        this.opts.onCrackStonesAwarded(entry.crackStones);
      }
    }
    return true;
  }

  getProductPrice(productId: IapProductId): string | undefined {
    return this.iap.getProduct(productId)?.price;
  }

  isAdFreeOwned(): boolean {
    return this.adFreeOwned;
  }

  async restorePurchasesManually(): Promise<PurchaseInfo[]> {
    const restored = await this.iap.restorePurchases();
    this.applyRestoredAdFreeEntitlement(restored);
    return restored;
  }
}
