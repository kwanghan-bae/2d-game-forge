/**
 * HeroDecisionAI — Pure decision functions for auto-play choices.
 * C723: AI conditionally chooses BET_HIGH when gold surplus is large.
 */

export type GamblerBetChoice = 'BET_HIGH' | 'BET_LOW';

const AI_BET_HIGH_GOLD_RATIO = 3;

export function chooseGamblerBet(heroGold: number, nextUpgradeCost: number): GamblerBetChoice {
  return heroGold > AI_BET_HIGH_GOLD_RATIO * nextUpgradeCost ? 'BET_HIGH' : 'BET_LOW';
}
