import {
  TRAP_AVOID_COMBO,
  EVENT_PITY_THRESHOLD,
  HEALER_EVENT_CHANCE,
  HEALER_HEAL_RATE,
  HEALER_MIN_FIGHTS,
  ECHO_EVENT_CHANCE,
  ECHO_LATE_CHANCE,
  ECHO_LATE_THRESHOLD,
  ECHO_RAMP_END,
  ECHO_DURATION,
  ECHO_MIN_LEVEL,
  INSPIRATION_EVENT_CHANCE,
  TRAP_CHANCE,
  TRAP_DAMAGE,
  TRAP_GOLD_LOSS,
  TREASURE_SHRINE_CHANCE,
  REST_SHRINE_CHANCE,
  GAMBLER_CHANCE,
  BLACKSMITH_CHANCE,
  BLACKSMITH_BOOST,
  CURSED_ALTAR_CHANCE,
  FAIRY_CHANCE,
  FAIRY_LATE_CHANCE,
  FAIRY_LATE_THRESHOLD,
  FAIRY_RAMP_START,
  FAIRY_RAMP_END,
  FAIRY_DURATION,
  MENTOR_CHANCE,
  MENTOR_MIN_FIGHTS,
  MENTOR_MAX_FIGHTS,
  MENTOR_DURATION,
  RISK_GAMBIT_CHANCE,
  RISK_GAMBIT_MIN_FIGHTS,
  RISK_GAMBIT_MAX_FIGHTS,
  SPARRING_GROUNDS_CHANCE,
  SPARRING_GROUNDS_MIN_FIGHTS,
  SPARRING_GROUNDS_MAX_FIGHTS,
  MERCENARY_OFFER_CHANCE,
  MERCENARY_OFFER_MIN_FIGHTS,
  MERCENARY_OFFER_MAX_FIGHTS,
  CROSSROADS_CHANCE,
  CROSSROADS_PITY_THRESHOLD,
  CROSSROADS_MIN_FIGHTS,
  CROSSROADS_MAX_FIGHTS,
  WANDERING_MERCHANT_CHANCE,
  WANDERING_MERCHANT_MIN_FIGHTS,
  WANDERING_MERCHANT_MAX_FIGHTS,
  TIME_RIFT_CHANCE,
  MERCHANT_EVENT_CHANCE,
  EVENT_CHAIN_THRESHOLD,
  EVENT_CHAIN_REWARD_EXP,
  EVENT_CHAIN_REWARD_GOLD,
  TRIAL_GROUNDS_DURATION,
  EVENT_MOMENTUM_TIER2_THRESHOLD,
  EVENT_MOMENTUM_TIER3_THRESHOLD,
  EVENT_MOMENTUM_TIER3_DENSITY_MUL,
  EVENT_MOMENTUM_TIER3_DENSITY_CAP,
} from './constants-events';
import { getInspirationConfig } from './ConstantPhaseProfile';
import { getAvailableLateEvents, getAvailableMidEvents, getLateGameDensityMul } from './EventGateConfig';

// C792: Declarative late-event registry — add new events here (1 line each)
type LateEventResult = { [K: string]: unknown };
const LATE_EVENT_REGISTRY: Record<string, (r: LateEventResult) => void> = {
  event_ancient_colosseum: (r) => { r.colosseumPending = true; },
  event_void_rift: (r) => { r.voidRiftTriggered = true; },
  event_abyssal_convergence: (r) => { r.abyssalConvergencePending = true; },
  event_temporal_fissure: (r) => { r.temporalFissurePending = true; },
  event_titan_arena: (r) => { r.titanArenaPending = true; },
  event_crimson_tithe: (r) => { r.crimsonTithePending = true; },
  event_gold_crucible: (r) => { r.goldCruciblePending = true; },
  event_astral_paradox: (r) => { r.astralParadoxPending = true; },
  event_soul_forge: (r) => { r.soulForgePending = true; },
};

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
  eventMomentumDensityActive: boolean; // C793
  lateGameDensityBoost: number; // C845: late-game pity scheduler boost
  consecutiveEliteKills2: number;
  goldenHourRemaining: number;
  fightsSinceEvent: number; // C714: pity timer
  strategyRestShrine: boolean;
  strategyGambler: boolean;
  strategyBlacksmith: boolean;
  strategyCursedAltar: boolean;
  currentWeather?: string; // C770: for weather-conditional events
  crossroadsUsed: boolean; // C854: once-per-run crossroads gate
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
  newMentorRemaining: number; // C812: Wandering Mentor EXP buff
  newColosseumRemaining: number;
  colosseumPending: boolean;
  newTrialGroundsRemaining: number;
  trialGroundsPending: boolean;
  stormNexusPending: boolean;
  rainSanctuaryPending: boolean;
  fogAmbushPending: boolean;
  windGalePending: boolean; // C782
  snowDriftPending: boolean; // C782
  clearSkyPathPending: boolean; // C851
  abyssalConvergencePending: boolean; // C789
  temporalFissurePending: boolean; // C791
  titanArenaPending: boolean; // C797
  crimsonTithePending: boolean; // C803
  goldCruciblePending: boolean; // C800
  astralParadoxPending: boolean; // C800
  soulForgePending: boolean; // C806
  voidRiftTriggered: boolean;
  eventChainReward: boolean;
  eventMomentumTier: number; // C793: 0=none, 2=ATK buff, 3=density boost
  comboReset: boolean;
  shrinePending: boolean;
  shrineChoice: 'gold' | 'exp' | 'heal' | null;
  gamblerWon: boolean | null;
  merchantPending: boolean;
  gamblerPending: boolean;
  altarPending: boolean;
  riskGambitPending: boolean;
  sparringGroundsPending: boolean; // C841
  mercenaryOfferPending: boolean; // C848
  crossroadsPending: boolean; // C854
  wanderingMerchantPending: boolean; // C832
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
    newMentorRemaining: 0,
    newColosseumRemaining: 0,
    colosseumPending: false,
    newTrialGroundsRemaining: 0,
    trialGroundsPending: false,
    stormNexusPending: false,
    rainSanctuaryPending: false,
    fogAmbushPending: false,
    windGalePending: false,
    snowDriftPending: false,
    clearSkyPathPending: false,
    abyssalConvergencePending: false,
    temporalFissurePending: false,
    titanArenaPending: false,
    crimsonTithePending: false,
    goldCruciblePending: false,
    astralParadoxPending: false,
    soulForgePending: false,
    voidRiftTriggered: false,
    eventChainReward: false,
    eventMomentumTier: 0,
    comboReset: false,
    shrinePending: false,
    shrineChoice: null,
    gamblerWon: null,
    merchantPending: false,
    gamblerPending: false,
    altarPending: false,
    riskGambitPending: false,
    sparringGroundsPending: false,
    mercenaryOfferPending: false,
    crossroadsPending: false,
    wanderingMerchantPending: false,
  };

  if (result.newCursedAltarRemaining === 0 && ctx.cursedAltarRemaining > 0) {
    result.newCursedAltarAtkBuff = false;
  }

  const eventsEnabled = ctx.totalFights > 20;
  let eventTriggered = false;
  // C714: pity timer — force event if N fights without one
  const pityActive = eventsEnabled && ctx.fightsSinceEvent >= EVENT_PITY_THRESHOLD;

  // C809: Weighted event pool — replaces first-match-wins if-chain
  if (eventsEnabled) {
    const candidates: { id: string; weight: number; apply: (r: PostCombatResult) => void; pityEligible: boolean }[] = [];

    // Trap — NOT pity-eligible (negative event)
    candidates.push({
      id: 'trap', weight: TRAP_CHANCE, pityEligible: false,
      apply: (r) => {
        if (ctx.comboStreak >= TRAP_AVOID_COMBO) {
          r.eventType = 'event_trap_avoided';
        } else {
          const trapChoice = ctx.rngInt(2);
          if (trapChoice === 0) {
            r.heroHpDelta = -Math.floor(ctx.heroHpMax * TRAP_DAMAGE);
          } else {
            r.heroGoldDelta = -TRAP_GOLD_LOSS;
          }
          r.eventType = 'event_trap';
        }
      },
    });

    // Treasure shrine
    candidates.push({
      id: 'shrine', weight: TREASURE_SHRINE_CHANCE, pityEligible: true,
      apply: (r) => {
        if (!ctx.hasPendingShrineChoice()) {
          r.shrinePending = true;
          r.eventType = 'event_treasure_shrine_pending';
        } else {
          r.shrineChoice = 'gold';
          r.eventType = 'event_treasure_shrine';
        }
      },
    });

    // Rest shrine
    if (ctx.strategyRestShrine && ctx.heroHp < ctx.heroHpMax * 0.3) {
      candidates.push({
        id: 'rest', weight: REST_SHRINE_CHANCE, pityEligible: true,
        apply: (r) => {
          r.heroHpDelta = ctx.heroHpMax - ctx.heroHp;
          r.comboReset = true;
          r.eventType = 'event_rest_shrine';
        },
      });
    }

    // Wandering Merchant
    if (!ctx.isElite && !ctx.isBoss && ctx.heroGold >= 200 && ctx.relics.length < 3) {
      const available = [0, 1, 2, 3, 4, 5].filter(id => !ctx.relics.includes(id));
      if (available.length > 0) {
        candidates.push({
          id: 'merchant', weight: MERCHANT_EVENT_CHANCE, pityEligible: true,
          apply: (r) => { r.merchantPending = true; r.eventType = 'event_merchant'; },
        });
      }
    }

    // Gambler
    if (ctx.strategyGambler && ctx.heroGold >= 50) {
      candidates.push({
        id: 'gambler', weight: GAMBLER_CHANCE, pityEligible: true,
        apply: (r) => { r.gamblerPending = true; r.eventType = 'event_gambler'; },
      });
    }

    // Blacksmith
    if (ctx.strategyBlacksmith) {
      candidates.push({
        id: 'blacksmith', weight: BLACKSMITH_CHANCE, pityEligible: true,
        apply: (r) => { r.heroAtkDelta = Math.max(BLACKSMITH_BOOST, Math.floor(ctx.heroAtk * 0.03)); r.eventType = 'event_blacksmith'; },
      });
    }

    // Cursed altar
    if (ctx.strategyCursedAltar && !ctx.cursedAltarAtkBuff) {
      candidates.push({
        id: 'altar', weight: CURSED_ALTAR_CHANCE, pityEligible: true,
        apply: (r) => { r.altarPending = true; r.eventType = 'event_cursed_altar'; },
      });
    }

    // Fairy blessing — C835: linear ramp (fight 120→200, 2%→4%)
    const fairyWeight = ctx.totalFights <= FAIRY_RAMP_START ? FAIRY_CHANCE
      : ctx.totalFights >= FAIRY_RAMP_END ? FAIRY_LATE_CHANCE
      : FAIRY_CHANCE + (FAIRY_LATE_CHANCE - FAIRY_CHANCE) * ((ctx.totalFights - FAIRY_RAMP_START) / (FAIRY_RAMP_END - FAIRY_RAMP_START));
    candidates.push({
      id: 'fairy', weight: fairyWeight, pityEligible: true,
      apply: (r) => { r.newFairyBlessingRemaining = FAIRY_DURATION; r.eventType = 'event_fairy'; },
    });

    // C812: Wandering Mentor — early-game EXP buff (fights 25-99 only)
    if (ctx.totalFights >= MENTOR_MIN_FIGHTS && ctx.totalFights <= MENTOR_MAX_FIGHTS) {
      candidates.push({
        id: 'mentor', weight: MENTOR_CHANCE, pityEligible: true,
        apply: (r) => { r.newMentorRemaining = MENTOR_DURATION; r.eventType = 'event_mentor'; },
      });
    }

    // C826: Risk Gambit — early-game decision (fights 40-90, risk HP for gold)
    if (ctx.totalFights >= RISK_GAMBIT_MIN_FIGHTS && ctx.totalFights <= RISK_GAMBIT_MAX_FIGHTS) {
      candidates.push({
        id: 'risk_gambit', weight: RISK_GAMBIT_CHANCE, pityEligible: false,
        apply: (r) => { r.riskGambitPending = true; r.eventType = 'event_risk_gambit'; },
      });
    }

    // C841: Sparring Grounds — mid-early (fights 80-119, skill-check EXP/HP)
    if (ctx.totalFights >= SPARRING_GROUNDS_MIN_FIGHTS && ctx.totalFights <= SPARRING_GROUNDS_MAX_FIGHTS) {
      candidates.push({
        id: 'sparring_grounds', weight: SPARRING_GROUNDS_CHANCE, pityEligible: true,
        apply: (r) => { r.sparringGroundsPending = true; r.eventType = 'event_sparring_grounds'; },
      });
    }

    // C848: Mercenary Offer — gold investment → 3 fights shared combat (90-120)
    if (ctx.totalFights >= MERCENARY_OFFER_MIN_FIGHTS && ctx.totalFights <= MERCENARY_OFFER_MAX_FIGHTS) {
      candidates.push({
        id: 'mercenary_offer', weight: MERCENARY_OFFER_CHANCE, pityEligible: true,
        apply: (r) => { r.mercenaryOfferPending = true; r.eventType = 'event_mercenary_offer'; },
      });
    }

    // C832: Wandering Merchant — mid-game (fights 100-250, heal OR ATK buff)
    if (ctx.totalFights >= WANDERING_MERCHANT_MIN_FIGHTS && ctx.totalFights <= WANDERING_MERCHANT_MAX_FIGHTS) {
      candidates.push({
        id: 'wandering_merchant', weight: WANDERING_MERCHANT_CHANCE, pityEligible: false,
        apply: (r) => { r.wanderingMerchantPending = true; r.eventType = 'event_wandering_merchant'; },
      });
    }

    // C854: Crossroads Choice — once-per-run, 3 paths (fight 95-130)
    // C868: pity at 40 fights in window — force weight to 1.0
    if (!ctx.crossroadsUsed && ctx.totalFights >= CROSSROADS_MIN_FIGHTS && ctx.totalFights <= CROSSROADS_MAX_FIGHTS) {
      const fightsInWindow = ctx.totalFights - CROSSROADS_MIN_FIGHTS;
      const crossroadsWeight = fightsInWindow >= CROSSROADS_PITY_THRESHOLD ? 1.0 : CROSSROADS_CHANCE;
      candidates.push({
        id: 'crossroads', weight: crossroadsWeight, pityEligible: true,
        apply: (r) => { r.crossroadsPending = true; r.eventType = 'event_crossroads'; },
      });
    }

    // Healer
    if (ctx.totalFights >= HEALER_MIN_FIGHTS) {
      candidates.push({
        id: 'healer', weight: HEALER_EVENT_CHANCE, pityEligible: true,
        apply: (r) => { r.heroHpDelta = Math.floor(ctx.heroHpMax * HEALER_HEAL_RATE); r.eventType = 'event_healer'; },
      });
    }

    // Echo — C838: linear ramp (275-350, base→late)
    if (ctx.heroLevel >= ECHO_MIN_LEVEL) {
      let echoWeight = ECHO_EVENT_CHANCE;
      if (ctx.totalFights >= ECHO_RAMP_END) {
        echoWeight = ECHO_LATE_CHANCE;
      } else if (ctx.totalFights > ECHO_LATE_THRESHOLD) {
        echoWeight = ECHO_EVENT_CHANCE + (ECHO_LATE_CHANCE - ECHO_EVENT_CHANCE) *
          ((ctx.totalFights - ECHO_LATE_THRESHOLD) / (ECHO_RAMP_END - ECHO_LATE_THRESHOLD));
      }
      candidates.push({
        id: 'echo', weight: echoWeight, pityEligible: true,
        apply: (r) => { r.newPrestigeEchoRemaining = ECHO_DURATION; r.eventType = 'event_echo'; },
      });
    }

    // Inspiration
    const inspConfig = getInspirationConfig(ctx.totalFights);
    if (ctx.totalFights >= inspConfig.minFights) {
      candidates.push({
        id: 'inspiration', weight: INSPIRATION_EVENT_CHANCE, pityEligible: true,
        apply: (r) => { r.newInspirationRemaining = inspConfig.duration; r.eventType = 'event_inspiration'; },
      });
    }

    // Mid-game events
    const midEvents = getAvailableMidEvents(ctx.totalFights, ctx.currentWeather);
    for (const me of midEvents) {
      candidates.push({
        id: me.id, weight: me.chance, pityEligible: true,
        apply: (r) => {
          if (me.id === 'event_trial_grounds') { r.trialGroundsPending = true; }
          else if (me.id === 'event_storm_nexus') { r.stormNexusPending = true; }
          else if (me.id === 'event_rain_sanctuary') { r.rainSanctuaryPending = true; }
          else if (me.id === 'event_fog_ambush') { r.fogAmbushPending = true; }
          else if (me.id === 'event_wind_gale') { r.windGalePending = true; }
          else if (me.id === 'event_snow_drift') { r.snowDriftPending = true; }
          else if (me.id === 'event_clear_sky_path') { r.clearSkyPathPending = true; }
          r.eventType = me.id;
        },
      });
    }

    // Late-game events (with density multiplier, C814: hard cap 4.0, C832: T3 cap constant)
    const lateEvents = getAvailableLateEvents(ctx.totalFights);
    const baseDensity = getLateGameDensityMul(ctx.totalFights);
    const densityMul = ctx.eventMomentumDensityActive
      ? Math.min(EVENT_MOMENTUM_TIER3_DENSITY_CAP, baseDensity * EVENT_MOMENTUM_TIER3_DENSITY_MUL)
      : Math.min(4.0, baseDensity);
    // C845: apply late-game pity scheduler boost
    const lateBoost = ctx.lateGameDensityBoost;
    for (const le of lateEvents) {
      candidates.push({
        id: le.id, weight: le.chance * densityMul * lateBoost, pityEligible: true,
        apply: (r) => {
          const handler = LATE_EVENT_REGISTRY[le.id];
          if (handler) handler(r);
          r.eventType = le.id;
        },
      });
    }

    // Time rift — C820: excluded from pool after fight 300 (dead weight in late-game)
    if (ctx.fightsSinceVillage > 50 && ctx.totalFights < 300) {
      candidates.push({
        id: 'time_rift', weight: TIME_RIFT_CHANCE, pityEligible: true,
        apply: (r) => { r.newFightsSinceVillage = 0; r.eventType = 'event_time_rift'; },
      });
    }

    // --- Weighted selection ---
    const pool = pityActive ? candidates.filter(c => c.pityEligible) : candidates;
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);

    if (totalWeight > 0 && (pityActive || ctx.rngChance(Math.min(1, totalWeight)))) {
      // Pick one event via weighted random
      let roll = ctx.rngInt(10000) / 10000 * totalWeight;
      let selected: typeof candidates[number] | null = null;
      for (const c of pool) {
        roll -= c.weight;
        if (roll <= 0) { selected = c; break; }
      }
      if (!selected) selected = pool[pool.length - 1];
      selected.apply(result);
      eventTriggered = true;
    }
  }

  // Event chain + C793: Event Momentum tiers
  if (eventTriggered) {
    result.newEventChainCount = ctx.eventChainCount + 1;
    if (result.newEventChainCount >= EVENT_MOMENTUM_TIER3_THRESHOLD) {
      result.heroExpDelta += EVENT_CHAIN_REWARD_EXP * 3;
      result.heroGoldDelta += EVENT_CHAIN_REWARD_GOLD * 3;
      result.eventChainReward = true;
      result.eventMomentumTier = 3;
      result.newEventChainCount = 0;
    } else if (result.newEventChainCount >= EVENT_MOMENTUM_TIER2_THRESHOLD) {
      result.heroExpDelta += EVENT_CHAIN_REWARD_EXP * 2;
      result.heroGoldDelta += EVENT_CHAIN_REWARD_GOLD * 2;
      result.eventChainReward = true;
      result.eventMomentumTier = 2;
    } else if (result.newEventChainCount >= EVENT_CHAIN_THRESHOLD) {
      result.heroExpDelta += EVENT_CHAIN_REWARD_EXP;
      result.heroGoldDelta += EVENT_CHAIN_REWARD_GOLD;
      result.eventChainReward = true;
    }
  } else {
    result.newEventChainCount = 0;
  }

  return result;
}
