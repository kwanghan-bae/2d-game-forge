import { describe, expect, it } from 'vitest';

import { OnestoreIapWeb } from './web';

describe('OnestoreIapWeb.queryProducts', () => {
  it('returns ProductInfo for each requested id with non-consumable type for ad_free', async () => {
    const plugin = new OnestoreIapWeb();
    const { products } = await plugin.queryProducts({
      productIds: ['ad_free', 'crack_stone_pack_small'],
    });
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ productId: 'ad_free', type: 'non-consumable' });
    expect(products[1]).toMatchObject({
      productId: 'crack_stone_pack_small',
      type: 'consumable',
    });
  });

  it('returns KRW priced products', async () => {
    const plugin = new OnestoreIapWeb();
    const { products } = await plugin.queryProducts({ productIds: ['ad_free'] });
    expect(products[0]!.priceCurrencyCode).toBe('KRW');
  });
});

describe('OnestoreIapWeb.purchase', () => {
  it('returns success with a purchase token, emits purchaseUpdated event', async () => {
    const plugin = new OnestoreIapWeb();
    let emitted: unknown = null;
    plugin.addListener('purchaseUpdated', (info) => {
      emitted = info;
    });
    const result = await plugin.purchase({ productId: 'ad_free' });
    expect(result.status).toBe('success');
    expect(result.purchase?.productId).toBe('ad_free');
    expect(result.purchase?.purchaseToken).toMatch(/^web_stub_ad_free_/);
    expect(emitted).toMatchObject({ productId: 'ad_free' });
  });

  it('tracks ad_free as owned for subsequent restorePurchases', async () => {
    const plugin = new OnestoreIapWeb();
    await plugin.purchase({ productId: 'ad_free' });
    const { purchases } = await plugin.restorePurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.productId).toBe('ad_free');
  });
});

describe('OnestoreIapWeb.acknowledge', () => {
  it('resolves successfully (no-op in web stub)', async () => {
    const plugin = new OnestoreIapWeb();
    await expect(
      plugin.acknowledge({ purchaseToken: 'web_stub_token' }),
    ).resolves.toBeUndefined();
  });
});
