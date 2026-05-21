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

/** Cost of the (N+1)-th atk upgrade. N = current atkBaseBonus. */
export function costForNextAtk(currentBonus: number): number {
  return 50 + currentBonus * 10;
}

/** Cost of the (N+1)-th hp upgrade. N = current hpBaseBonus. */
export function costForNextHp(currentBonus: number): number {
  return 30 + currentBonus * 6;
}

export type SpendStrategy =
  | 'balanced'        // alternate atk / hp
  | 'atk-focus'       // all in atk
  | 'hp-focus'        // all in hp
  | 'random'          // 50/50 per purchase (uses provided rng)
  | 'personality';    // axis driven by personality dim — heroic=atk, prudent=hp

export interface SpendInput {
  gold: number;
  atkBaseBonus: number;
  hpBaseBonus: number;
  strategy: SpendStrategy;
  /** Required for 'random' and 'personality' strategies. */
  rngNext?: () => number;
  /** Hero personality, used by 'personality' strategy. heroic→atk; prudent→hp. */
  personality?: { heroic: number; prudent: number };
}

export interface SpendOutput {
  goldRemaining: number;
  atkBaseBonus: number;
  hpBaseBonus: number;
  atkPurchases: number;
  hpPurchases: number;
}

export function spend(input: SpendInput): SpendOutput {
  let gold = input.gold;
  let atk = input.atkBaseBonus;
  let hp = input.hpBaseBonus;
  let atkBuys = 0;
  let hpBuys = 0;

  const decide = (): 'atk' | 'hp' | 'stop' => {
    switch (input.strategy) {
      case 'balanced':
        return atkBuys <= hpBuys ? 'atk' : 'hp';
      case 'atk-focus':
        return 'atk';
      case 'hp-focus':
        return 'hp';
      case 'random':
        return (input.rngNext?.() ?? Math.random()) < 0.5 ? 'atk' : 'hp';
      case 'personality': {
        const p = input.personality ?? { heroic: 0, prudent: 0 };
        // Higher heroic → atk preference; higher prudent → hp preference.
        // Tie → balanced fallback.
        const score = p.heroic - p.prudent;
        if (score > 0) return 'atk';
        if (score < 0) return 'hp';
        return atkBuys <= hpBuys ? 'atk' : 'hp';
      }
    }
  };

  const allowsAltFallback = (s: SpendStrategy): boolean => s === 'balanced' || s === 'random' || s === 'personality';

  while (gold > 0) {
    const target = decide();
    if (target === 'stop') break;
    const cost = target === 'atk' ? costForNextAtk(atk) : costForNextHp(hp);
    if (gold < cost) {
      if (!allowsAltFallback(input.strategy)) break;
      const altTarget = target === 'atk' ? 'hp' : 'atk';
      const altCost = altTarget === 'atk' ? costForNextAtk(atk) : costForNextHp(hp);
      if (gold < altCost) break;
      if (altTarget === 'atk') { atk += 1; atkBuys += 1; }
      else                     { hp += 1; hpBuys += 1; }
      gold -= altCost;
      continue;
    }
    if (target === 'atk') { atk += 1; atkBuys += 1; }
    else                  { hp += 1; hpBuys += 1; }
    gold -= cost;
  }

  return { goldRemaining: gold, atkBaseBonus: atk, hpBaseBonus: hp, atkPurchases: atkBuys, hpPurchases: hpBuys };
}
