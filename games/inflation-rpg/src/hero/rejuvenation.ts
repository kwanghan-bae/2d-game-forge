/** Light-resource cost for one rejuvenation step. Linear in age beyond 5.
 *  Spec §4.3 — magnitude tuned in V3-G balance pass. */
export function rejuvenationCost(age: number): number {
  if (age <= 5) return 0;
  return (age - 5) * 10;
}
