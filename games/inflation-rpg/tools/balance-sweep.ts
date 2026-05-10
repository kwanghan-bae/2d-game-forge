// games/inflation-rpg/tools/balance-sweep.ts
import { simulateFloor, createSeededRng, type SimPlayer, type SimEnemy } from './balance-sim';
import { getMonsterLevel } from '../src/data/floors';
import { getMonstersForLevel } from '../src/data/monsters';
import { enhanceMultiplier } from '../src/systems/enhance';

export interface MilestoneState {
  hours: number;
  expectedFloor: number;       // spec Section 10.1
  charLv: number;              // 추정
  ascTier: number;             // 추정
  equipLvAvg: number;          // 강화 lv 평균
  equipRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  baseAbilityLv: number;       // max 18
  spAtkRatio: number;          // SP 분배 비율 (atk 에 몰빵 0..1)
}

// Spec Section 10.1 + Section 5 + Section 11.2 으로부터 추정.
export const MILESTONES: ReadonlyArray<MilestoneState> = [
  { hours: 5,   expectedFloor: 8,    charLv: 5,   ascTier: 0,  equipLvAvg: 5,   equipRarity: 'common',    baseAbilityLv: 2,  spAtkRatio: 0.5 },
  { hours: 30,  expectedFloor: 25,   charLv: 15,  ascTier: 0,  equipLvAvg: 30,  equipRarity: 'uncommon',  baseAbilityLv: 5,  spAtkRatio: 0.6 },
  { hours: 80,  expectedFloor: 60,   charLv: 30,  ascTier: 1,  equipLvAvg: 80,  equipRarity: 'rare',      baseAbilityLv: 8,  spAtkRatio: 0.6 },
  { hours: 200, expectedFloor: 200,  charLv: 60,  ascTier: 5,  equipLvAvg: 250, equipRarity: 'epic',      baseAbilityLv: 12, spAtkRatio: 0.65 },
  { hours: 300, expectedFloor: 500,  charLv: 100, ascTier: 20, equipLvAvg: 1500,equipRarity: 'legendary', baseAbilityLv: 18, spAtkRatio: 0.7 },
  { hours: 500, expectedFloor: 1500, charLv: 200, ascTier: 30, equipLvAvg: 5000,equipRarity: 'mythic',    baseAbilityLv: 18, spAtkRatio: 0.7 },
];

export interface SweepRow {
  hours: number;
  expectedFloor: number;
  measuredFloor: number;       // sim 결과 도달 가능 max floor
  clearTimeAtExpected: number; // expectedFloor 클리어 평균 초
  withinTolerance: boolean;    // ±20%
  cliffsDetected: number[];    // F 번호. clearTime(F+1)/clearTime(F) ≥ 1.5
}

function buildSimPlayer(s: MilestoneState): SimPlayer {
  // Spec Section 11.2 Curve 3 의 ATK 식 근사:
  // base 110 × (1 + sp*0.03) × (1 + charLv*0.02) × (1 + 0.1*ascT)
  //   × (1 + 0.5*baseAbility) + equipATK
  const spAtk = Math.floor(s.charLv * 5 * s.spAtkRatio);
  const baseATK = 110;
  const charLvMul = 1 + s.charLv * 0.02;
  const ascMul = 1 + 0.1 * s.ascTier;
  const baseAbilityMul = 1 + 0.5 * s.baseAbilityLv;
  const enhanceMul = enhanceMultiplier(s.equipRarity, s.equipLvAvg);
  // 4 슬롯 가정, 각 슬롯 base 30 atk
  const equipATKBase = 30 * 4;
  const equipATK = Math.floor(equipATKBase * enhanceMul);
  const atk = Math.floor(baseATK * (1 + spAtk * 0.03) * charLvMul * ascMul * baseAbilityMul) + equipATK;
  const def = Math.floor(atk * 0.1);
  const hpMax = Math.floor(atk * 5);
  return { atk, def, hpMax, agi: 30, luc: 30, skills: [] };
}

const N_FULL = 100; // spec §7.2: full sweep N=100

function representativeHpMult(monsterLevel: number): number {
  const candidates = getMonstersForLevel(monsterLevel);
  if (candidates.length === 0) return 1.0;
  return candidates.reduce((sum, m) => sum + m.hpMult, 0) / candidates.length;
}

function clearTimeAtFloor(player: SimPlayer, floor: number, n: number): number {
  const monsterLevel = getMonsterLevel(floor);
  const hpMult = representativeHpMult(monsterLevel);
  const enemy: SimEnemy = { monsterLevel, isBoss: false, hpMult };
  let total = 0; let wins = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateFloor(player, enemy, createSeededRng(i + 1), 5000);
    if (r.victory) { total += r.secondsTaken; wins++; }
  }
  return wins > 0 ? total / wins : Infinity;
}

export interface RunSweepOptions { n?: number }

export function runSweep(opts: RunSweepOptions = {}): SweepRow[] {
  const N = opts.n ?? N_FULL;
  return MILESTONES.map((s) => {
    const player = buildSimPlayer(s);
    const t = clearTimeAtFloor(player, s.expectedFloor, N);

    // measuredFloor = clearTime 이 maxTicks 초과 직전
    let measuredFloor = 1;
    // Probe uses n=10 — only need finite/infinite distinction, not precise time.
    const probe = [1, 5, 8, 10, 25, 30, 60, 100, 200, 500, 1000, 1500, 3000];
    for (const f of probe) {
      const ct = clearTimeAtFloor(player, f, 10);
      if (Number.isFinite(ct)) measuredFloor = f;
      else break;
    }

    // 단조성 check — milestone 주변 ±5 floor
    const cliffs: number[] = [];
    const cliffStart = Math.max(1, s.expectedFloor - 5);
    const cliffEnd = s.expectedFloor + 5;
    const cliffTimes: number[] = [];
    for (let f = cliffStart; f <= cliffEnd + 1; f++) {
      cliffTimes.push(clearTimeAtFloor(player, f, N));
    }
    for (let i = 0; i < cliffTimes.length - 1; i++) {
      const a = cliffTimes[i]!;
      const b = cliffTimes[i + 1]!;
      if (Number.isFinite(a) && Number.isFinite(b) && b / a >= 1.5) {
        cliffs.push(cliffStart + i);
      }
    }

    const expectedFloor = s.expectedFloor;
    // New criterion (spec §5.1 redefinition 2026-05-10):
    // measuredFloor >= expectedFloor ⇒ pass. Over-tuned is acceptable — only
    // under-tuning indicates a balance defect.
    const within = measuredFloor >= expectedFloor;

    return {
      hours: s.hours,
      expectedFloor,
      measuredFloor,
      clearTimeAtExpected: t,
      withinTolerance: within,
      cliffsDetected: cliffs,
    };
  });
}
