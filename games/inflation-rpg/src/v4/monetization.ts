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
  isAdFreeOwned?: () => boolean;
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

function normalizeDailyUsage(count: number): number {
  return Number.isFinite(count)
    ? Math.min(V4_DAILY_REWARDED_LIMIT, Math.max(0, Math.floor(count)))
    : 0;
}

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
        return parsed.day === day ? normalizeDailyUsage(parsed.count ?? 0) : 0;
      } catch {
        return 0;
      }
    },
    write(day, count) {
      if (!storage) return;
      try {
        storage.setItem(V4_REWARDED_USAGE_KEY, JSON.stringify({ day, count: normalizeDailyUsage(count) }));
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
  const adapter = new V4MonetizationAdapter(
    { showRewarded: () => service.showRewardedAd() },
    { purchase: async () => (await service.purchase('ad_free') ? 'purchased' : 'failed') },
    usageStore,
  );
  if (service.isAdFreeOwned?.()) adapter.setAdFreeOwned(true);
  return adapter;
}

export interface NativeV4MonetizationOptions {
  adFreeOwned?: boolean;
  usageStore?: V4RewardedUsageStore;
  onAdFreeChanged?: (owned: boolean) => void;
  onCrackStonesAwarded?: (amount: number) => void;
}

export interface NativeV4MonetizationHandle {
  adapter: V4MonetizationAdapter;
  initialize(): Promise<boolean>;
  restorePurchases(): Promise<boolean>;
}

/**
 * Lazily wires V4 to the existing Capacitor AdMob/OneStore service. The
 * dynamic imports keep web tests and the dev-shell free from native startup
 * side effects; the returned boolean makes provider failure non-fatal.
 */
export async function createNativeV4Monetization(
  options: NativeV4MonetizationOptions = {},
): Promise<NativeV4MonetizationHandle> {
  const [{ MonetizationService }, { ADMOB_CONFIG }] = await Promise.all([
    import('../services/MonetizationService'),
    import('../config/monetization.config'),
  ]);
  let adFreeOwned = options.adFreeOwned ?? false;
  const service = new MonetizationService({
    adFreeOwned,
    onAdFreeChanged: (owned) => {
      adFreeOwned = owned;
      options.onAdFreeChanged?.(owned);
    },
    onCrackStonesAwarded: (amount) => options.onCrackStonesAwarded?.(amount),
    licenseKey: ADMOB_CONFIG.iapLicenseKey,
    rewardedUnitId: ADMOB_CONFIG.rewarded.android,
    bannerUnitId: ADMOB_CONFIG.banner.android,
  });
  const adapter = createV4MonetizationAdapter(service, options.usageStore);
  adapter.setAdFreeOwned(adFreeOwned);
  const syncEntitlement = () => {
    const owned = service.isAdFreeOwned();
    adapter.setAdFreeOwned(owned);
    return owned;
  };

  return {
    adapter,
    async initialize() {
      try {
        await service.initialize();
        syncEntitlement();
        return true;
      } catch {
        return false;
      }
    },
    async restorePurchases() {
      try {
        await service.restorePurchasesManually();
        syncEntitlement();
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Thin adapter for AdMob/IAP. The game remains playable when either provider
 * is unavailable; callers only apply rewards when `granted` is true.
 */
export class V4MonetizationAdapter {
  private adsToday = 0;
  private adFree = false;
  private rewardedDay = localDayKey();
  private rewardedInFlightByDay = new Map<string, number>();
  private adFreePurchaseInFlight: Promise<V4MonetizationResult> | null = null;

  constructor(
    private readonly ads: V4AdProvider | null,
    private readonly purchases: V4PurchaseProvider | null,
    private readonly usageStore: V4RewardedUsageStore | null = null,
  ) {
    this.adsToday = this.readStoredUsage(this.rewardedDay);
  }

  private readStoredUsage(day: string): number {
    try {
      const count = this.usageStore?.read(day) ?? 0;
      return normalizeDailyUsage(count);
    } catch {
      return 0;
    }
  }

  private resetForCurrentDay(): void {
    const currentDay = localDayKey();
    if (currentDay === this.rewardedDay) return;
    this.rewardedDay = currentDay;
    this.adsToday = this.readStoredUsage(currentDay);
  }

  getAdsToday(): number {
    this.resetForCurrentDay();
    return this.adsToday;
  }
  isAdFree(): boolean { return this.adFree; }
  setAdFreeOwned(owned: boolean): void { this.adFree = owned; }

  async watchRewarded(placement: V4RewardedPlacement): Promise<V4MonetizationResult> {
    this.resetForCurrentDay();
    if (this.adFree) return { granted: true, reason: 'granted' };
    const requestDay = this.rewardedDay;
    const inFlightForDay = this.rewardedInFlightByDay.get(requestDay) ?? 0;
    if (this.adsToday + inFlightForDay >= V4_DAILY_REWARDED_LIMIT) {
      return { granted: false, reason: 'daily_limit' };
    }
    if (!this.ads) return { granted: false, reason: 'provider_failed' };
    this.rewardedInFlightByDay.set(requestDay, inFlightForDay + 1);
    try {
      const watched = await this.ads.showRewarded(placement);
      if (!watched) return { granted: false, reason: 'provider_failed' };
      const usage = requestDay === this.rewardedDay
        ? normalizeDailyUsage(this.adsToday + 1)
        : normalizeDailyUsage(this.readStoredUsage(requestDay) + 1);
      if (requestDay === this.rewardedDay) this.adsToday = usage;
      try {
        this.usageStore?.write(requestDay, usage);
      } catch {
        // Reward delivery remains successful when local usage persistence is unavailable.
      }
      return { granted: true, reason: 'granted' };
    } catch {
      return { granted: false, reason: 'provider_failed' };
    } finally {
      const remaining = (this.rewardedInFlightByDay.get(requestDay) ?? 1) - 1;
      if (remaining > 0) this.rewardedInFlightByDay.set(requestDay, remaining);
      else this.rewardedInFlightByDay.delete(requestDay);
    }
  }

  async buyAdFree(): Promise<V4MonetizationResult> {
    if (this.adFree) return { granted: true, reason: 'granted' };
    if (this.adFreePurchaseInFlight) return this.adFreePurchaseInFlight;
    const purchases = this.purchases;
    if (!purchases) return { granted: false, reason: 'provider_failed' };
    const pending = (async (): Promise<V4MonetizationResult> => {
      try {
        const result = await purchases.purchase('ad_free');
        if (result === 'purchased') {
          this.adFree = true;
          return { granted: true, reason: 'granted' };
        }
        return { granted: false, reason: result === 'cancelled' ? 'not_purchased' : 'provider_failed' };
      } catch {
        return { granted: false, reason: 'provider_failed' };
      }
    })();
    this.adFreePurchaseInFlight = pending;
    try {
      return await pending;
    } finally {
      if (this.adFreePurchaseInFlight === pending) this.adFreePurchaseInFlight = null;
    }
  }
}
