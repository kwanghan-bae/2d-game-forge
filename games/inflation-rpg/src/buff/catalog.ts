import type { BuffId } from '../types';

export interface BuffDef {
  id: BuffId;
  nameKR: string;
  descKR: string;
  baseCost: number;
  costMul: number;
  perLevel: number;
  cap?: number;
  isOneShot?: boolean;
}

/** Master V3 spec §5.2. Magnitude 는 V3-G balance pass 까지 placeholder. */
export const BUFF_CATALOG: BuffDef[] = [
  { id: 'move_speed',     nameKR: '이동의 가호', descKR: '이동속도 +0.5%',                      baseCost: 100,  costMul: 1.15, perLevel:  0.005 },
  { id: 'drop_chance',    nameKR: '풍요의 손길', descKR: '장비획득 확률 +0.3%',                 baseCost: 150,  costMul: 1.15, perLevel:  0.003 },
  { id: 'light_rate',     nameKR: '빛의 풍요',   descKR: '빛 누적 +1%',                          baseCost: 500,  costMul: 1.25, perLevel:  0.01  },
  { id: 'rejuv_discount', nameKR: '자비의 손길', descKR: '회춘 cost -5%',                        baseCost: 800,  costMul: 1.30, perLevel:  0.05, cap: 0.80 },
  { id: 'aging_slow',     nameKR: '시간의 늪',   descKR: '자연 aging 속도 -1%',                  baseCost: 1000, costMul: 1.30, perLevel: -0.01, cap: 0.50 },
  { id: 'field_diff',     nameKR: '격차의 칼날', descKR: '필드 디버프 한도 +1 (V3-D 도착 시 활성)', baseCost: 300,  costMul: 1.20, perLevel:  1 },
  { id: 'oneshot_rejuv',  nameKR: '빛의 은총',   descKR: '즉시 5년 회춘',                        baseCost: 0,    costMul: 1.0,  perLevel: 0, isOneShot: true },
];

export function findBuff(id: BuffId): BuffDef {
  const b = BUFF_CATALOG.find(x => x.id === id);
  if (!b) throw new Error(`Unknown buff: ${id}`);
  return b;
}

/** 한 단계 (현재 Lv → Lv+1) 의 cost. ceil 처리. */
export function singleStepCost(def: BuffDef, currentLv: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMul, currentLv));
}

/** count 단계 누적 cost. count=0 → 0. */
export function nextStepCost(def: BuffDef, currentLv: number, count: number): number {
  if (count <= 0) return 0;
  let total = 0;
  for (let i = 0; i < count; i++) total += singleStepCost(def, currentLv + i);
  return total;
}

/** 주어진 light 으로 살 수 있는 최대 단계 수. 안전 cap 1000. */
export function maxAffordable(def: BuffDef, currentLv: number, light: number): number {
  let count = 0;
  let spent = 0;
  while (count < 1000) {
    const next = singleStepCost(def, currentLv + count);
    if (spent + next > light) break;
    spent += next;
    count += 1;
  }
  return count;
}
