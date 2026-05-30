import type { HeroEntity } from '../../hero/HeroEntity';
import type { OverworldEvent } from '../OverworldEvents';
import {
  VILLAGE_REST_HP_THRESHOLD,
  VILLAGE_REST_HP_BOOST,
  VILLAGE_SHOP_COST,
  VILLAGE_SHOP_SHIELD_DURATION,
  ARMOR_BUY_COST,
  ARMOR_DURATION,
  GOLD_FORGE_COST,
  GOLD_FORGE_THRESHOLD,
  GOLD_FORGE_ATK_FLAT,
  FORGE_COST_PRESTIGE_DISCOUNT,
  FORGE_COST_MIN,
  VILLAGE_GOLD_INTEREST_RATE,
  GOLD_INTEREST_PRESTIGE_BONUS,
  INTEREST_VILLAGE_INTERVAL,
  INTEREST_VILLAGE_BONUS,
  GOLD_INTEREST_CAP_PER_PRESTIGE,
  GOLD_COMPOUND_THRESHOLD,
  VILLAGE_GOLD_FOUNTAIN,
  VILLAGE_GOLD_PRESTIGE_SCALE,
  FOUNTAIN_ENHANCED_HEAL,
  PRESTIGE_HEAL_BONUS,
  REST_EXP_PER_LEVEL,
  DANGER_INTEREST_BONUS,
  GOLD_INVEST_LOCK_FIGHTS,
  GOLD_INVEST_MIN,
  VILLAGE_HEAL_BASE,
  VILLAGE_HEAL_PER_VISIT,
  VILLAGE_HEAL_CAP,
  VILLAGE_PRESTIGE_HEAL_BONUS,
  VILLAGE_REST_ATK_DURATION,
  VILLAGE_EXP_PER_VISIT,
  EXP_FOUNTAIN_PER_100_FIGHTS,
  PRESTIGE_MOMENTUM_BONUS,
  VILLAGE_TRAINING_EXP_PER_PRESTIGE,
  VILLAGE_EXP_PRESTIGE_SCALE,
  VILLAGE_ATK_TRAINING_DURATION,
  PRESTIGE_GOLD_BURST_PER_PRESTIGE,
  BANK_DEPOSIT_RATE,
  ARENA_COST,
  VILLAGE_ATK_FLAT,
  VILLAGE_VIGOR_DURATION,
  VILLAGE_TRAINING_DURATION,
  TRAINING_EXTENDED_DURATION,
  VILLAGE_BLESSING_STREAK,
  VILLAGE_BLESSING_DURATION,
  GOLD_SHIELD_DURATION,
  FORGE_VISIT_DISCOUNT,
} from './constants';

export interface VillageContext {
  prestigeCount: number;
  villageVisits: number;
  dangerStreak: number;
  bankGold: number;
  fightsSinceLastDeath: number;
  investFightsRemaining: number;
  goldInvested: number;
  totalWins: number;
  totalDeaths: number;
}

export interface VillageResult {
  // State mutations to apply back to engine
  battleMomentum: number;
  fightsSinceVillage: number;
  villageRestRemaining: number;
  deathInsuranceUsed: boolean;
  villageShieldActive: boolean;
  villageTrainingRemaining: number;
  villageBlessingRemaining: number;
  fightsSinceSpend: number;
  fightChainCount: number;
  shopShieldRemaining: number;
  armorRemaining: number;
  goldShieldRemaining: number;
  investFightsRemaining: number;
  goldInvested: number;
  villageVisits: number;
  forgeDiscount: number;
  villageRestAtkRemaining: number;
  villageAtkTrainingRemaining: number;
  dangerFights: number;
  eliteAfterVillage: boolean;
  bankGold: number;
  arenaActive: boolean;
  waveMomentumBonus: number;
}

export class VillageResolver {
  resolve(hero: HeroEntity, events: OverworldEvent[], ctx: VillageContext): VillageResult {
    const result: VillageResult = {
      battleMomentum: 0,
      fightsSinceVillage: 0,
      villageRestRemaining: VILLAGE_VIGOR_DURATION,
      deathInsuranceUsed: false,
      villageShieldActive: true,
      villageTrainingRemaining: VILLAGE_TRAINING_DURATION + TRAINING_EXTENDED_DURATION,
      villageBlessingRemaining: 0,
      fightsSinceSpend: 0,
      fightChainCount: 0,
      shopShieldRemaining: 0,
      armorRemaining: 0,
      goldShieldRemaining: GOLD_SHIELD_DURATION,
      investFightsRemaining: ctx.investFightsRemaining,
      goldInvested: ctx.goldInvested,
      villageVisits: ctx.villageVisits + 1,
      forgeDiscount: Math.min(0.5, (ctx.villageVisits + 1) * FORGE_VISIT_DISCOUNT),
      villageRestAtkRemaining: 0,
      villageAtkTrainingRemaining: VILLAGE_ATK_TRAINING_DURATION,
      dangerFights: 0, // will be set below
      eliteAfterVillage: true,
      bankGold: 0,
      arenaActive: false,
      waveMomentumBonus: 0,
    };

    hero.atk += VILLAGE_ATK_FLAT;

    if (ctx.fightsSinceLastDeath >= VILLAGE_BLESSING_STREAK) {
      result.villageBlessingRemaining = VILLAGE_BLESSING_DURATION;
    }

    // Low HP rest bonus
    if (hero.hp < hero.hpMax * VILLAGE_REST_HP_THRESHOLD) {
      const hpBoost = Math.max(1, Math.floor(hero.hpMax * VILLAGE_REST_HP_BOOST));
      hero.hpMax += hpBoost;
      events.push({ type: 'village_rest_bonus', hpBoost } as any);
    }

    // Shop purchases
    if (hero.gold >= VILLAGE_SHOP_COST) {
      hero.gold -= VILLAGE_SHOP_COST;
      result.shopShieldRemaining = VILLAGE_SHOP_SHIELD_DURATION;
      events.push({ type: 'village_shop_purchase', cost: VILLAGE_SHOP_COST, effect: 'hp_shield' } as any);
    }
    if (hero.gold >= ARMOR_BUY_COST) {
      hero.gold -= ARMOR_BUY_COST;
      result.armorRemaining = ARMOR_DURATION;
      events.push({ type: 'village_shop_purchase', cost: ARMOR_BUY_COST, effect: 'armor' } as any);
    }
    const forgeCost = Math.max(FORGE_COST_MIN, GOLD_FORGE_COST - ctx.prestigeCount * FORGE_COST_PRESTIGE_DISCOUNT);
    if (hero.gold >= GOLD_FORGE_THRESHOLD) {
      hero.gold -= forgeCost;
      hero.atk += GOLD_FORGE_ATK_FLAT;
      events.push({ type: 'village_shop_purchase', cost: forgeCost, effect: 'atk_forge' } as any);
    }

    // Gold interest
    const interestRate = VILLAGE_GOLD_INTEREST_RATE + ctx.prestigeCount * GOLD_INTEREST_PRESTIGE_BONUS + Math.floor(ctx.villageVisits / INTEREST_VILLAGE_INTERVAL) * INTEREST_VILLAGE_BONUS;
    const interestCap = 50 + ctx.prestigeCount * GOLD_INTEREST_CAP_PER_PRESTIGE;
    let interest = Math.min(interestCap, Math.floor(hero.gold * interestRate));
    if (hero.gold > GOLD_COMPOUND_THRESHOLD) interest *= 2;
    if (interest > 0) hero.gold += interest;

    // Gold fountains
    hero.gold += VILLAGE_GOLD_FOUNTAIN;
    hero.gold += Math.floor(VILLAGE_GOLD_FOUNTAIN * ctx.prestigeCount * VILLAGE_GOLD_PRESTIGE_SCALE);

    // Healing
    hero.heal(Math.max(1, Math.floor(hero.hpMax * FOUNTAIN_ENHANCED_HEAL)));
    if (ctx.prestigeCount > 0) {
      hero.heal(Math.max(1, Math.floor(hero.hpMax * ctx.prestigeCount * PRESTIGE_HEAL_BONUS)));
    }

    // Rest exp + danger interest
    hero.exp += hero.level * REST_EXP_PER_LEVEL;
    hero.gold += Math.floor(ctx.dangerStreak * DANGER_INTEREST_BONUS * hero.gold);

    // Gold investment
    if (ctx.investFightsRemaining <= 0 && hero.gold >= GOLD_INVEST_MIN) {
      const investAmount = Math.floor(hero.gold * 0.5);
      hero.gold -= investAmount;
      result.goldInvested = investAmount;
      result.investFightsRemaining = GOLD_INVEST_LOCK_FIGHTS;
    }

    // Heal scaling
    const prestigeHealBonus = ctx.prestigeCount * VILLAGE_PRESTIGE_HEAL_BONUS;
    const healRate = Math.min(VILLAGE_HEAL_CAP + prestigeHealBonus, VILLAGE_HEAL_BASE + ctx.villageVisits * VILLAGE_HEAL_PER_VISIT + prestigeHealBonus);
    const healAmount = Math.floor(hero.hpMax * healRate);
    hero.heal(healAmount);
    if (hero.hp >= hero.hpMax) result.villageRestAtkRemaining = VILLAGE_REST_ATK_DURATION;

    // Exp gains
    hero.gainExp(result.villageVisits * VILLAGE_EXP_PER_VISIT);
    hero.gainExp(Math.floor((ctx.totalWins + ctx.totalDeaths) / 100) * EXP_FOUNTAIN_PER_100_FIGHTS);
    if (ctx.prestigeCount > 0) {
      result.waveMomentumBonus = Math.floor(ctx.prestigeCount * PRESTIGE_MOMENTUM_BONUS * 10);
    }
    hero.gainExp(ctx.prestigeCount * VILLAGE_TRAINING_EXP_PER_PRESTIGE);
    hero.gainExp(Math.floor(hero.level * ctx.prestigeCount * VILLAGE_EXP_PRESTIGE_SCALE));

    // Buffs and resets
    hero.gold += ctx.prestigeCount * PRESTIGE_GOLD_BURST_PER_PRESTIGE;
    result.dangerFights = 0; // reset externally: Math.max(0, dangerFights - 5)

    // Bank
    let bankGold = ctx.bankGold;
    if (bankGold > 0) {
      hero.gold += bankGold;
      bankGold = 0;
    }
    const bankDeposit = Math.floor(hero.gold * BANK_DEPOSIT_RATE);
    if (bankDeposit > 0) {
      hero.gold -= bankDeposit;
      bankGold += bankDeposit;
    }
    result.bankGold = bankGold;

    // Arena
    if (hero.gold >= ARENA_COST) {
      hero.gold -= ARENA_COST;
      result.arenaActive = true;
    }

    return result;
  }
}
