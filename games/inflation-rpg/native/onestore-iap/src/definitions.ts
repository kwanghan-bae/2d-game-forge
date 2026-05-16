import type { PluginListenerHandle } from '@capacitor/core';

export interface ProductInfo {
  productId: string;
  type: 'consumable' | 'non-consumable';
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseInfo {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  acknowledged: boolean;
}

export interface PurchaseResult {
  status: 'success' | 'canceled' | 'failed';
  purchase?: PurchaseInfo;
  errorCode?: number;
  errorMessage?: string;
}

export interface InitializeOptions {
  licenseKey: string;
}

export interface QueryProductsOptions {
  productIds: string[];
}

export interface PurchaseOptions {
  productId: string;
}

export interface AcknowledgeOptions {
  purchaseToken: string;
}

export interface OnestoreIapPlugin {
  initialize(opts: InitializeOptions): Promise<void>;
  queryProducts(opts: QueryProductsOptions): Promise<{ products: ProductInfo[] }>;
  purchase(opts: PurchaseOptions): Promise<PurchaseResult>;
  acknowledge(opts: AcknowledgeOptions): Promise<void>;
  restorePurchases(): Promise<{ purchases: PurchaseInfo[] }>;
  addListener(
    eventName: 'purchaseUpdated',
    listenerFunc: (info: PurchaseInfo) => void,
  ): Promise<PluginListenerHandle>;
}
