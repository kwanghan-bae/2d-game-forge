import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

export interface AdManagerConfig {
  rewardedUnitId: string;
  bannerUnitId: string;
}

export class AdManager {
  private initialized = false;
  private initializeInFlight: Promise<void> | null = null;
  private bannerVisible = false;
  private bannerDesiredVisible = false;
  private bannerReconcileInFlight: Promise<void> | null = null;

  constructor(private cfg: AdManagerConfig) {}

  async initialize(): Promise<void> {
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
    try {
      await AdMob.initialize({
        initializeForTesting: true,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('[AdManager] initialize failed:', e);
    }
  }

  async showRewardedAd(): Promise<boolean> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.cfg.rewardedUnitId });
      const result = await AdMob.showRewardVideoAd();
      return result !== null && result !== undefined;
    } catch (e) {
      console.warn('[AdManager] showRewardedAd failed:', e);
      return false;
    }
  }

  async showBanner(): Promise<void> {
    this.bannerDesiredVisible = true;
    return this.reconcileBannerVisibility();
  }

  async hideBanner(): Promise<void> {
    this.bannerDesiredVisible = false;
    return this.reconcileBannerVisibility();
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
