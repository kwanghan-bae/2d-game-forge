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

export type V4RestorePurchasesProvider = () => Promise<boolean>;

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

function isRewardedPlacement(value: unknown): value is V4RewardedPlacement {
  return value === 'offline_double' || value === 'instant_task' || value === 'intervention_charge';
}

export function hasV4AdFreeEntitlement(
  purchases: readonly {
    productId?: unknown;
    purchaseToken?: unknown;
    purchaseTime?: unknown;
    acknowledged?: unknown;
  }[],
): boolean {
  return purchases.some((purchase) => purchase?.productId === 'ad_free'
    && typeof purchase.purchaseToken === 'string'
    && purchase.purchaseToken.trim().length > 0
    && typeof purchase.purchaseTime === 'number'
    && Number.isFinite(purchase.purchaseTime)
    && purchase.purchaseTime >= 0
    && typeof purchase.acknowledged === 'boolean');
}

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
  restorePurchases?: V4RestorePurchasesProvider,
): V4MonetizationAdapter {
  const adapter = new V4MonetizationAdapter(
    { showRewarded: () => service.showRewardedAd() },
    { purchase: async () => (await service.purchase('ad_free') ? 'purchased' : 'failed') },
    usageStore,
    restorePurchases,
  );
  try {
    if (service.isAdFreeOwned?.()) adapter.setAdFreeOwned(true);
  } catch {
    // Entitlement restoration is optional; a broken bridge must not block play.
  }
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
  let updateAdapterEntitlement: ((owned: boolean) => void) | undefined;
  const service = new MonetizationService({
    adFreeOwned,
    onAdFreeChanged: (owned) => {
      adFreeOwned = owned;
      updateAdapterEntitlement?.(owned);
      options.onAdFreeChanged?.(owned);
    },
    onCrackStonesAwarded: (amount) => options.onCrackStonesAwarded?.(amount),
    licenseKey: ADMOB_CONFIG.iapLicenseKey,
    rewardedUnitId: ADMOB_CONFIG.rewarded.android,
    bannerUnitId: ADMOB_CONFIG.banner.android,
  });
  const adapter = createV4MonetizationAdapter(service, options.usageStore, async () => {
    const restored = await service.restorePurchasesManually();
    return hasV4AdFreeEntitlement(restored);
  });
  updateAdapterEntitlement = (owned) => adapter.setAdFreeOwned(owned);
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
        const restored = await service.restorePurchasesManually();
        syncEntitlement();
        return hasV4AdFreeEntitlement(restored);
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
  private entitlementRevision = 0;
  private readonly listeners = new Set<() => void>();
  private rewardedDay = localDayKey();
  private rewardedInFlightByDay = new Map<string, number>();
  private adFreePurchaseInFlight: Promise<V4MonetizationResult> | null = null;
  private restorePurchasesInFlight: Promise<V4MonetizationResult> | null = null;
  private readonly restorePurchasesProvider: V4RestorePurchasesProvider | null;

  constructor(
    private readonly ads: V4AdProvider | null,
    private readonly purchases: V4PurchaseProvider | null,
    private readonly usageStore: V4RewardedUsageStore | null = null,
    restorePurchasesProvider: V4RestorePurchasesProvider | null = null,
  ) {
    this.restorePurchasesProvider = restorePurchasesProvider;
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
  canRestorePurchases(): boolean { return this.restorePurchasesProvider !== null; }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  setAdFreeOwned(owned: boolean): void {
    if (this.adFree === owned) return;
    this.adFree = owned;
    this.entitlementRevision += 1;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // A UI observer must never interrupt entitlement state updates.
      }
    }
  }

  async restorePurchases(): Promise<V4MonetizationResult> {
    if (this.restorePurchasesInFlight) return this.restorePurchasesInFlight;
    const restore = this.restorePurchasesProvider;
    if (!restore) return { granted: false, reason: 'provider_failed' };
    const restoreRevision = this.entitlementRevision;
    const pending = (async (): Promise<V4MonetizationResult> => {
      try {
        const owned = await restore();
        if (this.entitlementRevision !== restoreRevision) {
          return this.adFree
            ? { granted: true, reason: 'granted' }
            : { granted: false, reason: 'not_purchased' };
        }
        // A confirmed non-consumable entitlement is permanent for this
        // session. An empty/false restore result can be a transient store
        // response, so it may add ownership but never revoke it.
        if (owned === true) this.setAdFreeOwned(true);
        return this.adFree
          ? { granted: true, reason: 'granted' }
          : { granted: false, reason: 'not_purchased' };
      } catch {
        return { granted: false, reason: 'provider_failed' };
      }
    })();
    this.restorePurchasesInFlight = pending;
    try {
      return await pending;
    } finally {
      if (this.restorePurchasesInFlight === pending) this.restorePurchasesInFlight = null;
    }
  }

  async watchRewarded(placement: V4RewardedPlacement): Promise<V4MonetizationResult> {
    if (!isRewardedPlacement(placement)) return { granted: false, reason: 'provider_failed' };
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
      // The entitlement may be confirmed while the native ad UI is open. In
      // that case the ad result is stale: ad-free users receive the benefit
      // without consuming a daily ad slot, even if the provider reports a
      // cancellation or failure.
      if (this.adFree) return { granted: true, reason: 'granted' };
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
      return this.adFree
        ? { granted: true, reason: 'granted' }
        : { granted: false, reason: 'provider_failed' };
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
        // A native entitlement callback can complete while the purchase UI is
        // still pending. Preserve that authoritative grant even when the
        // older purchase promise resolves as cancelled or failed.
        if (this.adFree) return { granted: true, reason: 'granted' };
        if (result === 'purchased') {
          this.setAdFreeOwned(true);
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
