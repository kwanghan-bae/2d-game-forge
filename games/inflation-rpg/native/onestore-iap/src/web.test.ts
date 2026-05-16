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
