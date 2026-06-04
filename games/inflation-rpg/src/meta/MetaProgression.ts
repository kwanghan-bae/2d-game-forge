/**
 * Sim-M — between-cycle persistent growth.
 *
 * Each cycle ends with a `goldFromCycle` payout derived from the hero's
 * performance. The player (or a sim strategy) spends gold on persistent
 * `atkBaseBonus` / `hpBaseBonus` upgrades that apply to ALL future cycles.
 *
 * Cost curve is sub-quadratic so early upgrades are cheap; late-game
 * accumulation matters but doesn't trivialize.
 */

export interface CycleStats {
  maxLevel: number;
  kills: number;
  bossKills: number;
  drops: number;
}

export function goldFromCycle(stats: CycleStats): number {
  return Math.max(
    1,
    Math.floor(
      10 +
      stats.maxLevel * 0.1 +
      stats.kills +
      stats.bossKills * 25 +
      stats.drops * 2
    ),
  );
}

/** C1000: JP earned per cycle. Scales with boss kills + peak level. */
export function jpFromCycle(stats: CycleStats): number {
  return Math.max(1, Math.floor(1 + stats.bossKills * 2 + stats.maxLevel / 1000));
}

/** Cost of the (N+1)-th atk upgrade. N = current atkBaseBonus. */
export function costForNextAtk(currentBonus: number): number {
  return 50 + currentBonus * 10;
}

/** Cost of the (N+1)-th hp upgrade. N = current hpBaseBonus. */
export function costForNextHp(currentBonus: number): number {
  return 30 + currentBonus * 6;
}

/** C998: Cost of the (N+1)-th luck upgrade. N = current luckBaseBonus. */
export function costForNextLuck(currentBonus: number): number {
  return 80 + currentBonus * 15;
}

export type SpendStrategy =
  | 'balanced'        // alternate atk / hp / luck
  | 'atk-focus'       // all in atk
  | 'hp-focus'        // all in hp
  | 'luck-focus'      // all in luck (C998)
  | 'random'          // 33/33/33 per purchase (uses provided rng)
  | 'personality';    // axis driven by personality dim — heroic=atk, prudent=hp, merciful=luck

export interface SpendInput {
  gold: number;
  atkBaseBonus: number;
  hpBaseBonus: number;
  luckBaseBonus?: number;
  strategy: SpendStrategy;
  /** Required for 'random' and 'personality' strategies. */
  rngNext?: () => number;
  /** Hero personality, used by 'personality' strategy. heroic→atk; prudent→hp; merciful→luck. */
  personality?: { heroic: number; prudent: number; merciful?: number };
}

export interface SpendOutput {
  goldRemaining: number;
  atkBaseBonus: number;
  hpBaseBonus: number;
  luckBaseBonus: number;
  atkPurchases: number;
  hpPurchases: number;
  luckPurchases: number;
}

export function spend(input: SpendInput): SpendOutput {
  let gold = input.gold;
  let atk = input.atkBaseBonus;
  let hp = input.hpBaseBonus;
  let luck = input.luckBaseBonus ?? 0;
  let atkBuys = 0;
  let hpBuys = 0;
  let luckBuys = 0;

  const decide = (): 'atk' | 'hp' | 'luck' | 'stop' => {
    switch (input.strategy) {
      case 'balanced': {
        const totalBuys = atkBuys + hpBuys + luckBuys;
        const mod = totalBuys % 3;
        return mod === 0 ? 'atk' : mod === 1 ? 'hp' : 'luck';
      }
      case 'atk-focus':
        return 'atk';
      case 'hp-focus':
        return 'hp';
      case 'luck-focus':
        return 'luck';
      case 'random': {
        const r = input.rngNext?.() ?? Math.random();
        return r < 0.33 ? 'atk' : r < 0.66 ? 'hp' : 'luck';
      }
      case 'personality': {
        const p = input.personality ?? { heroic: 0, prudent: 0, merciful: 0 };
        const scores = [
          { axis: 'atk' as const, val: p.heroic },
          { axis: 'hp' as const, val: p.prudent },
          { axis: 'luck' as const, val: p.merciful ?? 0 },
        ];
        scores.sort((a, b) => b.val - a.val);
        return scores[0]!.axis;
      }
    }
  };

  const costFor = (target: 'atk' | 'hp' | 'luck'): number => {
    if (target === 'atk') return costForNextAtk(atk);
    if (target === 'hp') return costForNextHp(hp);
    return costForNextLuck(luck);
  };

  const buy = (target: 'atk' | 'hp' | 'luck') => {
    if (target === 'atk') { atk += 1; atkBuys += 1; }
    else if (target === 'hp') { hp += 1; hpBuys += 1; }
    else { luck += 1; luckBuys += 1; }
  };

  const allowsAltFallback = (s: SpendStrategy): boolean =>
    s === 'balanced' || s === 'random' || s === 'personality';

  while (gold > 0) {
    const target = decide();
    if (target === 'stop') break;
    const cost = costFor(target);
    if (gold >= cost) {
      buy(target);
      gold -= cost;
    } else if (allowsAltFallback(input.strategy)) {
      // Try alternatives in order of cheapest
      const alts: ('atk' | 'hp' | 'luck')[] = ['atk', 'hp', 'luck'].filter(a => a !== target) as any;
      const sorted = alts.sort((a, b) => costFor(a) - costFor(b));
      let bought = false;
      for (const alt of sorted) {
        const altCost = costFor(alt);
        if (gold >= altCost) { buy(alt); gold -= altCost; bought = true; break; }
      }
      if (!bought) break;
    } else {
      break;
    }
  }

  return { goldRemaining: gold, atkBaseBonus: atk, hpBaseBonus: hp, luckBaseBonus: luck, atkPurchases: atkBuys, hpPurchases: hpBuys, luckPurchases: luckBuys };
}
