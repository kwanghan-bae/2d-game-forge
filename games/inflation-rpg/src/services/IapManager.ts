import type {
  OnestoreIapPlugin,
  ProductInfo,
  PurchaseInfo,
  PurchaseResult,
} from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from './IapTypes';
import { IAP_CATALOG, IAP_PRODUCT_IDS } from './IapCatalog';

function isKnownProductId(value: unknown): value is IapProductId {
  return typeof value === 'string' && IAP_PRODUCT_IDS.includes(value as IapProductId);
}

export function isValidIapPurchaseInfo(value: unknown): value is PurchaseInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const purchase = value as Partial<PurchaseInfo>;
  return isKnownProductId(purchase.productId)
    && typeof purchase.purchaseToken === 'string'
    && purchase.purchaseToken.trim().length > 0
    && typeof purchase.purchaseTime === 'number'
    && Number.isFinite(purchase.purchaseTime)
    && purchase.purchaseTime >= 0
    && typeof purchase.acknowledged === 'boolean';
}

export function isValidIapProductInfo(value: unknown): value is ProductInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const product = value as Partial<ProductInfo>;
  if (!isKnownProductId(product.productId)) return false;
  const catalogEntry = IAP_CATALOG[product.productId];
  return product.type === catalogEntry.type
    && typeof product.title === 'string'
    && product.title.trim().length > 0
    && typeof product.description === 'string'
    && typeof product.price === 'string'
    && product.price.trim().length > 0
    && typeof product.priceAmountMicros === 'number'
    && Number.isFinite(product.priceAmountMicros)
    && product.priceAmountMicros >= 0
    && typeof product.priceCurrencyCode === 'string'
    && product.priceCurrencyCode.trim().length > 0;
}

type PluginFacet = Pick<
  OnestoreIapPlugin,
  'initialize' | 'queryProducts' | 'purchase' | 'acknowledge' | 'restorePurchases' | 'addListener'
>;

interface PurchaseUpdatedListenerHandle {
  remove(): Promise<void> | void;
}

export class IapManager {
  private initialized = false;
  private initializeInFlight: Promise<void> | null = null;
  private products: Map<string, ProductInfo> = new Map();
  private purchaseUpdatedListener: Promise<PurchaseUpdatedListenerHandle | null> | null = null;
  private disposed = false;

  constructor(
    private plugin: PluginFacet,
    private licenseKey: string,
    private readonly onPurchaseUpdated?: (purchase: PurchaseInfo) => void,
  ) {}

  async initialize(): Promise<void> {
    if (this.disposed) return;
    if (this.initialized) return;
    if (this.initializeInFlight) return this.initializeInFlight;
    const pending = this.plugin.initialize({ licenseKey: this.licenseKey }).then(async () => {
      if (this.disposed) return;
      await this.registerPurchaseUpdatedListener();
      if (!this.disposed) this.initialized = true;
    });
    this.initializeInFlight = pending;
    try {
      await pending;
    } finally {
      if (this.initializeInFlight === pending) this.initializeInFlight = null;
    }
  }

  async queryProducts(): Promise<ProductInfo[]> {
    const result = await this.plugin.queryProducts({ productIds: IAP_PRODUCT_IDS });
    const products = Array.isArray(result?.products) ? result.products.filter(isValidIapProductInfo) : [];
    this.products.clear();
    for (const p of products) this.products.set(p.productId, p);
    return products;
  }

  private async registerPurchaseUpdatedListener(): Promise<void> {
    if (this.disposed || this.purchaseUpdatedListener) return;
    const pending = (async (): Promise<PurchaseUpdatedListenerHandle | null> => {
      try {
        const handle = await this.plugin.addListener('purchaseUpdated', (purchase) => {
          if (this.disposed || !isValidIapPurchaseInfo(purchase)) return;
          try {
            this.onPurchaseUpdated?.(purchase);
          } catch {
            // An entitlement observer must never break the native listener.
          }
        });
        if (this.disposed) {
          await handle.remove();
          return null;
        }
        return handle;
      } catch {
        // The purchase event is an optional recovery path. Direct purchase
        // calls and restore remain usable when a platform cannot register it.
        return null;
      }
    })();
    this.purchaseUpdatedListener = pending;
    await pending;
  }

  getProduct(id: IapProductId): ProductInfo | undefined {
    return this.products.get(id);
  }

  async purchase(productId: IapProductId): Promise<PurchaseResult> {
    const result = await this.plugin.purchase({ productId });
    if (result.status !== 'success') return result;

    const purchase = result.purchase;
    if (!purchase) {
      return {
        ...result,
        status: 'failed',
        errorMessage: '구매 기록이 없어 결제를 확인하지 못했습니다.',
      };
    }
    if (purchase.productId !== productId) {
      return {
        ...result,
        status: 'failed',
        errorMessage: '구매 상품이 요청한 상품과 일치하지 않습니다.',
      };
    }
    if (typeof purchase.purchaseToken !== 'string' || purchase.purchaseToken.trim().length === 0) {
      return {
        ...result,
        status: 'failed',
        errorMessage: '구매 토큰이 없어 결제를 확인하지 못했습니다.',
      };
    }
    if (!isValidIapPurchaseInfo(purchase)) {
      return {
        ...result,
        status: 'failed',
        errorMessage: '구매 기록 형식이 올바르지 않아 결제를 확인하지 못했습니다.',
      };
    }

    try {
      await this.plugin.acknowledge({ purchaseToken: purchase.purchaseToken });
    } catch (error) {
      // A non-consumable purchase is already owned once the store reports
      // success. Do not make a transient acknowledgement outage hide the
      // ad-free entitlement; a later restore can reconcile the store state.
      // Consumables remain strict because granting before acknowledgement
      // would make a retry capable of duplicating the currency award.
      if (productId !== 'ad_free') throw error;
    }
    return result;
  }

  async restorePurchases(): Promise<PurchaseInfo[]> {
    const result = await this.plugin.restorePurchases();
    const purchases = Array.isArray(result?.purchases) ? result.purchases : [];
    const validPurchases = purchases.filter(isValidIapPurchaseInfo);
    const reconciled: PurchaseInfo[] = [];
    for (const purchase of validPurchases) {
      if (purchase.productId !== 'ad_free' || purchase.acknowledged) {
        reconciled.push(purchase);
        continue;
      }

      try {
        await this.plugin.acknowledge({ purchaseToken: purchase.purchaseToken });
        // Keep the restored record truthful for callers that display or log
        // the acknowledgement state. If the retry fails, retain false and
        // let the next restore attempt retry it again.
        reconciled.push({ ...purchase, acknowledged: true });
      } catch {
        reconciled.push(purchase);
      }
    }
    return reconciled;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    const pending = this.purchaseUpdatedListener;
    this.purchaseUpdatedListener = null;
    if (!pending) return;
    try {
      const handle = await pending;
      await handle?.remove();
    } catch {
      // Listener cleanup is best effort during route/app teardown.
    }
  }
}
