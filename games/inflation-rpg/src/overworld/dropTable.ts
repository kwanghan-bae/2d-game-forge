export interface DropItem {
  id: string;
  nameKR: string;
  tier: 'common' | 'rare' | 'epic';
}

export const ENEMY_DROPS: readonly DropItem[] = [
  { id: 'rusty_sword',   nameKR: '낡은 검',    tier: 'common' },
  { id: 'cloth_armor',   nameKR: '천 갑옷',    tier: 'common' },
  { id: 'small_potion',  nameKR: '작은 포션',  tier: 'common' },
  { id: 'leather_boots', nameKR: '가죽 장화',  tier: 'common' },
];

export const BOSS_DROPS: readonly DropItem[] = [
  { id: 'steel_sword',    nameKR: '강철의 검',   tier: 'rare'  },
  { id: 'magic_shield',   nameKR: '마법 방패',   tier: 'rare'  },
  { id: 'enchanted_ring', nameKR: '마력의 반지', tier: 'epic'  },
];

export function lookupDrop(id: string): DropItem | undefined {
  return ENEMY_DROPS.find(d => d.id === id) ?? BOSS_DROPS.find(d => d.id === id);
}
