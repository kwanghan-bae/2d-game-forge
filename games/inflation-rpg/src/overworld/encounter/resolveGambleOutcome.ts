/**
 * resolveGambleOutcome — pure function for gamble resolution.
 * C864: Extracted from EventEffectResolver (gambler) and EncounterEngine (merchant gamble).
 */

export interface GambleParams {
  winRate: number;
  heroGold: number;
  rng: number; // pre-rolled 0-1 value (pure: no side effects)
  // Gambler-specific
  betHighRewardMul?: number;   // e.g. 3.0 for BET_HIGH
  betLowRewardMul?: number;    // e.g. 1.5 for BET_LOW
  betHighLossRate?: number;    // e.g. 0.60
  betLowLossRate?: number;     // e.g. 0.25
  isHighBet?: boolean;
  // Merchant-specific
  merchantLossGold?: number;   // flat gold on loss (0 = free)
}

export interface GambleResult {
  won: boolean;
  goldDelta: number;
}

export function resolveGambleOutcome(p: GambleParams): GambleResult {
  const won = p.rng < p.winRate;

  if (won) {
    const rewardMul = p.isHighBet ? (p.betHighRewardMul ?? 3.0) : (p.betLowRewardMul ?? 1.5);
    const goldDelta = Math.floor(p.heroGold * (rewardMul - 1));
    return { won: true, goldDelta };
  }

  // Loss path
  if (p.merchantLossGold !== undefined) {
    // Merchant gamble: flat gold (currently 0, will be rate-based in C865)
    return { won: false, goldDelta: p.merchantLossGold };
  }

  const lossRate = p.isHighBet ? (p.betHighLossRate ?? 0.60) : (p.betLowLossRate ?? 0.25);
  const goldDelta = -Math.floor(p.heroGold * lossRate);
  return { won: false, goldDelta };
}
