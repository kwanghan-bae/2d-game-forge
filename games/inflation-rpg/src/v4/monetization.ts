export type V4RewardedPlacement = 'offline_double' | 'instant_task' | 'intervention_charge';

export interface V4AdProvider {
  showRewarded(placement: V4RewardedPlacement): Promise<boolean>;
}

export interface V4PurchaseProvider {
  purchase(productId: 'ad_free'): Promise<'purchased' | 'cancelled' | 'failed'>;
}

export interface V4MonetizationResult {
  granted: boolean;
  reason: 'granted' | 'daily_limit' | 'provider_failed' | 'not_purchased';
}

export const V4_DAILY_REWARDED_LIMIT = 5;

/**
 * Thin adapter for AdMob/IAP. The game remains playable when either provider
 * is unavailable; callers only apply rewards when `granted` is true.
 */
export class V4MonetizationAdapter {
  private adsToday = 0;
  private adFree = false;

  constructor(
    private readonly ads: V4AdProvider | null,
    private readonly purchases: V4PurchaseProvider | null,
  ) {}

  getAdsToday(): number { return this.adsToday; }
  isAdFree(): boolean { return this.adFree; }

  async watchRewarded(placement: V4RewardedPlacement): Promise<V4MonetizationResult> {
    if (this.adsToday >= V4_DAILY_REWARDED_LIMIT) return { granted: false, reason: 'daily_limit' };
    if (!this.ads) return { granted: false, reason: 'provider_failed' };
    try {
      const watched = await this.ads.showRewarded(placement);
      if (!watched) return { granted: false, reason: 'provider_failed' };
      this.adsToday += 1;
      return { granted: true, reason: 'granted' };
    } catch {
      return { granted: false, reason: 'provider_failed' };
    }
  }

  async buyAdFree(): Promise<V4MonetizationResult> {
    if (this.adFree) return { granted: true, reason: 'granted' };
    if (!this.purchases) return { granted: false, reason: 'provider_failed' };
    try {
      const result = await this.purchases.purchase('ad_free');
      if (result === 'purchased') {
        this.adFree = true;
        return { granted: true, reason: 'granted' };
      }
      return { granted: false, reason: result === 'cancelled' ? 'not_purchased' : 'provider_failed' };
    } catch {
      return { granted: false, reason: 'provider_failed' };
    }
  }
}
