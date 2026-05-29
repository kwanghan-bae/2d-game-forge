import type { LandmarkKind } from '../data/landmarks';
import type { PersonalityDim } from '../hero/PersonalityState';
import type { Chapter } from '../hero/HeroLifecycle';

export type OverworldEvent =
  | { type: 'tick';            t: number }
  | { type: 'arrived_at';      landmarkId: string; landmarkKind: LandmarkKind }
  | { type: 'danger_zone_entered'; enemyId: string }
  | { type: 'combo_streak'; streak: number; bonusMul: number }
  | { type: 'milestone_reached'; level: number }
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
      atAge: number };
