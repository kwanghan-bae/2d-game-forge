import type { LandmarkKind } from '../data/landmarks';
import type { PersonalityDim } from '../hero/PersonalityState';
import type { Chapter } from '../hero/HeroLifecycle';

export type OverworldEvent =
  | { type: 'tick';            t: number }
  | { type: 'arrived_at';      landmarkId: string; landmarkKind: LandmarkKind }
  | { type: 'danger_zone_entered'; enemyId: string }
  | { type: 'danger_zone_choice' }
  | { type: 'danger_retreat'; cost: number }
  | { type: 'combo_streak'; streak: number; bonusMul: number }
  | { type: 'critical_hit'; streak: number; damage?: number }
  | { type: 'overkill'; enemyId: string }
  | { type: 'close_call'; hpRemaining: number; healed: number }
  | { type: 'drop_upgraded'; dropId: string }
  | { type: 'milestone_reached'; level: number }
  | { type: 'boss_rage'; turns: number; atkMultiplier: number }
  | { type: 'elite_spawned'; enemyId: string }
  | { type: 'village_rest_bonus'; hpBoost: number }
  | { type: 'shrine_buff_granted'; duration: number }
  | { type: 'mercy_activated'; duration: number }
  | { type: 'first_blood'; expGain: number; dropId: string | null }
  | { type: 'revenge_kill'; enemyId: string }
  | { type: 'lucky_dodge' }
  | { type: 'wave_started'; size: number }
  | { type: 'wave_complete'; totalWins: number }
  | { type: 'milestone_kill'; killCount: number; milestones: number }
  | { type: 'treasure_goblin'; enemyId: string }
  | { type: 'village_shop_purchase'; cost: number; effect: string }
  | { type: 'boss_vault'; gold: number }
  | { type: 'gold_rain' }
  | { type: 'gold_saved' }
  | { type: 'lucky_treasure'; gold: number }
  | { type: 'prestige'; count: number }
  | { type: 'battle_started';  enemyId: string }
  | { type: 'battle_won';      enemyId: string; expGain: number; dropId: string | null }
  | { type: 'level_up';        from: number; to: number }
  | { type: 'job_unlocked';    jobId: string; jobNameKR: string; tier: 1 | 2 | 3 }
  | { type: 'skill_learned';   skillId: string; skillNameKR: string; atkBefore: number; atkAfter: number }
  | { type: 'shrine_visited';  landmarkId: string; healed: number }
  | { type: 'moral_choice';    choice: string; dim: PersonalityDim; delta: number; nameKR: string }
  | { type: 'chapter_transition'; fromChapter: Chapter; toChapter: Chapter; atAge: number }
  | { type: 'hero_died';       cause: '전사' | '자연사'; enemyId?: string; oldLevel: number; newLevel: number }
  // Cycle 108 F1: Fate Roll on Death. Emitted by EncounterEngine when hero
  // would die in combat AND fate roll is eligible (controller's
  // fateRollConsumed=false). Controller pauses subsequent processing and
  // waits for resolveFateRoll('accept' | 'decline'). pendingDeathPenaltyNewLevel
  // = newLevel that *would* be applied if player declines (UI preview).
  | { type: 'fate_roll_required'; enemyId: string; oldLevel: number; pendingDeathPenaltyNewLevel: number }
  // Cycle 108 F1: fate roll resolved. Useful for OverworldRunner / saga
  // diagnostics. outcome='accept' = crackStone spent + HP 50% restored.
  // outcome='decline' = death penalty applied + hero_died('전사') emit follows.
  | { type: 'fate_roll_resolved'; outcome: 'accept' | 'decline' }
  // Cycle 109 F1: Boss Intro Choice. EncounterEngine emits this *before*
  // battle_started when kind === 'boss' AND isBossIntroEligible() returns true.
  // Controller pauses arrival pipeline + opens modal. resolveBossIntro(idx)
  // applies the chosen buff + immediately runs the boss combat via a recursive
  // resolveEncounter call (the bossIntroSeenIds guard makes the inner call
  // skip the intro path so no infinite recursion). cards = the 3 sampled
  // deterministic buff cards (id + nameKR + descKR + tier).
  | { type: 'boss_intro_offered'; landmarkId: string; cards: ReadonlyArray<{
        id: import('../buff/bossIntroCatalog').BossIntroBuffId;
        nameKR: string;
        descKR: string;
        tier: import('../buff/bossIntroCatalog').BossIntroBuffTier;
      }> }
  // Cycle 109 F1: boss intro resolved. chosenIdx = 0|1|2 of the 3 cards.
  | { type: 'boss_intro_resolved'; chosenIdx: 0 | 1 | 2; chosenId: import('../buff/bossIntroCatalog').BossIntroBuffId }
  // Cycle 109 F1: boss intro skipped because the per-cycle 4-card cap was hit.
  // Emitted in place of boss_intro_offered when activeBossIntroBuffs.length >= 4.
  // No modal mounts; controller proceeds straight to the regular boss combat.
  | { type: 'boss_intro_skipped'; landmarkId: string; reason: 'cap_reached' }
  | { type: 'realm_unlocked'; realmId: import('../types').RealmId }
  | { type: 'realm_entered'; realmId: import('../types').RealmId }
  // Cycle 110 F1: Realm Fork. handleArrival's exit-landmark branch emits this
  // *before* `this.currentRealmId = newRealm` when fork is eligible (cap < 4,
  // not already pending). Controller pauses arrival pipeline + opens modal.
  // resolveRealmFork('risk'|'safe') applies the chosen buff + performs the
  // deferred realm transition + emits realm_entered. Cards are deterministic
  // fixed catalog (no random sampling). Mirror of fate roll + boss intro
  // pause patterns. auto-choice = trait-based (computeRealmForkAutoChoice).
  | { type: 'realm_fork_offered';
      oldRealm: import('../types').RealmId;
      newRealm: import('../types').RealmId;
      riskCard: import('../buff/realmForkCatalog').RealmForkCard;
      safeCard: import('../buff/realmForkCatalog').RealmForkCard;
      autoChoice: import('../buff/realmForkCatalog').RealmForkCardId;
    }
  // Cycle 110 F1: realm fork resolved. Used by sim driver + saga diagnostics.
  | { type: 'realm_fork_resolved';
      choice: import('../buff/realmForkCatalog').RealmForkCardId;
    }
  // Cycle 110 F1: realm fork skipped because activeRealmForkBuffs cap (4) was
  // hit. Emitted in place of realm_fork_offered when cap reached. Controller
  // proceeds straight to the regular realm transition (realm_entered follows).
  | { type: 'realm_fork_skipped';
      oldRealm: import('../types').RealmId;
      newRealm: import('../types').RealmId;
      reason: 'cap_reached';
    }
  | { type: 'npc_encounter'; npcInstanceId: string; npcKind: import('../types').NpcEntity['kind'] }
  | { type: 'npc_died'; npcInstanceId: string }
  | { type: 'family_event'; eventKind: 'marriage' | 'child_birth' | 'parent_death' | 'child_grown'; npcInstanceId?: string }
  // Cycle-5 F3: optional cause discriminates pathfinder-exhausted (`'무위'`)
  // from natural cycle end. Falsy/undefined falls through to controller default
  // `'자연사'` so existing tests / abandon flows stay unchanged.
  | { type: 'cycle_ended'; cause?: import('../saga/SagaTypes').DeathCause }
  // V3-H F3: sightseeing landmark arrived
  | { type: 'sightseeing_arrived'; landmarkId: string; landmarkNameKR: string }
  // V3-H F4: meditation (shrine 20% 변형)
  | { type: 'meditation_done'; landmarkId: string }
  // V3-H F5: trial result
  | { type: 'trial_resolved'; trialLv: number; outcome: 'win' | 'lose'; oldLevel?: number; newLevel?: number }
  // V3-H F6: season change
  | { type: 'season_changed'; season: import('../types').SeasonId }
  // Cycle 106 F1: inflation milestone tier crossing (8 tier × 10^n level).
  // controller 가 levelUpBatch 직후 fromLv→toLv 의 tier crossing 검출 후 ascending emit.
  // 같은 cycle 안 같은 tier 재발화 금지 (in-memory ledger).
  | { type: 'inflation_milestone';
      tier: import('../data/milestones').MilestoneTier;
      thresholdLv: number;
      fromLv: number;
      toLv: number;
      atAge: number }
  // C818: Awakening hint — narrative whisper in fights 1-5
  | { type: 'awakening_hint'; hintIndex: number }
  // C826: Risk Gambit — early-game decision event (risk HP for gold)
  | { type: 'event_risk_gambit'; accepted: boolean; hpCost: number; goldReward: number }
  // C832: Wandering Merchant — heal or ATK buff
  | { type: 'event_wandering_merchant'; choice: 'heal' | 'atk' | 'gamble_win' | 'gamble_lose'; value: number }
  // C834: Post-combat shrine chain result
  | { type: 'event_treasure_shrine'; choice: import('./encounter/EventChoiceEngine').ShrineChoice }
  | { type: 'event_treasure_shrine_pending' }
  | { type: 'event_chain_reward' }
  // Legacy post-combat event notifications emitted without extra payload.
  | { type: 'event_merchant' }
  | { type: 'event_merchant_buy' }
  | { type: 'event_merchant_sell' }
  | { type: 'event_merchant_ignore' }
  | { type: 'event_gambler' }
  | { type: 'event_gambler_win' }
  | { type: 'event_gambler_lose_high' }
  | { type: 'event_gambler_lose_low' }
  | { type: 'event_gambler_walk' }
  | { type: 'event_blacksmith' }
  | { type: 'event_cursed_altar' }
  | { type: 'event_altar_sacrifice' }
  | { type: 'event_altar_pray' }
  | { type: 'event_altar_leave' }
  | { type: 'event_fairy' }
  | { type: 'event_rest_shrine' }
  | { type: 'event_trap' }
  | { type: 'event_trap_avoided' }
  | { type: 'event_healer' }
  | { type: 'event_echo' }
  | { type: 'event_inspiration' }
  | { type: 'event_mentor' }
  | { type: 'event_time_rift' }
  // Phase-gated weather and late-game event notifications.
  | { type: 'event_trial_grounds' }
  | { type: 'event_rain_sanctuary' }
  | { type: 'event_fog_ambush' }
  | { type: 'event_storm_nexus' }
  | { type: 'event_wind_gale' }
  | { type: 'event_snow_drift' }
  | { type: 'event_clear_sky_path' }
  | { type: 'event_ancient_colosseum' }
  | { type: 'event_void_rift' }
  | { type: 'event_temporal_fissure' }
  | { type: 'event_abyssal_convergence' }
  | { type: 'event_titan_arena' }
  | { type: 'event_crimson_tithe' }
  | { type: 'event_gold_crucible' }
  | { type: 'event_astral_paradox' }
  | { type: 'event_soul_forge' }
  | { type: 'event_ascension_trial' }
  | { type: 'event_echo_memory' }
  | { type: 'event_shard_fusion' }
  | { type: 'event_endgame_surge' }
  // C841: Sparring Grounds — skill-check micro-event
  | { type: 'event_sparring_grounds'; won: boolean; expGained: number; hpLost: number; morphGranted?: boolean }
  // C863: Storm drain visual feedback
  | { type: 'storm_drain'; value: number; hpAfter: number }
  | { type: 'storm_drain_critical'; value: number; hpAfter: number }
  // C974: Veteran's Challenge HP drain per fight
  | { type: 'vc_hp_drain'; value: number; hpAfter: number }
  // C977: Veteran's Challenge survival burst (completed 10 fights)
  | { type: 'vc_survival_burst'; value: number }
  // C978: Veteran's Challenge progress (UI tension feedback)
  | { type: 'vc_progress'; current: number; total: number; hpPercent: number }
  // C980: Inflation Burst — rare ×100 ATK for 1 fight
  | { type: 'inflation_burst' }
  // C981: Inflation Burst result — post-fight spectacle data
  | { type: 'inflation_burst_result'; overkill: boolean; atkMul: number }
  // C983: Inflation Rush — post-burst EXP momentum
  | { type: 'inflation_rush_start' }
  // C989: Inflation Rush choice pending + cashout result
  | { type: 'inflation_rush_pending' }
  | { type: 'inflation_rush_cashout'; gold: number }
  // C866: Proving Grounds mid-game challenge
  | { type: 'event_proving_grounds'; won: boolean; expMul: number; hpCost: number; declined?: boolean; shardGranted?: boolean }
  // C875: Proving Grounds player choice pending
  | { type: 'proving_grounds_choice' }
  // C878: Mercenary Offer player choice pending
  | { type: 'mercenary_offer_choice' }
  // C878: Crossroads player choice pending
  | { type: 'crossroads_choice' }
  // C881: Wandering Merchant player choice pending
  | { type: 'wandering_merchant_choice' }
  // C905/C921/C926: late mid-game choice prompts
  | { type: 'first_trial_choice' }
  | { type: 'wandering_sage_choice' }
  | { type: 'elders_judgment_choice' }
  // C883: Reputation payoff event
  | { type: 'event_reputation'; style: string; value: number }
  // C887: Veteran's Trial consequence event
  | { type: 'event_veterans_trial'; style: string; value: number }
  // C896: Final Reckoning consequence event
  | { type: 'event_final_reckoning'; style: string; value: number }
  // C878: Resolved mid-game choices
  | { type: 'event_mercenary_offer'; choice: 'accept' | 'decline'; goldPaid: number; duration: number }
  | { type: 'event_crossroads'; path: 'atk' | 'exp' | 'gold'; duration?: number; goldBurst?: number }
  | { type: 'event_first_trial'; style: 'heal' | 'atk' | 'exp'; value: number }
  | { type: 'event_wandering_sage'; style: 'exp' | 'atk'; value: number }
  | { type: 'event_elders_judgment'; choice: 'double_down' | 'diversify'; style: string; value: number }
  // C890: Last Stand Challenge player choice
  | { type: 'event_last_stand'; choice: string; value: number }
  // C893a: Last Stand choice trigger
  | { type: 'last_stand_choice' }
  // C959: Veteran's Challenge player choice pending
  | { type: 'veterans_challenge_choice' }
  // C959: Veteran's Challenge resolved
  | { type: 'event_veterans_challenge'; accepted: boolean; duration: number }
  // C1016: Revive perk activated
  | { type: 'perk_revive'; enemyId: string }
  // C1029: Boss HP <= 50% Phase Shift event
  | { type: 'boss_phase_shift'; enemyId: string; phase: 2; enrageAtkMul: number };
