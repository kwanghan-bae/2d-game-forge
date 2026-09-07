import { OnestoreIap } from '@forge/inflation-rpg-native-onestore-iap';
import type { PurchaseInfo } from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from './IapTypes';
import { AdManager } from './AdManager';
import { IAP_CATALOG } from './IapCatalog';
import { IapManager, isValidIapPurchaseInfo } from './IapManager';

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
  private initialized = false;
  private initializeInFlight: Promise<void> | null = null;
  private disposed = false;

  constructor(private opts: MonetizationServiceOptions) {
    this.adFreeOwned = opts.adFreeOwned === true;
    this.ad = new AdManager({
      rewardedUnitId: opts.rewardedUnitId,
      bannerUnitId: opts.bannerUnitId,
    });
    this.iap = new IapManager(OnestoreIap, opts.licenseKey, (purchase) => {
      if (purchase.productId !== 'ad_free' || this.disposed) return;
      this.grantAdFreeEntitlement();
    });
  }

  private grantAdFreeEntitlement(): void {
    if (this.adFreeOwned) return;
    this.setAdFreeOwned(true);
    this.opts.onAdFreeChanged(true);
  }

  private applyRestoredAdFreeEntitlement(restored: PurchaseInfo[]): void {
    // IapManager already filters native restore payloads, but keep this
    // service boundary defensive as well. A malformed bridge/mock must not
    // become a permanent entitlement merely because it has the right product
    // id.
    const hasAdFree = restored.some((purchase) => isValidIapPurchaseInfo(purchase)
      && purchase.productId === 'ad_free');
    // A non-consumable purchase is permanent for the current session. Restore
    // may be empty while the store/account bridge is still unavailable; an
    // empty response must not turn a previously confirmed entitlement off.
    if (hasAdFree) this.grantAdFreeEntitlement();
  }

  async initialize(): Promise<void> {
    if (this.disposed) return;
    if (this.initialized) return;
    if (this.initializeInFlight) return this.initializeInFlight;
    const pending = (async () => {
      await Promise.all([this.ad.initialize(), this.iap.initialize()]);
      if (this.disposed) return;
      await this.iap.queryProducts();

      const restored = await this.iap.restorePurchases();
      if (this.disposed) return;
      this.applyRestoredAdFreeEntitlement(restored);

      if (this.disposed) return;
      if (!this.adFreeOwned) await this.ad.showBanner();
      else await this.ad.hideBanner();
      if (!this.disposed) this.initialized = true;
    })();
    this.initializeInFlight = pending;
    try {
      await pending;
    } finally {
      if (this.initializeInFlight === pending) this.initializeInFlight = null;
    }
  }

  setAdFreeOwned(owned: boolean): void {
    this.adFreeOwned = owned === true;
    if (this.adFreeOwned || this.disposed) void this.ad.hideBanner();
    else void this.ad.showBanner();
  }

  async showRewardedAd(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.adFreeOwned) return true;
    const result = await this.ad.showRewardedAd();
    return !this.disposed && result;
  }

  async purchase(productId: IapProductId): Promise<boolean> {
    if (this.disposed) return false;
    if (typeof productId !== 'string' || !Object.prototype.hasOwnProperty.call(IAP_CATALOG, productId)) return false;
    const result = await this.iap.purchase(productId);
    if (this.disposed) return false;
    if (result.status !== 'success') return false;

    if (productId === 'ad_free') {
      this.grantAdFreeEntitlement();
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
    if (this.disposed) return [];
    const restored = await this.iap.restorePurchases();
    if (this.disposed) return [];
    this.applyRestoredAdFreeEntitlement(restored);
    return restored;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await Promise.all([
      this.ad.dispose(),
      this.iap.dispose?.(),
    ]);
  }
}
