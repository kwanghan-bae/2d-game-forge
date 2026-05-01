import type { BossType, FloorInfo } from '../types';

export function getBossType(floorNumber: number): BossType | null {
  if (floorNumber === 5) return 'mini';
  if (floorNumber === 10) return 'major';
  if (floorNumber === 15 || floorNumber === 20 || floorNumber === 25) return 'sub';
  if (floorNumber === 30) return 'final';
  // 심층 (floor > 30): 매 5층마다 sub-boss
  if (floorNumber > 30 && floorNumber % 5 === 0) return 'sub';
  return null;
}

export function getMonsterLevel(floorNumber: number): number {
  if (floorNumber <= 0) return 1;
  if (floorNumber <= 10) return floorNumber;
  if (floorNumber <= 30) return Math.floor((floorNumber * floorNumber) / 5);
  if (floorNumber <= 100) return Math.floor((floorNumber ** 3) / 1000);
  // 100+ : L(100) = 1000, ×2 every 30 floors
  const L100 = 1000;
  return Math.floor(L100 * Math.pow(2, (floorNumber - 100) / 30));
}

export function getFloorInfo(dungeonId: string, floorNumber: number): FloorInfo {
  return {
    dungeonId,
    floorNumber,
    monsterLevel: getMonsterLevel(floorNumber),
    bossType: getBossType(floorNumber),
  };
}
