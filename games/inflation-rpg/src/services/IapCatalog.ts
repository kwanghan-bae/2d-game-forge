import type { IapProductId } from '../types';

interface AdFreeEntry {
  id: 'ad_free';
  type: 'non-consumable';
  displayName: string;
  description: string;
}

interface CrackStonePackEntry {
  id: 'crack_stone_pack_small' | 'crack_stone_pack_mid' | 'crack_stone_pack_large';
  type: 'consumable';
  displayName: string;
  crackStones: number;
}

type CatalogEntry = AdFreeEntry | CrackStonePackEntry;

export const IAP_CATALOG: Record<IapProductId, CatalogEntry> = {
  ad_free: {
    id: 'ad_free',
    type: 'non-consumable',
    displayName: '광고 제거',
    description:
      '하단 배너 광고가 영구히 사라지고, ' +
      '보상형 광고를 보지 않아도 자동으로 보상을 받습니다.',
  },
  crack_stone_pack_small: {
    id: 'crack_stone_pack_small',
    type: 'consumable',
    displayName: '균열석 작은 묶음',
    crackStones: 10,
  },
  crack_stone_pack_mid: {
    id: 'crack_stone_pack_mid',
    type: 'consumable',
    displayName: '균열석 중간 묶음',
    crackStones: 60,
  },
  crack_stone_pack_large: {
    id: 'crack_stone_pack_large',
    type: 'consumable',
    displayName: '균열석 큰 묶음',
    crackStones: 150,
  },
};

export const IAP_PRODUCT_IDS: IapProductId[] = [
  'ad_free',
  'crack_stone_pack_small',
  'crack_stone_pack_mid',
  'crack_stone_pack_large',
];
