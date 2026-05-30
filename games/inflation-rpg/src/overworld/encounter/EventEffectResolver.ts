import { MerchantChoice, GamblerChoice, AltarChoice } from './EventChoiceEngine';
import {
  MERCHANT_PRICE_MUL,
  GAMBLER_WIN_RATE,
  GAMBLER_BET_HIGH_REWARD_MUL,
  GAMBLER_BET_HIGH_LOSS_RATE,
  GAMBLER_BET_LOW_LOSS_RATE,
  CURSED_ALTAR_DAMAGE_MUL,
  CURSED_ALTAR_HP_THRESHOLD,
} from './constants-events';

export interface EventEffectContext {
  heroGold: number;
  heroHp: number;
  heroHpMax: number;
  heroAtk: number;
  heroLevel: number;
  relics: number[];
  relicLevels: number[];
  rngChance: (rate: number) => boolean;
  rngInt: (n: number) => number;
}

export interface EventEffectResult {
  goldDelta: number;
  hpDelta: number;
  atkDelta: number;
  newRelics: number[];
  newRelicLevels: number[];
  cursedAltarActivated: boolean;
  eventSubType: string | null;
}

const EMPTY_RESULT: EventEffectResult = {
  goldDelta: 0,
  hpDelta: 0,
  atkDelta: 0,
  newRelics: [],
  newRelicLevels: [],
  cursedAltarActivated: false,
  eventSubType: null,
};

export function resolveEventEffects(
  eventType: 'merchant' | 'gambler' | 'altar',
  choice: MerchantChoice | GamblerChoice | AltarChoice,
  ctx: EventEffectContext,
): EventEffectResult {
  if (eventType === 'merchant') return resolveMerchant(choice as MerchantChoice, ctx);
  if (eventType === 'gambler') return resolveGambler(choice as GamblerChoice, ctx);
  return resolveAltar(choice as AltarChoice, ctx);
}

function resolveMerchant(choice: MerchantChoice, ctx: EventEffectContext): EventEffectResult {
  if (choice === MerchantChoice.IGNORE) {
    return { ...EMPTY_RESULT, newRelics: [...ctx.relics], newRelicLevels: [...ctx.relicLevels], eventSubType: 'event_merchant_ignore' };
  }
  if (choice === MerchantChoice.BUY) {
    const available = [0, 1, 2, 3, 4, 5].filter(id => !ctx.relics.includes(id));
    if (available.length === 0) {
      return { ...EMPTY_RESULT, newRelics: [...ctx.relics], newRelicLevels: [...ctx.relicLevels], eventSubType: 'event_merchant_ignore' };
    }
    const offered = available[ctx.rngInt(available.length)];
    const cost = 200 * MERCHANT_PRICE_MUL;
    return {
      goldDelta: -cost,
      hpDelta: 0,
      atkDelta: 0,
      newRelics: [...ctx.relics, offered],
      newRelicLevels: [...ctx.relicLevels, 1],
      cursedAltarActivated: false,
      eventSubType: 'event_merchant_buy',
    };
  }
  // SELL: sell last relic for half price
  if (ctx.relics.length === 0) {
    return { ...EMPTY_RESULT, newRelics: [], newRelicLevels: [], eventSubType: 'event_merchant_ignore' };
  }
  const sellValue = Math.floor(200 * MERCHANT_PRICE_MUL * 0.5);
  return {
    goldDelta: sellValue,
    hpDelta: 0,
    atkDelta: 0,
    newRelics: ctx.relics.slice(0, -1),
    newRelicLevels: ctx.relicLevels.slice(0, -1),
    cursedAltarActivated: false,
    eventSubType: 'event_merchant_sell',
  };
}

function resolveGambler(choice: GamblerChoice, ctx: EventEffectContext): EventEffectResult {
  if (choice === GamblerChoice.WALK_AWAY) {
    return { ...EMPTY_RESULT, eventSubType: 'event_gambler_walk' };
  }
  const betRate = choice === GamblerChoice.BET_HIGH ? GAMBLER_WIN_RATE : GAMBLER_WIN_RATE + 0.20;
  const won = ctx.rngChance(betRate);
  if (won) {
    // C714: BET_HIGH 3x gold, BET_LOW 1.5x gold
    const winAmount = choice === GamblerChoice.BET_HIGH
      ? Math.floor(ctx.heroGold * (GAMBLER_BET_HIGH_REWARD_MUL - 1))
      : Math.floor(ctx.heroGold * 0.5);
    return { ...EMPTY_RESULT, goldDelta: winAmount, eventSubType: 'event_gambler_win' };
  }
  // C714: BET_HIGH loses 60%, BET_LOW loses 25%
  const loseAmount = choice === GamblerChoice.BET_HIGH
    ? Math.floor(ctx.heroGold * GAMBLER_BET_HIGH_LOSS_RATE)
    : Math.floor(ctx.heroGold * GAMBLER_BET_LOW_LOSS_RATE);
  const loseSubType = choice === GamblerChoice.BET_HIGH ? 'event_gambler_lose_high' : 'event_gambler_lose_low';
  return { ...EMPTY_RESULT, goldDelta: -loseAmount, eventSubType: loseSubType };
}

function resolveAltar(choice: AltarChoice, ctx: EventEffectContext): EventEffectResult {
  if (choice === AltarChoice.LEAVE) {
    return { ...EMPTY_RESULT, eventSubType: 'event_altar_leave' };
  }
  if (choice === AltarChoice.PRAY) {
    // Small heal, no curse
    const healAmount = Math.floor(ctx.heroHpMax * 0.1);
    return { ...EMPTY_RESULT, hpDelta: healAmount, eventSubType: 'event_altar_pray' };
  }
  // SACRIFICE: blocked if HP ratio below threshold → fallback to PRAY
  const hpRatio = ctx.heroHp / ctx.heroHpMax;
  if (hpRatio < CURSED_ALTAR_HP_THRESHOLD) {
    const healAmount = Math.floor(ctx.heroHpMax * 0.1);
    return { ...EMPTY_RESULT, hpDelta: healAmount, eventSubType: 'event_altar_pray' };
  }
  // HP cost, activate cursed altar buff
  const hpCost = -Math.floor(ctx.heroHpMax * (CURSED_ALTAR_DAMAGE_MUL * 0.1));
  return {
    goldDelta: 0,
    hpDelta: hpCost,
    atkDelta: 0,
    newRelics: [],
    newRelicLevels: [],
    cursedAltarActivated: true,
    eventSubType: 'event_altar_sacrifice',
  };
}
