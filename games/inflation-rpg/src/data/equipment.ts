import type { EquipmentBase, EquipmentInstance, EquipmentRarity } from '../types';

// Re-export EquipmentRarity so pickCraftResult consumers (T6) can import from this module
export type { EquipmentRarity };

export const EQUIPMENT_BASES: EquipmentBase[] = [
  // ── Existing 15 (preserved) ──
  // Weapons — flat (early game)
  { id: 'w-knife',     name: '단도',   slot: 'weapon', rarity: 'common',    baseStats: { flat: { atk: 30 } },               dropAreaIds: ['village-entrance', 'tavern-street'], price: 100 },
  { id: 'w-sword',     name: '철검',   slot: 'weapon', rarity: 'common',    baseStats: { flat: { atk: 80 } },               dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 300 },
  { id: 'w-bow',       name: '각궁',   slot: 'weapon', rarity: 'rare',      baseStats: { flat: { atk: 200 }, percent: { atk: 20 } }, dropAreaIds: ['baekdu-gate', 'kumgang-foot'], price: 800 },
  // Weapons — percent (mid-late game)
  { id: 'w-bluedragon',name: '청룡도', slot: 'weapon', rarity: 'rare',      baseStats: { percent: { atk: 80 } },            dropAreaIds: ['dragon-palace', 'black-dragon-den'], price: 2000 },
  { id: 'w-yongcheon', name: '용천검', slot: 'weapon', rarity: 'epic',      baseStats: { percent: { atk: 200 } },           dropAreaIds: ['underworld-gate', 'jade-palace'],    price: 8000 },
  { id: 'w-fairy',     name: '선녀검', slot: 'weapon', rarity: 'legendary', baseStats: { percent: { atk: 500 } },           dropAreaIds: ['chaos-land', 'final-realm'],          price: 30000 },
  // Armors
  { id: 'a-cloth',     name: '베옷',   slot: 'armor',  rarity: 'common',    baseStats: { flat: { def: 20, hp: 50 } },       dropAreaIds: ['village-entrance', 'tavern-street'], price: 150 },
  { id: 'a-leather',   name: '가죽갑', slot: 'armor',  rarity: 'common',    baseStats: { flat: { def: 60, hp: 150 } },      dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 400 },
  { id: 'a-iron',      name: '철갑옷', slot: 'armor',  rarity: 'rare',      baseStats: { flat: { def: 150 }, percent: { hp: 30 } }, dropAreaIds: ['kumgang-foot', 'dragon-palace'], price: 1500 },
  { id: 'a-dragon',    name: '용린갑', slot: 'armor',  rarity: 'epic',      baseStats: { percent: { hp: 150, def: 100 } },  dropAreaIds: ['black-dragon-den', 'underworld-gate'],price: 6000 },
  { id: 'a-celestial', name: '천의',   slot: 'armor',  rarity: 'legendary', baseStats: { percent: { hp: 400, def: 250 } },  dropAreaIds: ['jade-palace', 'final-realm'],         price: 25000 },
  // Accessories
  { id: 'acc-ring-bp1',name: 'BP반지+1',slot:'accessory',rarity:'common',  baseStats: {},                                   dropAreaIds: ['village-entrance'],                  price: 500 },
  { id: 'acc-ring-bp3',name: 'BP반지+3',slot:'accessory',rarity:'rare',    baseStats: {},                                   dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 3000 },
  { id: 'acc-necklace', name: '회복목걸이',slot:'accessory',rarity:'rare',  baseStats: { percent: { hp: 50 } },              dropAreaIds: ['kumgang-foot', 'dragon-palace'],      price: 5000 },
  { id: 'acc-luc-gem',  name: '행운석', slot:'accessory',rarity:'epic',    baseStats: { percent: { luc: 100 } },            dropAreaIds: ['jade-palace', 'chaos-land'],          price: 15000 },

  // ── Uncommon tier (6 신규) ──
  { id: 'w-club',      name: '곤봉',       slot: 'weapon', rarity: 'uncommon', baseStats: { flat: { atk: 50 } },                          dropAreaIds: ['farm-fields', 'brook-side'],   price: 200 },
  { id: 'w-dagger',    name: '비수',       slot: 'weapon', rarity: 'uncommon', baseStats: { flat: { atk: 60 }, percent: { agi: 5 } },     dropAreaIds: ['market-street', 'tavern-street'], price: 250 },
  { id: 'a-padded',    name: '누비옷',     slot: 'armor',  rarity: 'uncommon', baseStats: { flat: { def: 35, hp: 80 } },                  dropAreaIds: ['farm-fields', 'brook-side'],   price: 220 },
  { id: 'a-hide',      name: '가죽두건',  slot: 'armor',  rarity: 'uncommon', baseStats: { flat: { def: 50, hp: 120 } },                 dropAreaIds: ['market-street'], price: 280 },
  { id: 'acc-amulet',  name: '부적',       slot: 'accessory', rarity: 'uncommon', baseStats: { flat: { hp: 30 } },                       dropAreaIds: ['tavern-street', 'beacon-hill'], price: 350 },
  { id: 'acc-charm',   name: '복주머니',  slot: 'accessory', rarity: 'uncommon', baseStats: { percent: { luc: 20 } },                    dropAreaIds: ['market-street'], price: 400 },

  // ── Mythic tier (6 신규) ──
  { id: 'w-mythic-sword',  name: '천년검',     slot: 'weapon',    rarity: 'mythic', baseStats: { percent: { atk: 1500 } },         dropAreaIds: ['final-realm'],                     price: 200000 },
  { id: 'w-mythic-bow',    name: '신궁',       slot: 'weapon',    rarity: 'mythic', baseStats: { percent: { atk: 1200, agi: 300 } }, dropAreaIds: ['time-rift', 'chaos-land'],      price: 180000 },
  { id: 'a-mythic-robe',   name: '천룡갑',     slot: 'armor',     rarity: 'mythic', baseStats: { percent: { hp: 1000, def: 800 } }, dropAreaIds: ['final-realm'],                    price: 250000 },
  { id: 'a-mythic-aura',   name: '신성가호',  slot: 'armor',     rarity: 'mythic', baseStats: { percent: { hp: 800, def: 1000 } }, dropAreaIds: ['jade-palace', 'chaos-land'],     price: 220000 },
  { id: 'acc-mythic-gem',  name: '운명석',     slot: 'accessory', rarity: 'mythic', baseStats: { percent: { luc: 500 } },          dropAreaIds: ['final-realm'],                    price: 300000 },
  { id: 'acc-mythic-ring', name: '천공반지',  slot: 'accessory', rarity: 'mythic', baseStats: { percent: { hp: 500, atk: 300 } }, dropAreaIds: ['time-rift', 'jade-palace'],     price: 280000 },

  // ── Region-specific drops (14 신규) ──
  // Coast (해양)
  { id: 'w-trident',       name: '삼지창',     slot: 'weapon',    rarity: 'rare',      baseStats: { flat: { atk: 250 } },             dropAreaIds: ['dragon-palace'],     price: 1200 },
  { id: 'a-shell-armor',   name: '조개갑옷',   slot: 'armor',     rarity: 'rare',      baseStats: { flat: { def: 180 }, percent: { hp: 25 } }, dropAreaIds: ['dragon-palace'], price: 1800 },
  // Underground
  { id: 'w-pickaxe',       name: '광부곡괭이', slot: 'weapon',    rarity: 'epic',      baseStats: { percent: { atk: 150 } },          dropAreaIds: ['cave-deep'],         price: 5000 },
  { id: 'a-ore-armor',     name: '광석갑',     slot: 'armor',     rarity: 'epic',      baseStats: { percent: { def: 200, hp: 100 } }, dropAreaIds: ['cave-deep'],         price: 6500 },
  // Heaven-realm
  { id: 'w-celestial-spear',name: '선풍창',    slot: 'weapon',    rarity: 'legendary', baseStats: { percent: { atk: 700 } },          dropAreaIds: ['jade-palace'],       price: 35000 },
  // Underworld
  { id: 'w-soulreaper',    name: '영혼낫',     slot: 'weapon',    rarity: 'legendary', baseStats: { percent: { atk: 600 } },          dropAreaIds: ['underworld-gate'],   price: 30000 },
  // Forest
  { id: 'w-vine-bow',      name: '덩굴활',     slot: 'weapon',    rarity: 'rare',      baseStats: { flat: { atk: 180 } },             dropAreaIds: ['forest-heart'],      price: 1000 },
  { id: 'a-bark-armor',    name: '수피갑',     slot: 'armor',     rarity: 'rare',      baseStats: { flat: { def: 130, hp: 200 } },    dropAreaIds: ['forest-heart'],      price: 1300 },
  // Mountains
  { id: 'a-stone-armor',   name: '석갑',       slot: 'armor',     rarity: 'rare',      baseStats: { flat: { def: 200, hp: 250 } },    dropAreaIds: ['kumgang-foot'],      price: 1700 },
  // Chaos
  { id: 'acc-chaos-orb',   name: '혼돈구',     slot: 'accessory', rarity: 'epic',      baseStats: { percent: { luc: 200, atk: 50 } }, dropAreaIds: ['chaos-land'],        price: 18000 },
  { id: 'acc-time-shard',  name: '시간조각',  slot: 'accessory', rarity: 'epic',      baseStats: { percent: { agi: 250 } },          dropAreaIds: ['time-rift'],         price: 17000 },
  // Plains
  { id: 'acc-spirit-talisman', name: '영부적', slot: 'accessory',rarity: 'rare',      baseStats: { percent: { hp: 80 } },            dropAreaIds: ['cursed-fields'],      price: 4000 },
  { id: 'w-rust-blade',    name: '녹슨검',     slot: 'weapon',    rarity: 'common',    baseStats: { flat: { atk: 40 } },              dropAreaIds: ['ruined-village'],     price: 150 },
  { id: 'a-tribal-armor',  name: '부족갑',     slot: 'armor',     rarity: 'rare',      baseStats: { flat: { def: 100 }, percent: { hp: 20 } }, dropAreaIds: ['wanderer-camp'], price: 1100 },
];

export function getEquipmentBase(id: string): EquipmentBase | undefined {
  return EQUIPMENT_BASES.find(e => e.id === id);
}

export function getDropBasesForArea(areaId: string): EquipmentBase[] {
  return EQUIPMENT_BASES.filter(e => e.dropAreaIds.includes(areaId));
}

/** Drop / shop 에서 인스턴스 생성 시 사용 */
export function createInstance(baseId: string): EquipmentInstance {
  return {
    instanceId: crypto.randomUUID(),
    baseId,
    enhanceLv: 0,
  };
}

/** @deprecated — use getEquipmentBase. Kept for one task to ease migration of consumers. */
export const getEquipmentById = getEquipmentBase;
