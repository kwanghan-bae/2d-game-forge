import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnestoreIapPlugin } from '@forge/inflation-rpg-native-onestore-iap';
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

  it('queryProducts caches product info by id', async () => {
    await mgr.queryProducts();
    expect(mgr.getProduct('ad_free')?.price).toBe('₩1,200');
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
});
