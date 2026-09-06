export type V4RewardedPlacement = 'offline_double' | 'instant_task' | 'intervention_charge';

export interface V4AdProvider {
  showRewarded(placement: V4RewardedPlacement): Promise<boolean>;
}

export interface V4PurchaseProvider {
  purchase(productId: 'ad_free'): Promise<'purchased' | 'cancelled' | 'failed'>;
}

/** The smallest surface needed from the existing MonetizationService. */
export interface V4MonetizationServiceBridge {
  showRewardedAd(): Promise<boolean>;
  purchase(productId: 'ad_free'): Promise<boolean>;
}

export interface V4RewardedUsageStore {
  read(day: string): number;
  write(day: string, count: number): void;
}

export interface V4MonetizationResult {
  granted: boolean;
  reason: 'granted' | 'daily_limit' | 'provider_failed' | 'not_purchased';
}

export const V4_DAILY_REWARDED_LIMIT = 5;
export const V4_REWARDED_USAGE_KEY = 'shin-ui-eternal-sponsor-v4-rewarded-usage-v1';

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function localDayKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function createLocalV4RewardedUsageStore(
  storage: Storage | undefined = defaultStorage(),
): V4RewardedUsageStore {
  return {
    read(day) {
      if (!storage) return 0;
      try {
        const parsed = JSON.parse(storage.getItem(V4_REWARDED_USAGE_KEY) ?? '{}') as { day?: string; count?: number };
        return parsed.day === day && Number.isFinite(parsed.count) ? Math.max(0, Math.floor(parsed.count ?? 0)) : 0;
      } catch {
        return 0;
      }
    },
    write(day, count) {
      if (!storage) return;
      try {
        storage.setItem(V4_REWARDED_USAGE_KEY, JSON.stringify({ day, count }));
      } catch {
        // A storage quota/private-mode failure must never block gameplay.
      }
    },
  };
}

/**
 * Converts the existing AdMob/IAP service contract into the V4 provider
 * boundary. V4 screens only depend on the adapter and remain playable when
 * the native service is unavailable.
 */
export function createV4MonetizationAdapter(
  service: V4MonetizationServiceBridge,
  usageStore: V4RewardedUsageStore = createLocalV4RewardedUsageStore(),
): V4MonetizationAdapter {
  return new V4MonetizationAdapter(
    { showRewarded: () => service.showRewardedAd() },
    { purchase: async () => (await service.purchase('ad_free') ? 'purchased' : 'failed') },
    usageStore,
  );
}

/**
 * Thin adapter for AdMob/IAP. The game remains playable when either provider
 * is unavailable; callers only apply rewards when `granted` is true.
 */
export class V4MonetizationAdapter {
  private adsToday = 0;
  private adFree = false;
  private rewardedDay = localDayKey();

  constructor(
    private readonly ads: V4AdProvider | null,
    private readonly purchases: V4PurchaseProvider | null,
    private readonly usageStore: V4RewardedUsageStore | null = null,
  ) {
    this.adsToday = this.usageStore?.read(this.rewardedDay) ?? 0;
  }

  private resetForCurrentDay(): void {
    const currentDay = localDayKey();
    if (currentDay === this.rewardedDay) return;
    this.rewardedDay = currentDay;
    this.adsToday = this.usageStore?.read(currentDay) ?? 0;
  }

  getAdsToday(): number {
    this.resetForCurrentDay();
    return this.adsToday;
  }
  isAdFree(): boolean { return this.adFree; }

  async watchRewarded(placement: V4RewardedPlacement): Promise<V4MonetizationResult> {
    this.resetForCurrentDay();
    if (this.adsToday >= V4_DAILY_REWARDED_LIMIT) return { granted: false, reason: 'daily_limit' };
    if (!this.ads) return { granted: false, reason: 'provider_failed' };
    try {
      const watched = await this.ads.showRewarded(placement);
      if (!watched) return { granted: false, reason: 'provider_failed' };
      this.adsToday += 1;
      this.usageStore?.write(this.rewardedDay, this.adsToday);
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
