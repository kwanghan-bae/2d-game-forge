import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

export interface AdManagerConfig {
  rewardedUnitId: string;
  bannerUnitId: string;
}

function isValidRewardedResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reward = value as { type?: unknown; amount?: unknown };
  return typeof reward.type === 'string'
    && reward.type.trim().length > 0
    && typeof reward.amount === 'number'
    && Number.isFinite(reward.amount)
    && reward.amount > 0;
}

export class AdManager {
  private initialized = false;
  private initializeInFlight: Promise<void> | null = null;
  private bannerVisible = false;
  private bannerDesiredVisible = false;
  private bannerReconcileInFlight: Promise<void> | null = null;
  private disposed = false;

  constructor(private cfg: AdManagerConfig) {}

  async initialize(): Promise<void> {
    if (this.disposed) return;
    if (this.initialized) return;
    if (this.initializeInFlight) return this.initializeInFlight;
    const pending = this.initializeProvider();
    this.initializeInFlight = pending;
    try {
      await pending;
    } finally {
      if (this.initializeInFlight === pending) this.initializeInFlight = null;
    }
  }

  private async initializeProvider(): Promise<void> {
    if (this.disposed) return;
    try {
      await AdMob.initialize({
        initializeForTesting: true,
      });
      if (!this.disposed) this.initialized = true;
    } catch (e) {
      console.warn('[AdManager] initialize failed:', e);
    }
  }

  async showRewardedAd(): Promise<boolean> {
    if (this.disposed) return false;
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.cfg.rewardedUnitId });
      if (this.disposed) return false;
      const result = await AdMob.showRewardVideoAd();
      return !this.disposed && isValidRewardedResponse(result);
    } catch (e) {
      console.warn('[AdManager] showRewardedAd failed:', e);
      return false;
    }
  }

  async showBanner(): Promise<void> {
    if (this.disposed) return;
    this.bannerDesiredVisible = true;
    return this.reconcileBannerVisibility();
  }

  async hideBanner(): Promise<void> {
    this.bannerDesiredVisible = false;
    return this.reconcileBannerVisibility();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.bannerDesiredVisible = false;
    await this.reconcileBannerVisibility();
  }

  private async reconcileBannerVisibility(): Promise<void> {
    if (this.bannerReconcileInFlight) return this.bannerReconcileInFlight;

    const pending = (async () => {
      while (this.bannerVisible !== this.bannerDesiredVisible) {
        const desiredVisible = this.bannerDesiredVisible;
        try {
          if (desiredVisible) {
            await AdMob.showBanner({
              adId: this.cfg.bannerUnitId,
              adSize: BannerAdSize.ADAPTIVE_BANNER,
              position: BannerAdPosition.BOTTOM_CENTER,
              margin: 0,
            });
          } else {
            await AdMob.hideBanner();
          }
          this.bannerVisible = desiredVisible;
        } catch (e) {
          console.warn(`[AdManager] ${desiredVisible ? 'show' : 'hide'}Banner failed:`, e);
          break;
        }
      }
    })();
    this.bannerReconcileInFlight = pending;
    try {
      await pending;
    } finally {
      if (this.bannerReconcileInFlight === pending) this.bannerReconcileInFlight = null;
    }
  }

  isBannerVisible(): boolean {
    return this.bannerVisible;
  }
}
