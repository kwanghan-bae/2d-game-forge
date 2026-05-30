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
import {
  TRAP_AVOID_COMBO,
  EVENT_PITY_THRESHOLD,
  HEALER_EVENT_CHANCE,
  HEALER_HEAL_RATE,
  HEALER_MIN_FIGHTS,
  ECHO_EVENT_CHANCE,
  ECHO_DURATION,
  ECHO_MIN_LEVEL,
  INSPIRATION_EVENT_CHANCE,
} from './constants-events';
import { getInspirationConfig } from './ConstantPhaseProfile';
import { getAvailableLateEvents } from './EventGateConfig';

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
  fightsSinceEvent: number; // C714: pity timer
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
  newPrestigeEchoRemaining: number;
  newInspirationRemaining: number;
  newColosseumRemaining: number;
  voidRiftTriggered: boolean;
  eventChainReward: boolean;
  comboReset: boolean;
  shrinePending: boolean;
  shrineChoice: 'gold' | 'exp' | 'heal' | null;
  gamblerWon: boolean | null;
  merchantPending: boolean;
  gamblerPending: boolean;
  altarPending: boolean;
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
    newPrestigeEchoRemaining: 0,
    newInspirationRemaining: 0,
    newColosseumRemaining: 0,
    voidRiftTriggered: false,
    eventChainReward: false,
    comboReset: false,
    shrinePending: false,
    shrineChoice: null,
    gamblerWon: null,
    merchantPending: false,
    gamblerPending: false,
    altarPending: false,
  };

  if (result.newCursedAltarRemaining === 0 && ctx.cursedAltarRemaining > 0) {
    result.newCursedAltarAtkBuff = false;
  }

  const eventsEnabled = ctx.totalFights > 20;
  let eventTriggered = false;
  // C714: pity timer — force event if N fights without one
  // C718: pity skips negative events (trap) — only positive events benefit
  const pityActive = eventsEnabled && ctx.fightsSinceEvent >= EVENT_PITY_THRESHOLD;
  const rngOrPity = (rate: number) => pityActive || ctx.rngChance(rate);

  // Trap — NOT pity-eligible (negative event)
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
  if (eventsEnabled && !eventTriggered && rngOrPity(TREASURE_SHRINE_CHANCE)) {
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
  if (eventsEnabled && !eventTriggered && ctx.strategyRestShrine && rngOrPity(REST_SHRINE_CHANCE) && ctx.heroHp < ctx.heroHpMax * 0.3) {
    result.heroHpDelta = ctx.heroHpMax - ctx.heroHp;
    result.comboReset = true;
    result.eventType = 'event_rest_shrine';
    eventTriggered = true;
  }

  // Wandering Merchant — set pending for player choice (C704: priority raised from last)
  if (eventsEnabled && !eventTriggered && !ctx.isElite && !ctx.isBoss && rngOrPity(MERCHANT_EVENT_CHANCE) && ctx.heroGold >= 200 && ctx.relics.length < 3) {
    const available = [0, 1, 2, 3, 4, 5].filter(id => !ctx.relics.includes(id));
    if (available.length > 0) {
      result.merchantPending = true;
      result.eventType = 'event_merchant';
      eventTriggered = true;
    }
  }

  // Gambler — set pending for player choice
  if (eventsEnabled && !eventTriggered && ctx.strategyGambler && rngOrPity(GAMBLER_CHANCE) && ctx.heroGold >= 50) {
    result.gamblerPending = true;
    result.eventType = 'event_gambler';
    eventTriggered = true;
  }

  // Blacksmith
  if (eventsEnabled && !eventTriggered && ctx.strategyBlacksmith && rngOrPity(BLACKSMITH_CHANCE)) {
    result.heroAtkDelta = BLACKSMITH_BOOST;
    result.eventType = 'event_blacksmith';
    eventTriggered = true;
  }

  // Cursed altar — set pending for player choice
  if (eventsEnabled && !eventTriggered && ctx.strategyCursedAltar && rngOrPity(CURSED_ALTAR_CHANCE) && !ctx.cursedAltarAtkBuff) {
    result.altarPending = true;
    result.eventType = 'event_cursed_altar';
    eventTriggered = true;
  }

  // Fairy blessing
  if (eventsEnabled && !eventTriggered && rngOrPity(FAIRY_CHANCE)) {
    result.newFairyBlessingRemaining = FAIRY_DURATION;
    result.eventType = 'event_fairy';
    eventTriggered = true;
  }

  // C743: Healer event — mid-game HP recovery
  if (eventsEnabled && !eventTriggered && ctx.totalFights >= HEALER_MIN_FIGHTS && rngOrPity(HEALER_EVENT_CHANCE)) {
    result.heroHpDelta = Math.floor(ctx.heroHpMax * HEALER_HEAL_RATE);
    result.eventType = 'event_healer';
    eventTriggered = true;
  }

  // C743: Echo event — grants short prestige echo
  if (eventsEnabled && !eventTriggered && ctx.heroLevel >= ECHO_MIN_LEVEL && rngOrPity(ECHO_EVENT_CHANCE)) {
    result.newPrestigeEchoRemaining = ECHO_DURATION;
    result.eventType = 'event_echo';
    eventTriggered = true;
  }

  // C751: Inspiration event — phase-aware ATK buff
  const inspConfig = getInspirationConfig(ctx.totalFights);
  if (eventsEnabled && !eventTriggered && ctx.totalFights >= inspConfig.minFights && rngOrPity(INSPIRATION_EVENT_CHANCE)) {
    result.newInspirationRemaining = inspConfig.duration;
    result.eventType = 'event_inspiration';
    eventTriggered = true;
  }

  // C755: Late-game exclusive events
  if (eventsEnabled && !eventTriggered) {
    const lateEvents = getAvailableLateEvents(ctx.totalFights);
    for (const le of lateEvents) {
      if (rngOrPity(le.chance)) {
        if (le.id === 'event_ancient_colosseum') {
          result.newColosseumRemaining = 5;
          result.eventType = 'event_ancient_colosseum';
        } else if (le.id === 'event_void_rift') {
          result.voidRiftTriggered = true;
          result.eventType = 'event_void_rift';
        }
        eventTriggered = true;
        break;
      }
    }
  }

  // Time rift
  if (eventsEnabled && !eventTriggered && rngOrPity(TIME_RIFT_CHANCE) && ctx.fightsSinceVillage > 50) {
    result.newFightsSinceVillage = 0;
    result.eventType = 'event_time_rift';
    eventTriggered = true;
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
