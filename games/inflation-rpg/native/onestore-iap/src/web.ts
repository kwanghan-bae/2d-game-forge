import { WebPlugin } from '@capacitor/core';

import type {
  AcknowledgeOptions,
  InitializeOptions,
  OnestoreIapPlugin,
  ProductInfo,
  PurchaseInfo,
  PurchaseOptions,
  PurchaseResult,
  QueryProductsOptions,
} from './definitions';

const WEB_MOCK_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OnestoreIapWeb extends WebPlugin implements OnestoreIapPlugin {
  private products: Map<string, ProductInfo> = new Map();
  private ownedNonConsumables: Set<string> = new Set();

  async initialize(_opts: InitializeOptions): Promise<void> {
    return Promise.resolve();
  }

  async queryProducts(opts: QueryProductsOptions): Promise<{ products: ProductInfo[] }> {
    await delay(WEB_MOCK_DELAY_MS);
    const products = opts.productIds.map((id) =>
      this.products.get(id) ?? {
        productId: id,
        type: id === 'ad_free' ? ('non-consumable' as const) : ('consumable' as const),
        title: id,
        description: `(web stub) ${id}`,
        price: '₩1,200',
        priceAmountMicros: 1_200_000_000,
        priceCurrencyCode: 'KRW',
      },
    );
    return { products };
  }

  async purchase(opts: PurchaseOptions): Promise<PurchaseResult> {
    await delay(WEB_MOCK_DELAY_MS);
    const purchase: PurchaseInfo = {
      productId: opts.productId,
      purchaseToken: `web_stub_${opts.productId}_${Date.now()}`,
      purchaseTime: Date.now(),
      acknowledged: false,
    };
    if (opts.productId === 'ad_free') this.ownedNonConsumables.add(opts.productId);
    this.notifyListeners('purchaseUpdated', purchase);
    return { status: 'success', purchase };
  }

  async acknowledge(_opts: AcknowledgeOptions): Promise<void> {
    await delay(WEB_MOCK_DELAY_MS);
    return Promise.resolve();
  }

  async restorePurchases(): Promise<{ purchases: PurchaseInfo[] }> {
    await delay(WEB_MOCK_DELAY_MS);
    const purchases: PurchaseInfo[] = Array.from(this.ownedNonConsumables).map((id) => ({
      productId: id,
      purchaseToken: `web_stub_restore_${id}`,
      purchaseTime: 0,
      acknowledged: true,
    }));
    return { purchases };
  }
}
