import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnestoreIapPlugin, PurchaseInfo } from '@forge/inflation-rpg-native-onestore-iap';
import { IapManager } from './IapManager';

const makeMockPlugin = () =>
  ({
    initialize: vi.fn().mockResolvedValue(undefined),
    queryProducts: vi.fn().mockResolvedValue({
      products: [
        { productId: 'ad_free', type: 'non-consumable', title: '광고 제거', description: '', price: '₩1,200', priceAmountMicros: 1_200_000_000, priceCurrencyCode: 'KRW' },
        { productId: 'crack_stone_pack_small', type: 'consumable', title: '균열석 작은 묶음', description: '', price: '₩1,200', priceAmountMicros: 1_200_000_000, priceCurrencyCode: 'KRW' },
      ],
    }),
    purchase: vi.fn(),
    acknowledge: vi.fn().mockResolvedValue(undefined),
    restorePurchases: vi.fn().mockResolvedValue({ purchases: [] }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  }) as unknown as Pick<
    OnestoreIapPlugin,
    'initialize' | 'queryProducts' | 'purchase' | 'acknowledge' | 'restorePurchases' | 'addListener'
  > & { purchase: ReturnType<typeof vi.fn>; restorePurchases: ReturnType<typeof vi.fn>; acknowledge: ReturnType<typeof vi.fn>; initialize: ReturnType<typeof vi.fn>; queryProducts: ReturnType<typeof vi.fn> };

describe('IapManager', () => {
  let plugin: ReturnType<typeof makeMockPlugin>;
  let mgr: IapManager;

  beforeEach(() => {
    plugin = makeMockPlugin();
    mgr = new IapManager(plugin, 'TEST_LICENSE_KEY');
  });

  it('initialize calls plugin.initialize with licenseKey', async () => {
    await mgr.initialize();
    expect(plugin.initialize).toHaveBeenCalledWith({ licenseKey: 'TEST_LICENSE_KEY' });
  });

  it('forwards only validated purchaseUpdated records after initialization', async () => {
    let listener!: (purchase: PurchaseInfo) => void;
    const remove = vi.fn();
    const addListener = plugin.addListener as unknown as ReturnType<typeof vi.fn>;
    addListener.mockImplementation(async (_event: string, callback: (purchase: PurchaseInfo) => void) => {
      listener = callback;
      return { remove };
    });
    const onPurchaseUpdated = vi.fn();
    mgr = new IapManager(plugin, 'TEST_LICENSE_KEY', onPurchaseUpdated);

    await mgr.initialize();
    listener({ productId: 'ad_free', purchaseToken: 'tok_event', purchaseTime: 100, acknowledged: false });
    listener({ productId: 'unknown_product', purchaseToken: 'tok_bad', purchaseTime: 100, acknowledged: false } as unknown as PurchaseInfo);

    expect(onPurchaseUpdated).toHaveBeenCalledTimes(1);
    expect(onPurchaseUpdated).toHaveBeenCalledWith({
      productId: 'ad_free', purchaseToken: 'tok_event', purchaseTime: 100, acknowledged: false,
    });

    await mgr.dispose();
    listener({ productId: 'ad_free', purchaseToken: 'tok_late', purchaseTime: 101, acknowledged: false });
    expect(remove).toHaveBeenCalledOnce();
    expect(onPurchaseUpdated).toHaveBeenCalledTimes(1);
  });

  it('shares concurrent initialization with one provider call', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    plugin.initialize.mockReturnValueOnce(pending);

    const first = mgr.initialize();
    const second = mgr.initialize();
    await Promise.resolve();
    expect(plugin.initialize).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);
  });

  it('refreshes the provider connection before a restore after initial bootstrap', async () => {
    await mgr.initialize();
    plugin.initialize.mockClear();

    await mgr.restorePurchases();

    expect(plugin.initialize).toHaveBeenCalledWith({ licenseKey: 'TEST_LICENSE_KEY' });
  });

  it('retries the optional purchase listener after a transient registration failure', async () => {
    const addListener = plugin.addListener as unknown as ReturnType<typeof vi.fn>;
    addListener.mockRejectedValueOnce(new Error('listener unavailable'));
    await mgr.initialize();
    expect(addListener).toHaveBeenCalledTimes(1);

    await mgr.restorePurchases();

    expect(addListener).toHaveBeenCalledTimes(2);
  });

  it('queryProducts caches product info by id', async () => {
    await mgr.queryProducts();
    expect(mgr.getProduct('ad_free')?.price).toBe('₩1,200');
  });

  it('filters malformed and unknown product records before caching them', async () => {
    plugin.queryProducts.mockResolvedValue({
      products: [
        {
          productId: 'ad_free', type: 'non-consumable', title: '광고 제거', description: '',
          price: '₩1,200', priceAmountMicros: 1_200_000_000, priceCurrencyCode: 'KRW',
        },
        {
          productId: 'crack_stone_pack_small', type: 'consumable', title: '깨진 가격', description: '',
          price: '', priceAmountMicros: Number.NaN, priceCurrencyCode: 'KRW',
        },
        {
          productId: 'crack_stone_pack_mid', type: 'consumable', title: '무료처럼 보이는 가격', description: '',
          price: '₩0', priceAmountMicros: 0, priceCurrencyCode: 'KRW',
        },
        {
          productId: 'crack_stone_pack_large', type: 'consumable', title: '정밀도 손실 가격', description: '',
          price: '₩1,200', priceAmountMicros: Number.MAX_SAFE_INTEGER + 1, priceCurrencyCode: 'KRW',
        },
        {
          productId: 'unknown_product', type: 'consumable', title: '알 수 없음', description: '',
          price: '₩1,200', priceAmountMicros: 1_200_000_000, priceCurrencyCode: 'KRW',
        },
      ],
    });

    const result = await mgr.queryProducts();

    expect(result).toHaveLength(1);
    expect(result[0]?.productId).toBe('ad_free');
    expect(mgr.getProduct('crack_stone_pack_small')).toBeUndefined();
    expect(mgr.getProduct('crack_stone_pack_mid')).toBeUndefined();
    expect(mgr.getProduct('crack_stone_pack_large')).toBeUndefined();
  });

  it('treats a malformed product container as an empty safe result', async () => {
    plugin.queryProducts.mockResolvedValue({ products: undefined });

    await expect(mgr.queryProducts()).resolves.toEqual([]);
  });

  it('purchase success returns status=success and acknowledges automatically', async () => {
    plugin.purchase.mockResolvedValue({
      status: 'success',
      purchase: {
        productId: 'ad_free',
        purchaseToken: 'tok_123',
        purchaseTime: 100,
        acknowledged: false,
      },
    });
    const result = await mgr.purchase('ad_free');
    expect(result.status).toBe('success');
    expect(plugin.acknowledge).toHaveBeenCalledWith({ purchaseToken: 'tok_123' });
  });

  it('purchase canceled does not call acknowledge', async () => {
    plugin.purchase.mockResolvedValue({ status: 'canceled' });
    const result = await mgr.purchase('ad_free');
    expect(result.status).toBe('canceled');
    expect(plugin.acknowledge).not.toHaveBeenCalled();
  });

  it('rejects an unknown runtime product before connecting to the provider', async () => {
    const result = await mgr.purchase('unknown_product' as never);

    expect(result).toMatchObject({ status: 'failed' });
    expect(result.errorMessage).toContain('상품');
    expect(plugin.initialize).not.toHaveBeenCalled();
    expect(plugin.purchase).not.toHaveBeenCalled();
  });

  it('downgrades a successful store response that has no purchase record', async () => {
    plugin.purchase.mockResolvedValue({ status: 'success' });

    const result = await mgr.purchase('ad_free');

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('구매 기록');
    expect(plugin.acknowledge).not.toHaveBeenCalled();
  });

  it('rejects a successful store response for a different product', async () => {
    plugin.purchase.mockResolvedValue({
      status: 'success',
      purchase: {
        productId: 'crack_stone_pack_small',
        purchaseToken: 'tok_wrong_product',
        purchaseTime: 100,
        acknowledged: false,
      },
    });

    const result = await mgr.purchase('ad_free');

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('상품');
    expect(plugin.acknowledge).not.toHaveBeenCalled();
  });

  it('keeps a completed ad-free purchase successful when acknowledgement is temporarily unavailable', async () => {
    plugin.purchase.mockResolvedValue({
      status: 'success',
      purchase: {
        productId: 'ad_free',
        purchaseToken: 'tok_ack_retry',
        purchaseTime: 100,
        acknowledged: false,
      },
    });
    plugin.acknowledge.mockRejectedValueOnce(new Error('store temporarily unavailable'));

    const result = await mgr.purchase('ad_free');

    expect(result.status).toBe('success');
    expect(result.purchase?.purchaseToken).toBe('tok_ack_retry');
    expect(plugin.acknowledge).toHaveBeenCalledWith({ purchaseToken: 'tok_ack_retry' });
  });

  it('does not hide acknowledgement failures for consumable purchases', async () => {
    plugin.purchase.mockResolvedValue({
      status: 'success',
      purchase: {
        productId: 'crack_stone_pack_small',
        purchaseToken: 'tok_consumable_ack',
        purchaseTime: 100,
        acknowledged: false,
      },
    });
    plugin.acknowledge.mockRejectedValueOnce(new Error('store temporarily unavailable'));

    await expect(mgr.purchase('crack_stone_pack_small')).rejects.toThrow('store temporarily unavailable');
  });

  it('restorePurchases returns the plugin result list', async () => {
    plugin.restorePurchases.mockResolvedValue({
      purchases: [
        {
          productId: 'ad_free',
          purchaseToken: 'tok_old',
          purchaseTime: 0,
          acknowledged: true,
        },
      ],
    });
    const result = await mgr.restorePurchases();
    expect(result).toHaveLength(1);
    expect(result[0]!.productId).toBe('ad_free');
  });

  it('retries acknowledgement for an unacknowledged non-consumable during restore', async () => {
    plugin.restorePurchases.mockResolvedValue({
      purchases: [{
        productId: 'ad_free', purchaseToken: 'tok_restore_ack', purchaseTime: 100, acknowledged: false,
      }],
    });

    const result = await mgr.restorePurchases();

    expect(result).toHaveLength(1);
    expect(result[0]?.acknowledged).toBe(true);
    expect(plugin.acknowledge).toHaveBeenCalledWith({ purchaseToken: 'tok_restore_ack' });
  });

  it('does not consume a restored consumable automatically', async () => {
    plugin.restorePurchases.mockResolvedValue({
      purchases: [{
        productId: 'crack_stone_pack_small', purchaseToken: 'tok_restore_consumable', purchaseTime: 100, acknowledged: false,
      }],
    });

    await mgr.restorePurchases();

    expect(plugin.acknowledge).not.toHaveBeenCalled();
  });

  it('keeps a restored ad-free entitlement usable when acknowledgement retry fails', async () => {
    plugin.restorePurchases.mockResolvedValue({
      purchases: [{
        productId: 'ad_free', purchaseToken: 'tok_restore_retry', purchaseTime: 100, acknowledged: false,
      }],
    });
    plugin.acknowledge.mockRejectedValueOnce(new Error('store temporarily unavailable'));

    const result = await mgr.restorePurchases();

    expect(result).toEqual([{
      productId: 'ad_free', purchaseToken: 'tok_restore_retry', purchaseTime: 100, acknowledged: false,
    }]);
  });

  it('filters malformed restore records before they can grant entitlement', async () => {
    plugin.restorePurchases.mockResolvedValue({
      purchases: [
        { productId: 'ad_free', purchaseToken: '', purchaseTime: 0, acknowledged: true },
        { productId: 'unknown_product', purchaseToken: 'tok_unknown', purchaseTime: 0, acknowledged: true },
        { productId: 'ad_free', purchaseToken: 'tok_valid', purchaseTime: 0, acknowledged: true },
      ],
    });

    const result = await mgr.restorePurchases();

    expect(result).toEqual([
      { productId: 'ad_free', purchaseToken: 'tok_valid', purchaseTime: 0, acknowledged: true },
    ]);
  });

  it('treats a malformed restore container as an empty safe result', async () => {
    plugin.restorePurchases.mockResolvedValue({ purchases: undefined });

    await expect(mgr.restorePurchases()).resolves.toEqual([]);
  });
});
