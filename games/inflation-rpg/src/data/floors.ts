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

// Spec Section 11.2 Curve 1 — anchor + geometric interpolation.
// 인접 anchor 사이는 기하 보간으로 단조·연속 증가. floor 1000 이후는
// 매 500 floor 마다 ×10 으로 무한 확장.
//
// Balance-patch v1 (2026-05-10): F10→F20 구간에 [14,21] + [20,180] 두 anchor
// 추가. 목표: F14 ML=21 (HP=420 < 5h player minHit=431 → 절벽 없음) +
// F20 ML=180 (HP=3600 > 30h player maxHit_single=1703 → F20..F30 모두 안정
// 3-tick 구간 → 절벽 없음). [30,180] anchor 는 유지 (기존 단위 테스트 보존).
const FLOOR_LEVEL_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [10, 10],
  [14, 21],     // 5h cliff 방지: F14 HP=420 < 5h minHit(431) → 1-shot 유지
  [20, 180],    // 30h cliff 방지: F20..F30 HP=3600 → 일관 3-tick 구간
  [30, 180],    // F10→F30 상단 anchor 유지 (단위 테스트 보존)
  [100, 1_000],
  [200, 10_000],
  [500, 100_000],
  [1000, 1_000_000],
];

export function getMonsterLevel(floorNumber: number): number {
  if (floorNumber <= 0) return 1;

  const last = FLOOR_LEVEL_ANCHORS[FLOOR_LEVEL_ANCHORS.length - 1]!;
  const [lastF, lastL] = last;
  if (floorNumber >= lastF) {
    // ×10 every 500 floors past the last anchor.
    return Math.floor(lastL * Math.pow(10, (floorNumber - lastF) / 500));
  }

  for (let i = 0; i < FLOOR_LEVEL_ANCHORS.length - 1; i++) {
    const [a1, l1] = FLOOR_LEVEL_ANCHORS[i]!;
    const [a2, l2] = FLOOR_LEVEL_ANCHORS[i + 1]!;
    if (floorNumber <= a2) {
      const t = (floorNumber - a1) / (a2 - a1);
      return Math.floor(l1 * Math.pow(l2 / l1, t));
    }
  }

  return 1;
}

export function getFloorInfo(dungeonId: string, floorNumber: number): FloorInfo {
  return {
    dungeonId,
    floorNumber,
    monsterLevel: getMonsterLevel(floorNumber),
    bossType: getBossType(floorNumber),
  };
}
