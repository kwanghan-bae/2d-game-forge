import type { Equipment } from '../types';

export const EQUIPMENT_CATALOG: Equipment[] = [
  // Weapons — flat (early game)
  { id: 'w-knife',     name: '단도',   slot: 'weapon', rarity: 'common',    stats: { flat: { atk: 30 } },               dropAreaIds: ['village-entrance', 'tavern-street'], price: 100 },
  { id: 'w-sword',     name: '철검',   slot: 'weapon', rarity: 'common',    stats: { flat: { atk: 80 } },               dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 300 },
  { id: 'w-bow',       name: '각궁',   slot: 'weapon', rarity: 'rare',      stats: { flat: { atk: 200 }, percent: { atk: 20 } }, dropAreaIds: ['baekdu-gate', 'kumgang-foot'], price: 800 },
  // Weapons — percent (mid-late game)
  { id: 'w-bluedragon',name: '청룡도', slot: 'weapon', rarity: 'rare',      stats: { percent: { atk: 80 } },            dropAreaIds: ['dragon-palace', 'black-dragon-den'], price: 2000 },
  { id: 'w-yongcheon', name: '용천검', slot: 'weapon', rarity: 'epic',      stats: { percent: { atk: 200 } },           dropAreaIds: ['underworld-gate', 'jade-palace'],    price: 8000 },
  { id: 'w-fairy',     name: '선녀검', slot: 'weapon', rarity: 'legendary', stats: { percent: { atk: 500 } },           dropAreaIds: ['chaos-land', 'final-realm'],          price: 30000 },
  // Armors
  { id: 'a-cloth',     name: '베옷',   slot: 'armor',  rarity: 'common',    stats: { flat: { def: 20, hp: 50 } },       dropAreaIds: ['village-entrance', 'tavern-street'], price: 150 },
  { id: 'a-leather',   name: '가죽갑', slot: 'armor',  rarity: 'common',    stats: { flat: { def: 60, hp: 150 } },      dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 400 },
  { id: 'a-iron',      name: '철갑옷', slot: 'armor',  rarity: 'rare',      stats: { flat: { def: 150 }, percent: { hp: 30 } }, dropAreaIds: ['kumgang-foot', 'dragon-palace'], price: 1500 },
  { id: 'a-dragon',    name: '용린갑', slot: 'armor',  rarity: 'epic',      stats: { percent: { hp: 150, def: 100 } },  dropAreaIds: ['black-dragon-den', 'underworld-gate'],price: 6000 },
  { id: 'a-celestial', name: '천의',   slot: 'armor',  rarity: 'legendary', stats: { percent: { hp: 400, def: 250 } },  dropAreaIds: ['jade-palace', 'final-realm'],         price: 25000 },
  // Accessories
  { id: 'acc-ring-bp1',name: 'BP반지+1',slot:'accessory',rarity:'common',  stats: {},                                   dropAreaIds: ['village-entrance'],                  price: 500 },
  { id: 'acc-ring-bp3',name: 'BP반지+3',slot:'accessory',rarity:'rare',    stats: {},                                   dropAreaIds: ['goblin-pass', 'baekdu-gate'],        price: 3000 },
  { id: 'acc-necklace', name: '회복목걸이',slot:'accessory',rarity:'rare',  stats: { percent: { hp: 50 } },              dropAreaIds: ['kumgang-foot', 'dragon-palace'],      price: 5000 },
  { id: 'acc-luc-gem',  name: '행운석', slot:'accessory',rarity:'epic',    stats: { percent: { luc: 100 } },            dropAreaIds: ['jade-palace', 'chaos-land'],          price: 15000 },
];

export function getEquipmentById(id: string): Equipment | undefined {
  return EQUIPMENT_CATALOG.find(e => e.id === id);
}

export function getDropsForArea(areaId: string): Equipment[] {
  return EQUIPMENT_CATALOG.filter(e => e.dropAreaIds.includes(areaId));
}
