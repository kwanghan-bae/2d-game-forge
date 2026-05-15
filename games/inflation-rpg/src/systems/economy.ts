// Phase G — drop multiplier helper
export function applyDropMult(amount: number, perLv: number, lv: number): number {
  if (lv <= 0) return amount;
  return Math.floor(amount * (1 + perLv * lv));
}
