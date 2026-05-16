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
  private bannerVisible = false;

  constructor(private cfg: AdManagerConfig) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
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
    if (this.bannerVisible) return;
    try {
      await AdMob.showBanner({
        adId: this.cfg.bannerUnitId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      this.bannerVisible = true;
    } catch (e) {
      console.warn('[AdManager] showBanner failed:', e);
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.bannerVisible) return;
    try {
      await AdMob.hideBanner();
      this.bannerVisible = false;
    } catch (e) {
      console.warn('[AdManager] hideBanner failed:', e);
    }
  }

  isBannerVisible(): boolean {
    return this.bannerVisible;
  }
}
