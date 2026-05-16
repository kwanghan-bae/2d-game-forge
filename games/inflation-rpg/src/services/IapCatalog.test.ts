import { describe, expect, it } from 'vitest';

import { IAP_CATALOG, IAP_PRODUCT_IDS } from './IapCatalog';

describe('IAP_CATALOG', () => {
  it('has exactly 4 products', () => {
    expect(IAP_PRODUCT_IDS).toHaveLength(4);
  });

  it('ad_free is non-consumable, others consumable', () => {
    expect(IAP_CATALOG.ad_free.type).toBe('non-consumable');
    expect(IAP_CATALOG.crack_stone_pack_small.type).toBe('consumable');
    expect(IAP_CATALOG.crack_stone_pack_mid.type).toBe('consumable');
    expect(IAP_CATALOG.crack_stone_pack_large.type).toBe('consumable');
  });

  it('crystal pack amounts are 10 / 60 / 150', () => {
    expect(
      (IAP_CATALOG.crack_stone_pack_small as { crackStones: number }).crackStones
    ).toBe(10);
    expect(
      (IAP_CATALOG.crack_stone_pack_mid as { crackStones: number }).crackStones
    ).toBe(60);
    expect(
      (IAP_CATALOG.crack_stone_pack_large as { crackStones: number }).crackStones
    ).toBe(150);
  });

  it('ad_free has no crackStones field', () => {
    expect(
      (IAP_CATALOG.ad_free as { crackStones?: number }).crackStones
    ).toBeUndefined();
  });
});
