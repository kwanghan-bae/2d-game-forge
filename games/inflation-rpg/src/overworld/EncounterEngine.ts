import type { SeededRng } from '../cycle/SeededRng';
import type { HeroEntity } from '../hero/HeroEntity';
import { LANDMARK_TYPES, type LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';
import { ENEMY_DROPS, BOSS_DROPS } from './dropTable';
import {
  enemyHpAtLevel,
  enemyAtkAtLevel,
  expGainForKill,
} from '../cycle/inflationCurve';
import { SkillLearningSystem, isSkillMilestoneLevel } from '../hero/SkillLearningSystem';
import { findEncounterForKind, selectBranch } from '../data/personalityEncounters';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 3;  // was 2, tuned C110 — boss danger onset earlier
const ENEMY_EXP_BASE = 12;
const BOSS_EXP_BASE = 60;
const DROP_RATE = 0.36;           // V3-H F2: +20% (was 0.3)
// C119: danger zone — stronger enemy variant with bonus exp
export const DANGER_ZONE_RATE = 0.15;
export const DANGER_ZONE_STAT_MUL = 1.5;
export const DANGER_ZONE_EXP_MUL = 3;
// C120: combo streak — consecutive no-damage kills grant bonus exp
export const COMBO_STREAK_THRESHOLD = 3; // streak >= 3 to start bonus
export const COMBO_STREAK_EXP_BONUS = 0.1; // +10% per streak beyond threshold
// C121: milestone levels that trigger fanfare event
export const MILESTONE_LEVELS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
// C122: critical hit — unlocked by high combo streak
export const CRIT_STREAK_THRESHOLD = 5; // combo >= 5 to unlock crit chance
export const CRIT_CHANCE = 0.20; // 20% per attack to crit
export const CRIT_DAMAGE_MUL = 2; // x2 damage on crit
// C123: overkill — one-hit kills get bonus drop rate
export const OVERKILL_DROP_BONUS = 0.15; // +15% drop chance on one-hit kills
// C124: close call — survive barely, get adrenaline heal
export const CLOSE_CALL_THRESHOLD = 0.10; // < 10% HP remaining
export const CLOSE_CALL_HEAL = 0.05; // heal 5% of max HP
// C125: battle momentum — consecutive fights without village boost ATK
export const MOMENTUM_ATK_BONUS = 0.02; // +2% ATK per stack
export const MOMENTUM_CAP = 20; // max 20 stacks = +40% ATK
// C126: drop streak — consecutive drops upgrade the next one
export const DROP_STREAK_THRESHOLD = 3; // 3 drops in a row → next is upgraded
// C132: boss rage — boss ATK escalates per combat turn
export const BOSS_RAGE_ATK_PER_TURN = 0.10; // +10% base ATK per turn
// C133: elite enemy — rare spawn, x2 HP, guaranteed drop
export const ELITE_SPAWN_RATE = 0.05; // 5% chance on enemy encounters
export const ELITE_HP_MUL = 2.0;
export const ELITE_EXP_MUL = 2.5;
// C134: village rest bonus — arrive with low HP → permanent max HP boost
export const VILLAGE_REST_HP_THRESHOLD = 0.30; // < 30% HP to trigger
export const VILLAGE_REST_HP_BOOST = 0.01; // +1% max HP permanently
// C136: shrine meditation buff — temp ATK boost lasting N fights
export const SHRINE_MEDITATION_ATK_BUFF = 0.25; // +25% ATK
export const SHRINE_MEDITATION_BUFF_DURATION = 5; // lasts 5 fights
// C137: death streak mercy — reduce damage after consecutive deaths
export const DEATH_STREAK_THRESHOLD = 3; // 3 deaths in a row triggers mercy
export const MERCY_DAMAGE_REDUCTION = 0.30; // -30% incoming damage
export const MERCY_DURATION = 3; // lasts 3 fights
// C138: exp diminishing returns at high levels
export const EXP_DIMINISH_THRESHOLD = 1000; // level 1000+ starts reduction
export const EXP_DIMINISH_FACTOR = 0.0005; // -0.05% per level above threshold
// C139: first blood — first fight of a cycle gets bonus
export const FIRST_BLOOD_EXP_MUL = 2.0; // ×2 exp on first fight
export const FIRST_BLOOD_DROP_GUARANTEE = true;
// C140: revenge bonus — ATK boost against enemy type that killed you
export const REVENGE_ATK_BONUS = 0.50; // +50% ATK on revenge
// C141: survival streak — long survival grants bonus exp
export const SURVIVAL_STREAK_THRESHOLD = 10; // fights survived to start bonus
export const SURVIVAL_STREAK_EXP_BONUS = 0.05; // +5% per fight above threshold
// C142: lucky dodge — chance to survive fatal hit with 1 HP
export const LUCKY_DODGE_CHANCE = 0.10; // 10% on fatal blow
// C144: gold from battles
export const GOLD_PER_KILL_BASE = 5; // base gold per kill
export const GOLD_BOSS_MUL = 5; // bosses give 5× gold
export const GOLD_ELITE_MUL = 3; // elites give 3× gold
// C146: wave mechanic — every N fights, bonus challenge
export const WAVE_INTERVAL = 20; // every 20 wins triggers wave
export const WAVE_SIZE = 3; // 3 consecutive enemies
export const WAVE_BONUS_EXP_MUL = 2.0; // ×2 exp for wave fights
export const WAVE_BONUS_GOLD_MUL = 3.0; // ×3 gold for wave fights
// C147: gold penalty on death
export const GOLD_DEATH_PENALTY = 0.10; // lose 10% gold on death
// C148: kill counter milestones — every N kills = permanent ATK bonus
export const KILL_MILESTONE_INTERVAL = 50;
export const KILL_MILESTONE_ATK_BONUS = 0.01; // +1% ATK per milestone
// C149: gold momentum bonus — high momentum gives extra gold
export const GOLD_MOMENTUM_THRESHOLD = 5;
export const GOLD_MOMENTUM_BONUS = 0.50; // +50% gold when momentum >= threshold
// C151: area familiarity — revisiting areas gives exp bonus
export const AREA_FAMILIARITY_EXP_BONUS = 0.05; // +5% per visit
export const AREA_FAMILIARITY_CAP = 5; // max 5 stacks = +25%
// C152: treasure goblin — rare rich enemy
export const TREASURE_GOBLIN_RATE = 0.03; // 3% chance
export const TREASURE_GOBLIN_GOLD_MUL = 10; // ×10 gold
export const TREASURE_GOBLIN_HP_MUL = 0.3; // 30% HP (easy to kill)
export const TREASURE_GOBLIN_FLEE_RATE = 0.4; // 40% chance to flee after 2 turns
// C153: combo gold bonus — gold scales with combo streak
export const COMBO_GOLD_THRESHOLD = 3;
export const COMBO_GOLD_BONUS_PER = 0.20; // +20% per combo level above threshold
// C154: village shop — spend gold for temp HP shield
export const VILLAGE_SHOP_COST = 50;
export const VILLAGE_SHOP_SHIELD_MUL = 0.20; // +20% max HP
export const VILLAGE_SHOP_SHIELD_DURATION = 3; // lasts 3 fights
// C155: overkill gold bonus
export const OVERKILL_GOLD_BONUS = 1.0; // +100% gold on one-shot kills
// C156: HP regen on win
export const WIN_HP_REGEN_RATE = 0.02; // recover 2% max HP per win
// C157: boss gold vault — bonus lump gold on boss defeat
export const BOSS_VAULT_GOLD_PER_LEVEL = 100;
// C158: near-death power surge — low HP = ATK boost
export const NEAR_DEATH_HP_THRESHOLD = 0.10; // below 10% HP
export const NEAR_DEATH_ATK_MUL = 1.5; // ×1.5 ATK when near death
// C159: double-or-nothing — chance to keep gold on death
export const GOLD_SAVE_CHANCE = 0.25; // 25% chance to not lose gold
// C160: combo exp escalation — high combo gives escalating exp
export const COMBO_EXP_THRESHOLD = 10;
export const COMBO_EXP_BONUS_PER = 0.10; // +10% per combo above threshold
// C161: critical hit gold bonus
export const CRIT_GOLD_BONUS = 0.30; // +30% gold when fight had critical hit
// C162: danger zone gold bonus
export const DANGER_ZONE_GOLD_MUL = 2.0; // ×2 gold in danger zones
// C164: gold level scaling power
export const GOLD_LEVEL_POWER = 1.2; // gold scales as level^1.2 instead of linear
// C165: boss enrage at 50% HP
export const BOSS_ENRAGE_HP_THRESHOLD = 0.5; // below 50% HP
export const BOSS_ENRAGE_ATK_MUL = 2.0; // ×2 ATK when enraged
// C166: exp overflow gold bonus
export const EXP_OVERFLOW_GOLD_RATIO = 100; // 1 gold per 100 overflow exp
// C167: close call exp bonus — survive at low HP for bonus exp
export const CLOSE_CALL_HP_THRESHOLD = 0.20; // below 20% HP after fight
export const CLOSE_CALL_EXP_BONUS = 0.50; // +50% exp
export const SHRINE_SKILL_GRANT_RATE = 0.20; // cycle 1 F1: was 0.48 (V3-H F2) — skill saturation 해소
const SHRINE_HEAL_FRACTION = 0.4;
// Cycle 28 (cycle 3 D5 carry-over) — spare_enemy moral saturation 70.4% 완화: 0.10 → 0.07.
// cycle 1 F1 에서 0.15 → 0.10 으로 한 차례 줄였고, 이번이 두 번째 감소.
// Cycle 321 — lever 5: PROC_RATE 0.07 → 0.04 (saint dominance root cause 추가 lever).
// cycle 316 F14 finding 의 branch 자체 재설계 deferred, magnitude lever 5번째 시도.
export const MERCIFUL_PROC_RATE = 0.04;
// Cycle 297 — saint dominance root cause lever (cycle 296 finding의 진짜 axis).
// drift 3 → 2: merciful 누적 속도 ↓ → saint 자격 통과 도달까지 더 많은 arrival.
// effect 측정 = cycle 316 sim baseline 강제 시점.
const MERCIFUL_DRIFT = 2;

export interface EncounterEngineOpts {
  /** Additive bonus to drop chance from V3-C drop_chance buff. */
  dropChanceBonus?: number;
  /** V3-D — field level damping multiplier (1.0 = no damping, <1.0 = weaker hero). */
  damping?: number;
  /** Cycle 108 F1: returns true when fate roll is still available in this
   *  cycle. Controller wires `() => !this.fateRollConsumed`. When true *and*
   *  hero would die in combat, engine emits `fate_roll_required` instead of
   *  `hero_died`. applyDeathPenalty is *not* invoked — controller defers it
   *  to resolveFateRoll('decline'). */
  isFateRollEligible?: () => boolean;
  /** Cycle 109 F1: returns true when boss intro is still available for this
   *  landmark in this cycle. Controller wires `(landmarkId) =>
   *  !bossIntroSeenIds.has(landmarkId) && activeBossIntroBuffs.length < 4`.
   *  When true *and* kind === 'boss', engine emits `boss_intro_offered`
   *  *before* battle_started and aborts the encounter. Controller's
   *  resolveBossIntro re-enters resolveEncounter (with the same landmarkId
   *  now in seenIds so the inner call skips this path). */
  isBossIntroEligible?: (landmarkId: string) => boolean;
  /** Cycle 109 F1: emitted alongside `boss_intro_offered`. Returns the 3
   *  deterministic cards for this landmarkId. Controller wires this so the
   *  catalog + seed mixing logic lives in one place. */
  pickBossIntroCards?: (landmarkId: string) => ReadonlyArray<{
    id: import('../buff/bossIntroCatalog').BossIntroBuffId;
    nameKR: string;
    descKR: string;
    tier: import('../buff/bossIntroCatalog').BossIntroBuffTier;
  }>;
  /** Cycle 109 F1: when activeBossIntroBuffs.length >= 4, controller wires
   *  this to true so engine emits `boss_intro_skipped` (still aborts intro
   *  but lets controller record a saga marker). Default = no skip emission. */
  isBossIntroCapped?: (landmarkId: string) => boolean;
  /** Cycle 109 F1: returns the cumulative atk_mul (1.0 + sum of accepted
   *  atk-tier buffs). Applied multiplicatively to heroAtk inside the combat
   *  loop. PRD §F1.동작(5) "단순화" — bypasses recomputeStats. */
  getBossIntroAtkMul?: () => number;
  /** Cycle 109 F1: returns the cumulative hp_mul. Currently only applied
   *  implicitly via heroHpMax buff effects — engine itself does not consume
   *  this. Reserved for future expansion. */
  getBossIntroDropBonus?: () => number;
  /** Cycle 110 F1: returns the cumulative atk_mul from realm fork buffs
   *  (1.0 + sum of risk-card atkBonus values). Applied multiplicatively to
   *  heroAtk inside the combat loop for *both* enemy and boss (vs boss intro
   *  which is boss-only). PRD §F1.동작(5) — separate channel from boss intro,
   *  engine multiplies both. */
  getRealmForkAtkMul?: () => number;
}

export class EncounterEngine {
  private comboStreak = 0;
  private battleMomentum = 0;
  private dropStreak = 0;
  private shrineBuffRemaining = 0; // C136: fights remaining with shrine ATK buff
  private deathStreak = 0; // C137: consecutive deaths
  private mercyRemaining = 0; // C137: fights remaining with damage reduction
  private firstBloodUsed = false; // C139: has first fight bonus been consumed
  private lastDeathEnemyId: string | null = null; // C140: revenge tracking
  private survivalStreak = 0; // C141: consecutive fights without death
  private totalWins = 0; // C146: total wins for wave trigger
  private waveRemaining = 0; // C146: fights left in current wave
  private killCount = 0; // C148: total kills for milestone tracking
  private killMilestones = 0; // C148: number of milestones reached
  private areaVisits: Map<string, number> = new Map(); // C151: area familiarity
  private shopShieldRemaining = 0; // C154: village shop HP shield duration

  constructor(private readonly rng: SeededRng, private opts: EncounterEngineOpts = {}) {}

  setOpts(opts: EncounterEngineOpts): void {
    this.opts = { ...this.opts, ...opts };
  }

  getComboStreak(): number { return this.comboStreak; }
  resetComboStreak(): void { this.comboStreak = 0; }
  getBattleMomentum(): number { return this.battleMomentum; }
  getDropStreak(): number { return this.dropStreak; }
  getShrineBuffRemaining(): number { return this.shrineBuffRemaining; }
  getMercyRemaining(): number { return this.mercyRemaining; }

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      // C119: danger zone — 15% chance on regular enemies. ×1.5 stats, ×3 exp.
      const isDangerZone = !isBoss && this.rng.chance(DANGER_ZONE_RATE);
      // C133: elite enemy — 5% chance on non-boss, non-danger encounters. ×2 HP, guaranteed drop, ×2.5 exp.
      const isElite = !isBoss && !isDangerZone && this.rng.chance(ELITE_SPAWN_RATE);
      // C152: treasure goblin — 3% on non-boss, non-danger, non-elite. Low HP, high gold.
      const isTreasureGoblin = !isBoss && !isDangerZone && !isElite && this.rng.chance(TREASURE_GOBLIN_RATE);
      const hpMul = isDangerZone ? DANGER_ZONE_STAT_MUL : isElite ? ELITE_HP_MUL : isTreasureGoblin ? TREASURE_GOBLIN_HP_MUL : 1;
      const atkMul = isDangerZone ? DANGER_ZONE_STAT_MUL : 1; // elite has normal ATK
      const enemyHp = enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : hpMul);
      const enemyAtk = enemyAtkAtLevel(ENEMY_BASE_ATK, hero.level, isBoss ? BOSS_ATK_MUL : atkMul);

      if (hero.staggered) return events;

      // Cycle 109 F1: boss intro intercept (before battle_started).
      // PRD §F1.동작(8) opt-(a): controller emits boss_intro_offered, modal
      // mounts, player picks idx, resolveBossIntro re-calls resolveEncounter
      // with bossIntroSeenIds.has(landmarkId) → isBossIntroEligible=false on
      // the inner call (no recursion). If capped (>=4 active buffs), still
      // abort intro but emit boss_intro_skipped marker.
      if (isBoss && this.opts.isBossIntroEligible?.(landmarkId)) {
        if (this.opts.isBossIntroCapped?.(landmarkId)) {
          events.push({ type: 'boss_intro_skipped', landmarkId, reason: 'cap_reached' });
          // fall through to regular battle path — skip is *only* the intro,
          // the boss combat itself proceeds.
        } else {
          const cards = this.opts.pickBossIntroCards?.(landmarkId);
          if (cards && cards.length === 3) {
            events.push({ type: 'boss_intro_offered', landmarkId, cards });
            return events; // pause — controller resolves via resolveBossIntro
          }
        }
      }

      if (isDangerZone) {
        events.push({ type: 'danger_zone_entered', enemyId: landmarkId });
      }
      if (isElite) {
        events.push({ type: 'elite_spawned', enemyId: landmarkId });
      }
      if (isTreasureGoblin) {
        events.push({ type: 'treasure_goblin', enemyId: landmarkId });
      }
      events.push({ type: 'battle_started', enemyId: landmarkId });

      const damping = this.opts.damping ?? 1.0;
      const bossAtkMul = isBoss ? (this.opts.getBossIntroAtkMul?.() ?? 1.0) : 1.0;
      // Cycle 110 F1: realm fork atk mul applies to both enemy + boss combat
      // (vs boss intro which is boss-only). Separate channel, multiply both.
      const realmAtkMul = this.opts.getRealmForkAtkMul?.() ?? 1.0;
      // C125: momentum ATK bonus = +2% per momentum stack (capped at 20 = +40%)
      const momentumMul = 1 + this.battleMomentum * MOMENTUM_ATK_BONUS;
      // C136: shrine meditation buff — +25% ATK for duration
      const shrineMul = this.shrineBuffRemaining > 0 ? 1 + SHRINE_MEDITATION_ATK_BUFF : 1;
      // C140: revenge bonus — +50% ATK against enemy that last killed you
      const revengeMul = this.lastDeathEnemyId === landmarkId ? 1 + REVENGE_ATK_BONUS : 1;
      // C148: kill milestone ATK bonus
      const milestoneMul = 1 + this.killMilestones * KILL_MILESTONE_ATK_BONUS;
      // C158: near-death power surge
      const nearDeathMul = hero.hp < hero.hpMax * NEAR_DEATH_HP_THRESHOLD ? NEAR_DEATH_ATK_MUL : 1;
      const baseHeroAtk = Math.max(1, Math.floor(hero.atk * damping * bossAtkMul * realmAtkMul * momentumMul * shrineMul * revengeMul * milestoneMul * nearDeathMul));
      // C122: critical hit — when combo streak >= 5, 20% chance per attack for x2 damage
      const canCrit = this.comboStreak >= CRIT_STREAK_THRESHOLD;
      const hpBefore = hero.hp;
      let eHp = enemyHp;
      let didCrit = false;
      let hitCount = 0;
      let rageTurn = 0;
      let luckyDodge = false;
      while (eHp > 0 && !hero.staggered) {
        const isCrit = canCrit && this.rng.chance(CRIT_CHANCE);
        const heroAtk = isCrit ? baseHeroAtk * CRIT_DAMAGE_MUL : baseHeroAtk;
        if (isCrit) didCrit = true;
        hitCount++;
        eHp -= heroAtk;
        if (eHp > 0) {
          // C132: boss rage — boss ATK escalates each turn the fight lasts
          // C165: boss enrage — ×2 ATK when below 50% HP
          const enrageMul = isBoss && eHp < enemyHp * BOSS_ENRAGE_HP_THRESHOLD ? BOSS_ENRAGE_ATK_MUL : 1;
          const rageAtk = isBoss
            ? Math.floor(enemyAtk * (1 + rageTurn * BOSS_RAGE_ATK_PER_TURN) * enrageMul)
            : enemyAtk;
          // C137: mercy damage reduction after death streak
          const mercyReduction = this.mercyRemaining > 0 ? (1 - MERCY_DAMAGE_REDUCTION) : 1;
          // C154: shop shield damage reduction
          const shieldReduction = this.shopShieldRemaining > 0 ? (1 - VILLAGE_SHOP_SHIELD_MUL) : 1;
          hero.takeDamage(Math.max(1, Math.floor(rageAtk * mercyReduction * shieldReduction)));
          // C142: lucky dodge — survive fatal hit with 10% chance
          if (hero.staggered && this.rng.chance(LUCKY_DODGE_CHANCE)) {
            hero.staggered = false;
            hero.hp = 1;
            luckyDodge = true;
          }
          rageTurn++;
        }
      }
      const tookDamage = hero.hp < hpBefore;
      const isOverkill = hitCount === 1 && !hero.staggered;
      if (hero.staggered) {
        // C120: combo streak resets on death
        this.comboStreak = 0;
        // C141: survival streak resets on death
        this.survivalStreak = 0;
        // C147: gold loss on death — lose 10% (C159: 25% chance to save)
        if (!this.rng.chance(GOLD_SAVE_CHANCE)) {
          const goldLost = Math.floor(hero.gold * GOLD_DEATH_PENALTY);
          hero.gold -= goldLost;
        } else {
          events.push({ type: 'gold_saved' });
        }
        // C137: death streak tracking
        this.deathStreak++;
        if (this.deathStreak >= DEATH_STREAK_THRESHOLD) {
          this.mercyRemaining = MERCY_DURATION;
          this.deathStreak = 0; // reset after granting mercy
          events.push({ type: 'mercy_activated', duration: MERCY_DURATION });
        }
        // Cycle 108 F1: intercept (a) — before applyDeathPenalty, check fate
        // roll eligibility. If eligible, emit fate_roll_required and *abort*
        // (level penalty + hero_died emit are deferred to controller's
        // resolveFateRoll('decline'). hero.hp == 0 + staggered=true still hold
        // so controller's handleArrival top-guard catches subsequent arrivals
        // until fate roll resolves).
        if (this.opts.isFateRollEligible?.()) {
          // Preview the level penalty without applying it. Mirrors
          // applyDeathPenalty's floor(level * 0.90) formula but doesn't mutate.
          const oldLevel = hero.level;
          const pendingDeathPenaltyNewLevel = Math.max(1, Math.floor(hero.level * 0.90));
          events.push({ type: 'fate_roll_required', enemyId: landmarkId, oldLevel, pendingDeathPenaltyNewLevel });
          return events;
        }
        // V3-H E1: hero died in battle — apply -10% level penalty and emit event.
        const { oldLevel, newLevel } = hero.applyDeathPenalty();
        // C140: track who killed us for revenge
        this.lastDeathEnemyId = landmarkId;
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId, oldLevel, newLevel });
        return events;
      }
      // C120: combo streak — no-damage kills in a row grant bonus exp
      if (tookDamage) {
        this.comboStreak = 0;
      } else {
        this.comboStreak++;
      }
      const comboBonus = this.comboStreak >= COMBO_STREAK_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_STREAK_THRESHOLD + 1) * COMBO_STREAK_EXP_BONUS
        : 1;
      const baseExpGain = expGainForKill(isBoss ? BOSS_EXP_BASE : ENEMY_EXP_BASE, hero.level);
      const dangerMul2 = isDangerZone ? DANGER_ZONE_EXP_MUL : 1;
      // C133: elite exp multiplier
      const eliteMul = isElite ? ELITE_EXP_MUL : 1;
      // C138: diminishing returns at high levels (soft cap)
      const diminish = hero.level > EXP_DIMINISH_THRESHOLD
        ? Math.max(0.1, 1 - (hero.level - EXP_DIMINISH_THRESHOLD) * EXP_DIMINISH_FACTOR)
        : 1;
      // C139: first blood bonus — first fight gets ×2 exp
      const firstBloodMul = !this.firstBloodUsed ? FIRST_BLOOD_EXP_MUL : 1;
      // C141: survival streak exp bonus
      const survivalBonus = this.survivalStreak >= SURVIVAL_STREAK_THRESHOLD
        ? 1 + (this.survivalStreak - SURVIVAL_STREAK_THRESHOLD) * SURVIVAL_STREAK_EXP_BONUS
        : 1;
      // C146: wave bonus exp
      const waveMulExp = this.waveRemaining > 0 ? WAVE_BONUS_EXP_MUL : 1;
      // C151: area familiarity bonus
      const visits = this.areaVisits.get(landmarkId) ?? 0;
      const familiarityMul = 1 + Math.min(visits, AREA_FAMILIARITY_CAP) * AREA_FAMILIARITY_EXP_BONUS;
      this.areaVisits.set(landmarkId, visits + 1);
      // C160: combo exp escalation
      const comboExpMul = this.comboStreak >= COMBO_EXP_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_EXP_THRESHOLD) * COMBO_EXP_BONUS_PER
        : 1;
      // C167: close call exp bonus — low HP after fight
      const closeCallMul = (!hero.staggered && hero.hp < hero.hpMax * CLOSE_CALL_HP_THRESHOLD && tookDamage)
        ? (1 + CLOSE_CALL_EXP_BONUS) : 1;
      const expGain = Math.floor(baseExpGain * dangerMul2 * eliteMul * comboBonus * diminish * firstBloodMul * survivalBonus * waveMulExp * familiarityMul * comboExpMul * closeCallMul);
      const baseDropOdds = isBoss ? 0.96 : isElite ? 1.0 : !this.firstBloodUsed ? 1.0 : DROP_RATE; // C139: first blood = guaranteed drop
      // Cycle 109 F1: boss intro drop_bonus adds onto V3-C drop_chance buff.
      const introDropBonus = isBoss ? (this.opts.getBossIntroDropBonus?.() ?? 0) : 0;
      // C123: overkill bonus — one-hit kills get +15% drop rate
      const overkillDropBonus = isOverkill ? OVERKILL_DROP_BONUS : 0;
      const dropOdds = Math.min(1, baseDropOdds + (this.opts.dropChanceBonus ?? 0) + introDropBonus + overkillDropBonus);
      // C126: drop streak — 3 consecutive drops upgrades next to boss pool
      const upgradePool = !isBoss && this.dropStreak >= DROP_STREAK_THRESHOLD;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss || upgradePool) : null;
      if (dropId) {
        this.dropStreak++;
        hero.addEquipment(dropId);
        if (upgradePool) {
          events.push({ type: 'drop_upgraded', dropId });
          this.dropStreak = 0; // reset after upgrade
        }
      } else {
        this.dropStreak = 0;
      }

      const { leveled } = hero.gainExp(expGain);
      // C166: exp overflow gold bonus — excess exp converts to gold
      if (leveled.length > 0) {
        const overflowGold = Math.floor(hero.exp / EXP_OVERFLOW_GOLD_RATIO);
        if (overflowGold > 0) hero.gold += overflowGold;
      }

      // Cycle 283: Sub-phase σ T3 — milestone level-up 시 trait auto-roll.
      // milestone level (5/15/30/50/80) 도달 + chance 30% 통과 시 trait 추가.
      if (leveled.length > 0) {
        hero.rollTraitsForLevels(this.rng, leveled);
      }

      // C144: gold earned from battle
      const goldMul = isBoss ? GOLD_BOSS_MUL : isElite ? GOLD_ELITE_MUL : isTreasureGoblin ? TREASURE_GOBLIN_GOLD_MUL : 1;
      // C162: danger zone gold bonus
      const dangerGoldMul = isDangerZone ? DANGER_ZONE_GOLD_MUL : 1;
      // C146: wave bonus multiplier
      const waveMul = this.waveRemaining > 0 ? WAVE_BONUS_GOLD_MUL : 1;
      // C149: momentum gold bonus
      const momentumGoldMul = this.battleMomentum >= GOLD_MOMENTUM_THRESHOLD ? (1 + GOLD_MOMENTUM_BONUS) : 1;
      // C153: combo gold bonus
      const comboGoldMul = this.comboStreak >= COMBO_GOLD_THRESHOLD
        ? 1 + (this.comboStreak - COMBO_GOLD_THRESHOLD) * COMBO_GOLD_BONUS_PER
        : 1;
      // C155: overkill gold bonus
      const overkillGoldMul = isOverkill ? (1 + OVERKILL_GOLD_BONUS) : 1;
      // C161: crit gold bonus
      const critGoldMul = didCrit ? (1 + CRIT_GOLD_BONUS) : 1;
      const goldEarned = Math.floor(GOLD_PER_KILL_BASE * Math.pow(hero.level, GOLD_LEVEL_POWER) * goldMul * dangerGoldMul * waveMul * momentumGoldMul * comboGoldMul * overkillGoldMul * critGoldMul);
      hero.gold += goldEarned;
      // C157: boss vault — lump sum gold bonus for boss kills
      if (isBoss) {
        const vaultGold = hero.level * BOSS_VAULT_GOLD_PER_LEVEL;
        hero.gold += vaultGold;
        events.push({ type: 'boss_vault', gold: vaultGold });
      }
      // C156: HP regen on win
      const regenAmount = Math.max(1, Math.floor(hero.hpMax * WIN_HP_REGEN_RATE));
      hero.heal(regenAmount);

      events.push({ type: 'battle_won', enemyId: landmarkId, expGain, dropId });
      // C136: decrement shrine buff after each fight
      if (this.shrineBuffRemaining > 0) this.shrineBuffRemaining--;
      // C154: decrement shop shield after each fight
      if (this.shopShieldRemaining > 0) this.shopShieldRemaining--;
      // C137: win resets death streak, decrement mercy
      this.deathStreak = 0;
      if (this.mercyRemaining > 0) this.mercyRemaining--;
      // C141: survival streak increments on win
      this.survivalStreak++;
      // C146: wave tracking
      this.totalWins++;
      // C148: kill counter milestone
      this.killCount++;
      if (this.killCount % KILL_MILESTONE_INTERVAL === 0) {
        this.killMilestones++;
        events.push({ type: 'milestone_kill', killCount: this.killCount, milestones: this.killMilestones });
      }
      if (this.waveRemaining > 0) {
        this.waveRemaining--;
        if (this.waveRemaining === 0) {
          events.push({ type: 'wave_complete', totalWins: this.totalWins });
        }
      } else if (this.totalWins % WAVE_INTERVAL === 0) {
        this.waveRemaining = WAVE_SIZE;
        events.push({ type: 'wave_started', size: WAVE_SIZE });
      }
      // C139: mark first blood as used
      if (!this.firstBloodUsed) {
        this.firstBloodUsed = true;
        events.push({ type: 'first_blood', expGain, dropId });
      }
      // C140: clear revenge target on successful kill
      if (this.lastDeathEnemyId === landmarkId) {
        events.push({ type: 'revenge_kill', enemyId: landmarkId });
        this.lastDeathEnemyId = null;
      }
      // C132: boss rage event — notify when boss fight lasted multiple turns
      if (isBoss && rageTurn > 0) {
        events.push({ type: 'boss_rage', turns: rageTurn, atkMultiplier: 1 + rageTurn * BOSS_RAGE_ATK_PER_TURN });
      }
      // C125: battle momentum — consecutive fights without village give ATK bonus
      this.battleMomentum = Math.min(this.battleMomentum + 1, MOMENTUM_CAP);
      if (isOverkill) {
        events.push({ type: 'overkill', enemyId: landmarkId });
      }
      if (didCrit) {
        events.push({ type: 'critical_hit', streak: this.comboStreak });
      }
      if (this.comboStreak >= COMBO_STREAK_THRESHOLD) {
        events.push({ type: 'combo_streak', streak: this.comboStreak, bonusMul: comboBonus });
      }
      // C124: close call — survive with < 10% HP → adrenaline heal 5% max HP
      if (tookDamage && !hero.staggered && hero.hp < hero.hpMax * CLOSE_CALL_THRESHOLD) {
        const adrenalineHeal = Math.max(1, Math.floor(hero.hpMax * CLOSE_CALL_HEAL));
        hero.heal(adrenalineHeal);
        events.push({ type: 'close_call', hpRemaining: hero.hp, healed: adrenalineHeal });
      }
      // C142: lucky dodge event
      if (luckyDodge) {
        events.push({ type: 'lucky_dodge' });
      }

      // V1c-1 — merciful drift proc on non-boss kills. Sign branches on the
      // hero's current merciful so a prior=0 hero is nudged toward whichever
      // tendency surfaces first and subsequent procs compound that direction.
      if (!isBoss && this.rng.chance(MERCIFUL_PROC_RATE)) {
        const current = hero.personality.get('merciful');
        const sparing = current >= 0;
        const delta = sparing ? MERCIFUL_DRIFT : -MERCIFUL_DRIFT;
        hero.personality.adjust('merciful', delta);
        events.push({
          type: 'moral_choice',
          choice: sparing ? 'spare_enemy' : 'execute_enemy',
          dim: 'merciful',
          delta,
          nameKR: sparing
            ? '쓰러진 적을 살려보내며 자비가 깊어졌다'
            : '쓰러진 적을 처형하여 잔혹함이 굳어졌다',
        });
      }

      for (const newLv of leveled) {
        events.push({ type: 'level_up', from: newLv - 1, to: newLv });
        // C121: milestone fanfare at key levels
        if (MILESTONE_LEVELS.includes(newLv)) {
          events.push({ type: 'milestone_reached', level: newLv });
        }
        // cycle 1 F1: milestone channel 도 SHRINE_SKILL_GRANT_RATE 따르게 통합.
        // 매 100 레벨 마다 deterministic grant 라 826k level 환경에서 ~8200 회
        // fire → skill saturation. shrine 과 같은 확률 gate 로 두 channel 통일.
        if (isSkillMilestoneLevel(newLv) && this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
          const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
          if (learn) {
            events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
          }
        }
      }
    } else if (kind === 'village') {
      // C125: village visit resets battle momentum
      this.battleMomentum = 0;
      // C134: village rest bonus — arrive with low HP → permanent max HP boost
      if (hero.hp < hero.hpMax * VILLAGE_REST_HP_THRESHOLD) {
        const hpBoost = Math.max(1, Math.floor(hero.hpMax * VILLAGE_REST_HP_BOOST));
        hero.hpMax += hpBoost;
        events.push({ type: 'village_rest_bonus', hpBoost });
      }
      // C154: village shop — spend gold for HP shield
      if (hero.gold >= VILLAGE_SHOP_COST) {
        hero.gold -= VILLAGE_SHOP_COST;
        this.shopShieldRemaining = VILLAGE_SHOP_SHIELD_DURATION;
        events.push({ type: 'village_shop_purchase', cost: VILLAGE_SHOP_COST, effect: 'hp_shield' });
      }
      const healAmount = Math.floor(hero.hpMax * 0.25);
      hero.heal(healAmount);
    } else if (kind === 'shrine') {
      if (this.rng.chance(0.2)) {
        // V3-H F4: meditation 변형 (20%) — pious +3, 완전 회복, 추가 aging 0.5 tick
        hero.personality.adjust('pious', 3);
        hero.heal(hero.hpMax); // 완전 회복
        hero.tickAge(0.5);     // 명상에 소요되는 시간
        // C136: shrine meditation grants temporary ATK buff
        this.shrineBuffRemaining = SHRINE_MEDITATION_BUFF_DURATION;
        events.push({ type: 'meditation_done', landmarkId });
        events.push({ type: 'shrine_buff_granted', duration: SHRINE_MEDITATION_BUFF_DURATION });
      } else {
        const before = hero.hp;
        hero.heal(Math.floor(hero.hpMax * SHRINE_HEAL_FRACTION));
        const healed = hero.hp - before;
        events.push({ type: 'shrine_visited', landmarkId, healed });
        if (this.rng.chance(SHRINE_SKILL_GRANT_RATE)) {
          const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
          if (learn) {
            events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
          }
        }
      }
    } else if (kind === 'cave') {
      // 부상자 발견. 도덕적 결정.
      const heroic = hero.personality.get('heroic');
      const merciful = hero.personality.get('merciful');
      if (heroic + merciful >= 0) {
        hero.personality.adjust('moral', 1);
        events.push({ type: 'moral_choice', choice: 'help_injured', dim: 'moral', delta: 1, nameKR: '부상자를 도와 영혼이 정화되었다' });
      } else {
        hero.personality.adjust('moral', -1);
        events.push({ type: 'moral_choice', choice: 'ignore_injured', dim: 'moral', delta: -1, nameKR: '부상자를 외면하여 영혼이 어두워졌다' });
      }
    } else if (kind === 'ruin') {
      // 강도 만남. moral 따라 분기.
      const moral = hero.personality.get('moral');
      if (moral < 0) {
        hero.personality.adjust('moral', -2);
        events.push({ type: 'moral_choice', choice: 'rob_with_bandits', dim: 'moral', delta: -2, nameKR: '강도단에 합류하여 약자를 약탈했다' });
      } else {
        hero.personality.adjust('moral', 2);
        events.push({ type: 'moral_choice', choice: 'resist_bandits', dim: 'moral', delta: 2, nameKR: '강도단에 맞서 약자를 지켰다' });
      }
    } else if (kind === 'sightseeing') {
      // V3-H F3: 절경 랜드마크 — sightseeing_arrived 를 emit; 실제 personality 조정은
      // CycleControllerV2.handleArrival 에서 rng 기반으로 처리.
      const lmType = LANDMARK_TYPES.find(t => landmarkId.startsWith(t.id));
      events.push({
        type: 'sightseeing_arrived',
        landmarkId,
        landmarkNameKR: lmType?.nameKR ?? '절경',
      });
    } else {
      // V1c-1 personality drift landmarks (watchtower / treasure_cave /
      // holy_ruin / crossroads). The catalog lookup is exhaustive for these
      // kinds; an unknown kind is silently a no-op so the engine stays open
      // to future LandmarkKind additions.
      const enc = findEncounterForKind(kind);
      if (enc) {
        const current = hero.personality.get(enc.dim);
        const branch = selectBranch(current, enc);
        hero.personality.adjust(enc.dim, branch.delta);
        events.push({
          type: 'moral_choice',
          choice: branch.choice,
          dim: enc.dim,
          delta: branch.delta,
          nameKR: branch.nameKR,
        });
      }
    }
    return events;
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss ? BOSS_DROPS : ENEMY_DROPS;
    return pool[this.rng.int(pool.length)].id;
  }
}
