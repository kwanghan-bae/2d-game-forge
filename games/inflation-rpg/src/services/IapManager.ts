import type {
  OnestoreIapPlugin,
  ProductInfo,
  PurchaseInfo,
  PurchaseResult,
} from '@forge/inflation-rpg-native-onestore-iap';

import type { IapProductId } from '../types';
import { IAP_PRODUCT_IDS } from './IapCatalog';

type PluginFacet = Pick<
  OnestoreIapPlugin,
  'initialize' | 'queryProducts' | 'purchase' | 'acknowledge' | 'restorePurchases' | 'addListener'
>;

export class IapManager {
  private initialized = false;
  private products: Map<string, ProductInfo> = new Map();

  constructor(private plugin: PluginFacet, private licenseKey: string) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.plugin.initialize({ licenseKey: this.licenseKey });
    this.initialized = true;
  }

  async queryProducts(): Promise<ProductInfo[]> {
    const { products } = await this.plugin.queryProducts({ productIds: IAP_PRODUCT_IDS });
    this.products.clear();
    for (const p of products) this.products.set(p.productId, p);
    return products;
  }

  getProduct(id: IapProductId): ProductInfo | undefined {
    return this.products.get(id);
  }

  async purchase(productId: IapProductId): Promise<PurchaseResult> {
    const result = await this.plugin.purchase({ productId });
    if (result.status === 'success' && result.purchase) {
      await this.plugin.acknowledge({ purchaseToken: result.purchase.purchaseToken });
    }
    return result;
  }

  async restorePurchases(): Promise<PurchaseInfo[]> {
    const { purchases } = await this.plugin.restorePurchases();
    return purchases;
  }
}
