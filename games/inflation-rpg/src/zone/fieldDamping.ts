/** V3-D Multi-zone damping. Spec §4.3.
 *  effectiveDiff = max(0, fieldLv - heroLv - buff6Threshold)
 *  damping = 1 / (1 + 0.05 × effectiveDiff)
 *  Soft log curve. buff #6 (field_diff threshold) 가 diff 의 일부 흡수. */
export function computeFieldDamping(heroLv: number, fieldLv: number, buff6Threshold: number): number {
  const effectiveDiff = Math.max(0, fieldLv - heroLv - buff6Threshold);
  return 1 / (1 + 0.05 * effectiveDiff);
}
