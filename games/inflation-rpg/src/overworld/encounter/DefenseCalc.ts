import {
  MERCY_DAMAGE_REDUCTION,
  VILLAGE_SHOP_SHIELD_MUL,
  GOLD_ARMOR_THRESHOLD,
  GOLD_ARMOR_REDUCTION,
  NIGHT_ENEMY_DMG_MUL,
  ARMOR_REDUCTION,
  VILLAGE_VIGOR_HP_BONUS,
  GOLD_SHIELD_REDUCTION,
  COMBO_SHIELD_THRESHOLD,
  COMBO_SHIELD_REDUCTION,
  GOLD_OVERFLOW_SHIELD_REDUCTION,
  PRESTIGE_DANGER_MASTERY_RATE,
  GOLD_THRESHOLD_DEF_MUL,
  GOLD_THRESHOLD_DEF_BONUS,
  CURSED_ALTAR_DAMAGE_MUL,
  COLOSSEUM_ENEMY_ATK_MUL,
  FOG_AMBUSH_ENEMY_ATK_MUL,
  SNOW_DRIFT_DMG_MUL,
  TITAN_ARENA_ENEMY_ATK_MUL,
} from './constants';

export interface DefenseContext {
  mercyRemaining: number;
  shopShieldRemaining: number;
  armorRemaining: number;
  villageRestRemaining: number;
  goldShieldActive: boolean;
  comboStreak: number;
  goldOverflowShieldActive: boolean;
  bossShieldActive: boolean;
  prestigeCount: number;
  isDangerZone: boolean;
  heroGold: number;
  heroLevel: number;
  cursedAltarAtkBuff: boolean;
  isNight: boolean;
  colosseumActive: boolean;
  fogAmbushActive: boolean;
  windGaleActive: boolean; // C782: no defense effect (dodge is in engine)
  snowDriftActive: boolean; // C782: reduces enemy ATK
  titanArenaActive: boolean; // C797: enemy ATK×1.3
}

/**
 * Pure function: compute the total damage reduction multiplier.
 * Returns a value typically 0.30–2.0+ (floored at 0.30).
 * Side effects (shield decrement) are NOT handled here — engine does that.
 */
export function computeDamageReduction(ctx: DefenseContext): number {
  const mercyMul = ctx.mercyRemaining > 0 ? (1 - MERCY_DAMAGE_REDUCTION) : 1;
  const shieldMul = ctx.shopShieldRemaining > 0 ? (1 - VILLAGE_SHOP_SHIELD_MUL) : 1;
  const goldArmorMul = ctx.heroGold >= GOLD_ARMOR_THRESHOLD ? (1 - GOLD_ARMOR_REDUCTION) : 1;
  const nightDmgMul = ctx.isNight ? NIGHT_ENEMY_DMG_MUL : 1;
  const armorMul = ctx.armorRemaining > 0 ? (1 - ARMOR_REDUCTION) : 1;
  const vigorMul = ctx.villageRestRemaining > 0 ? (1 - VILLAGE_VIGOR_HP_BONUS) : 1;
  const goldShieldMul = ctx.goldShieldActive ? (1 - GOLD_SHIELD_REDUCTION) : 1;
  const comboShieldMul = ctx.comboStreak >= COMBO_SHIELD_THRESHOLD ? (1 - COMBO_SHIELD_REDUCTION) : 1;
  const goldOverflowMul = ctx.goldOverflowShieldActive ? (1 - GOLD_OVERFLOW_SHIELD_REDUCTION) : 1;
  const bossShieldMul = ctx.bossShieldActive ? 0.7 : 1;
  const prestigeDangerMasteryMul = (ctx.isDangerZone && ctx.prestigeCount > 0)
    ? (1 - Math.min(0.3, ctx.prestigeCount * PRESTIGE_DANGER_MASTERY_RATE))
    : 1;
  const goldThresholdDefMul = ctx.heroGold > ctx.heroLevel * GOLD_THRESHOLD_DEF_MUL
    ? (1 - GOLD_THRESHOLD_DEF_BONUS)
    : 1;
  const cursedAltarDmgMul = ctx.cursedAltarAtkBuff ? CURSED_ALTAR_DAMAGE_MUL : 1;
  const colosseumDmgMul = ctx.colosseumActive ? COLOSSEUM_ENEMY_ATK_MUL : 1;
  const fogAmbushDmgMul = ctx.fogAmbushActive ? FOG_AMBUSH_ENEMY_ATK_MUL : 1;
  const snowDriftDmgMul = ctx.snowDriftActive ? SNOW_DRIFT_DMG_MUL : 1; // C785: separated SPD≠DMG
  const titanArenaDmgMul = ctx.titanArenaActive ? TITAN_ARENA_ENEMY_ATK_MUL : 1; // C797

  const drDefenseMuls = mercyMul * shieldMul * armorMul * goldArmorMul * vigorMul;
  const drShieldMuls = goldShieldMul * comboShieldMul * goldOverflowMul * bossShieldMul;
  const drContextMuls = nightDmgMul * prestigeDangerMasteryMul * goldThresholdDefMul * cursedAltarDmgMul * colosseumDmgMul * fogAmbushDmgMul * snowDriftDmgMul * titanArenaDmgMul;

  return Math.max(0.30, drDefenseMuls * drShieldMuls * drContextMuls);
}
