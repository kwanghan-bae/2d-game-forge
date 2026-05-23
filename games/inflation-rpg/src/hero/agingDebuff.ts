export interface AgingDebuff {
  atkMul: number;
  hpMul: number;
  moveMul: number;
}

const ONE: AgingDebuff = { atkMul: 1, hpMul: 1, moveMul: 1 };

/** Age → multiplicative debuff (1 = unaffected). Piecewise:
 *  - <50  : no debuff
 *  - 50-69: light (-2-5% per stat, growing)
 *  - 70-99: medium (-5% → -45%)
 *  - 100-199: severe (-45% → -90%)
 *  - 200+ : near-frozen, asymptotic to 0 but never zero (영원 hero).
 *  V3-G balance pass 에서 magnitude tune 가능. */
export function getAgingDebuff(age: number): AgingDebuff {
  if (age < 50) return { ...ONE };
  if (age < 70) {
    // t goes from ~0.05 at age 50 to 1.0 at age 69; debuff starts immediately
    const t = (age - 50 + 1) / 20;
    return {
      atkMul: 1 - 0.05 * t,
      hpMul:  1 - 0.05 * t,
      moveMul: 1 - 0.02 * t,
    };
  }
  if (age < 100) {
    const t = (age - 70) / 30;
    return {
      atkMul: 0.95 - 0.40 * t,
      hpMul:  0.95 - 0.40 * t,
      moveMul: 0.98 - 0.48 * t,
    };
  }
  if (age < 200) {
    const t = (age - 100) / 100;
    return {
      atkMul: 0.55 - 0.45 * t,
      hpMul:  0.55 - 0.45 * t,
      moveMul: 0.50 - 0.40 * t,
    };
  }
  const decay = 0.10 / (1 + (age - 200) / 100);
  return {
    atkMul: Math.max(0.005, decay),
    hpMul:  Math.max(0.005, decay),
    moveMul: Math.max(0.005, decay),
  };
}
