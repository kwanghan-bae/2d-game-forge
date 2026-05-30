import {
  TRAP_CHANCE,
  TRAP_DAMAGE,
  TRAP_GOLD_LOSS,
  TREASURE_SHRINE_CHANCE,
  SHRINE_GOLD_BURST,
  SHRINE_EXP_BURST,
  SHRINE_HEAL_AMOUNT,
  REST_SHRINE_CHANCE,
  GAMBLER_CHANCE,
  GAMBLER_WIN_RATE,
  BLACKSMITH_CHANCE,
  BLACKSMITH_BOOST,
  CURSED_ALTAR_CHANCE,
  CURSED_ALTAR_DURATION,
  FAIRY_CHANCE,
  FAIRY_DURATION,
  TIME_RIFT_CHANCE,
  MERCHANT_EVENT_CHANCE,
  MERCHANT_PRICE_MUL,
  EVENT_CHAIN_THRESHOLD,
  EVENT_CHAIN_REWARD_EXP,
  EVENT_CHAIN_REWARD_GOLD,
} from './constants-combat';
import { TRAP_AVOID_COMBO } from './constants-events';

export interface PostCombatContext {
  totalFights: number;
  comboStreak: number;
  heroHp: number;
  heroHpMax: number;
  heroGold: number;
  heroAtk: number;
  heroLevel: number;
  isElite: boolean;
  isBoss: boolean;
  cursedAltarRemaining: number;
  cursedAltarAtkBuff: boolean;
  fairyBlessingRemaining: number;
  relics: number[];
  relicLevels: number[];
  fightsSinceVillage: number;
  eventChainCount: number;
  consecutiveEliteKills2: number;
  goldenHourRemaining: number;
  strategyRestShrine: boolean;
  strategyGambler: boolean;
  strategyBlacksmith: boolean;
  strategyCursedAltar: boolean;
  rngChance: (rate: number) => boolean;
  rngInt: (n: number) => number;
  hasPendingShrineChoice: () => boolean;
}

export interface PostCombatResult {
  eventType: string | null;
  heroHpDelta: number;
  heroGoldDelta: number;
  heroAtkDelta: number;
  heroExpDelta: number;
  newCursedAltarRemaining: number;
  newCursedAltarAtkBuff: boolean;
  newFairyBlessingRemaining: number;
  newEventChainCount: number;
  newFightsSinceVillage: number;
  newRelics: number[];
  newRelicLevels: number[];
  eventChainReward: boolean;
  comboReset: boolean;
  shrinePending: boolean;
  shrineChoice: 'gold' | 'exp' | 'heal' | null;
  gamblerWon: boolean | null;
}

export function resolvePostCombatEvent(ctx: PostCombatContext): PostCombatResult {
  const result: PostCombatResult = {
    eventType: null,
    heroHpDelta: 0,
    heroGoldDelta: 0,
    heroAtkDelta: 0,
    heroExpDelta: 0,
    newCursedAltarRemaining: Math.max(0, ctx.cursedAltarRemaining - 1),
    newCursedAltarAtkBuff: ctx.cursedAltarAtkBuff,
    newFairyBlessingRemaining: Math.max(0, ctx.fairyBlessingRemaining - 1),
    newEventChainCount: 0,
    newFightsSinceVillage: ctx.fightsSinceVillage,
    newRelics: [...ctx.relics],
    newRelicLevels: [...ctx.relicLevels],
    eventChainReward: false,
    comboReset: false,
    shrinePending: false,
    shrineChoice: null,
    gamblerWon: null,
  };

  if (result.newCursedAltarRemaining === 0 && ctx.cursedAltarRemaining > 0) {
    result.newCursedAltarAtkBuff = false;
  }

  const eventsEnabled = ctx.totalFights > 20;
  let eventTriggered = false;

  // Trap
  if (eventsEnabled && !eventTriggered && ctx.rngChance(TRAP_CHANCE)) {
    if (ctx.comboStreak >= TRAP_AVOID_COMBO) {
      result.eventType = 'event_trap_avoided';
    } else {
      const trapChoice = ctx.rngInt(2);
      if (trapChoice === 0) {
        result.heroHpDelta = -Math.floor(ctx.heroHpMax * TRAP_DAMAGE);
      } else {
        result.heroGoldDelta = -TRAP_GOLD_LOSS;
      }
      result.eventType = 'event_trap';
    }
    eventTriggered = true;
  }

  // Treasure shrine
  if (eventsEnabled && !eventTriggered && ctx.rngChance(TREASURE_SHRINE_CHANCE)) {
    if (!ctx.hasPendingShrineChoice()) {
      result.shrinePending = true;
      result.eventType = 'event_treasure_shrine_pending';
    } else {
      // Shrine already resolved by choice engine — signal gold reward
      result.shrineChoice = 'gold'; // engine overrides with actual choice
      result.eventType = 'event_treasure_shrine';
    }
    eventTriggered = true;
  }

  // Rest shrine
  if (eventsEnabled && !eventTriggered && ctx.strategyRestShrine && ctx.rngChance(REST_SHRINE_CHANCE) && ctx.heroHp < ctx.heroHpMax * 0.3) {
    result.heroHpDelta = ctx.heroHpMax - ctx.heroHp;
    result.comboReset = true;
    result.eventType = 'event_rest_shrine';
    eventTriggered = true;
  }

  // Gambler
  if (eventsEnabled && !eventTriggered && ctx.strategyGambler && ctx.rngChance(GAMBLER_CHANCE) && ctx.heroGold >= 50) {
    if (ctx.rngChance(GAMBLER_WIN_RATE)) {
      result.heroGoldDelta = ctx.heroGold; // double (engine: hero.gold *= 2)
      result.gamblerWon = true;
    } else {
      result.heroGoldDelta = -Math.floor(ctx.heroGold * 0.5);
      result.gamblerWon = false;
    }
    result.eventType = 'event_gambler';
    eventTriggered = true;
  }

  // Blacksmith
  if (eventsEnabled && !eventTriggered && ctx.strategyBlacksmith && ctx.rngChance(BLACKSMITH_CHANCE)) {
    result.heroAtkDelta = BLACKSMITH_BOOST;
    result.eventType = 'event_blacksmith';
    eventTriggered = true;
  }

  // Cursed altar
  if (eventsEnabled && !eventTriggered && ctx.strategyCursedAltar && ctx.rngChance(CURSED_ALTAR_CHANCE) && !ctx.cursedAltarAtkBuff) {
    result.newCursedAltarAtkBuff = true;
    result.newCursedAltarRemaining = CURSED_ALTAR_DURATION;
    result.eventType = 'event_cursed_altar';
    eventTriggered = true;
  }

  // Fairy blessing
  if (eventsEnabled && !eventTriggered && ctx.rngChance(FAIRY_CHANCE)) {
    result.newFairyBlessingRemaining = FAIRY_DURATION;
    result.eventType = 'event_fairy';
    eventTriggered = true;
  }

  // Time rift
  if (eventsEnabled && !eventTriggered && ctx.rngChance(TIME_RIFT_CHANCE) && ctx.fightsSinceVillage > 50) {
    result.newFightsSinceVillage = 0;
    result.eventType = 'event_time_rift';
    eventTriggered = true;
  }

  // Wandering Merchant
  if (!eventTriggered && !ctx.isElite && !ctx.isBoss && ctx.rngChance(MERCHANT_EVENT_CHANCE) && ctx.heroGold >= 200 && ctx.relics.length < 3) {
    const available = [0, 1, 2, 3, 4, 5].filter(id => !ctx.relics.includes(id));
    if (available.length > 0) {
      const offered = available[ctx.rngInt(available.length)];
      const cost = 200 * MERCHANT_PRICE_MUL;
      if (ctx.heroGold >= cost) {
        result.heroGoldDelta = -cost;
        result.newRelics = [...ctx.relics, offered];
        result.newRelicLevels = [...ctx.relicLevels, 1];
        result.eventType = 'event_merchant';
        eventTriggered = true;
      }
    }
  }

  // Event chain
  if (eventTriggered) {
    result.newEventChainCount = ctx.eventChainCount + 1;
    if (result.newEventChainCount >= EVENT_CHAIN_THRESHOLD) {
      result.heroExpDelta += EVENT_CHAIN_REWARD_EXP;
      result.heroGoldDelta += EVENT_CHAIN_REWARD_GOLD;
      result.eventChainReward = true;
      result.newEventChainCount = 0;
    }
  } else {
    result.newEventChainCount = 0;
  }

  return result;
}
