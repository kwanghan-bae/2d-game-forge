export interface DropItem {
  id: string;
  nameKR: string;
  tier: 'common' | 'rare' | 'epic';
  /** Flat additive bonus to hero.atkBase on equip. */
  atkFlat: number;
  /** Flat additive bonus to hero.hpBase on equip. */
  hpFlat: number;
}

export const ENEMY_DROPS: readonly DropItem[] = [
  { id: 'rusty_sword',   nameKR: '낡은 검',    tier: 'common', atkFlat: 2, hpFlat: 0 },
  { id: 'cloth_armor',   nameKR: '천 갑옷',    tier: 'common', atkFlat: 0, hpFlat: 4 },
  { id: 'small_potion',  nameKR: '작은 포션',  tier: 'common', atkFlat: 0, hpFlat: 2 },
  { id: 'leather_boots', nameKR: '가죽 장화',  tier: 'common', atkFlat: 1, hpFlat: 1 },
];

export const BOSS_DROPS: readonly DropItem[] = [
  { id: 'steel_sword',    nameKR: '강철의 검',   tier: 'rare',  atkFlat: 10, hpFlat:  0 },
  { id: 'magic_shield',   nameKR: '마법 방패',   tier: 'rare',  atkFlat:  0, hpFlat: 15 },
  { id: 'enchanted_ring', nameKR: '마력의 반지', tier: 'epic',  atkFlat: 20, hpFlat: 10 },
];

export function lookupDrop(id: string): DropItem | undefined {
  return ENEMY_DROPS.find(d => d.id === id) ?? BOSS_DROPS.find(d => d.id === id);
}
