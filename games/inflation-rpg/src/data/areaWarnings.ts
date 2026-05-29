/** Danger warnings for areas significantly above player level */
const WARNINGS: string[] = [
  '이 근방에서 강한 기운이 느껴진다…',
  '마을 사람들이 여기를 피하라고 했다.',
  '풀 한 포기 자라지 않는 땅이다.',
  '공기가 무겁다. 조심하라.',
  '누군가의 비명이 들려온다… 아닌가?',
  '여기서 돌아간 자는 많아도, 돌아온 자는 드물다.',
];

/**
 * Returns a warning if area level significantly exceeds player level.
 * threshold: area level must be >= 2x player level to trigger.
 */
export function getAreaWarning(areaLevel: number, playerLevel: number): string | null {
  if (playerLevel <= 0 || areaLevel < playerLevel * 2) return null;
  const idx = (areaLevel + playerLevel) % WARNINGS.length;
  return WARNINGS[idx]!;
}
