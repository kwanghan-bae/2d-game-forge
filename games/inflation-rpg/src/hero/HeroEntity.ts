import { SeededRng } from '../cycle/SeededRng';
import { HeroSpawner } from './HeroSpawner';
import { HeroLifecycle, type Chapter } from './HeroLifecycle';
import { PersonalityState } from './PersonalityState';
import {
  heroAtkAtLevel,
  heroHpMaxAtLevel,
  expRequiredForLevel,
} from '../cycle/inflationCurve';
import { JobSystem } from './JobSystem';
import type { JobMilestone } from '../data/jobs';
import { lookupDrop } from '../overworld/dropTable';
import { getAgingDebuff } from './agingDebuff';

const EXP_REQ_BASE = 10;

export interface JobUnlockResult {
  jobId: string;
  jobNameKR: string;
  tier: 1 | 2 | 3;
}

export interface HeroCreateOpts {
  seed: number;
  heroHpMax: number;
  heroAtkBase: number;
}

/** V3-H B2 — 직렬화 가능한 hero state snapshot. persist v22 의 run.heroSnapshot 에 저장됨. */
export interface HeroSnapshot {
  name: string;
  emoji: string;
  age: number;
  chapter: import('./HeroLifecycle').Chapter;
  job: string;
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  atkBase: number;
  hpBase: number;
  actionCount: number;
  rejuvenationCount: number;
  gridX: number;
  gridY: number;
  equipment: string[];
  personality: import('./PersonalityState').PersonalitySnapshot;
  unlockedJobId: string | null;
  unlockedMilestones: import('../data/jobs').JobMilestone[];
  learnedSkillIds: string[];
  seed: number;
}

export class HeroEntity {
  name: string;
  emoji: string;
  age: number;
  chapter: Chapter;
  job: string;
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  atkBase: number;
  hpBase: number;
  actionCount: number;
  rejuvenationCount: number;
  staggered: boolean = false;
  /** V3-D — current grid column. Updated by OverworldScene movement tween. */
  public gridX: number = 0;
  public gridY: number = 0;
  equipment: string[] = [];
  personality: PersonalityState;
  unlockedJobId: string | null = null;
  unlockedMilestones: Set<JobMilestone> = new Set();
  learnedSkillIds: Set<string> = new Set();
  private agingAccum: number = 0;

  private constructor() {
    this.name = '';
    this.emoji = '🧒';
    this.age = 5;
    this.chapter = '어린시절';
    this.job = '평민';
    this.level = 1;
    this.exp = 0;
    this.hp = 0;
    this.hpMax = 0;
    this.atk = 0;
    this.atkBase = 0;
    this.hpBase = 0;
    this.actionCount = 0;
    this.rejuvenationCount = 0;
    this.personality = new PersonalityState();
  }

  static create(opts: HeroCreateOpts): HeroEntity {
    const h = new HeroEntity();
    const spawned = HeroSpawner.spawn(new SeededRng(opts.seed));
    h.name = spawned.name;
    h.emoji = spawned.emoji;
    h.age = spawned.age;
    h.chapter = HeroLifecycle.chapterForAge(spawned.age);
    h.job = spawned.job;
    h.level = spawned.level;
    h.exp = 0;
    h.atkBase = opts.heroAtkBase;
    h.hpBase = opts.heroHpMax;
    h.atk = heroAtkAtLevel(h.atkBase, h.level);
    h.hpMax = heroHpMaxAtLevel(h.hpBase, h.level);
    h.hp = h.hpMax;
    h.personality = PersonalityState.fromTraitPriors(spawned.personalityPriors);
    return h;
  }

  gainExp(amount: number): { leveled: number[] } {
    const leveled: number[] = [];
    this.exp += amount;
    while (this.exp >= this.expRequired()) {
      this.exp -= this.expRequired();
      this.level += 1;
      leveled.push(this.level);
      this.recomputeStats();
      this.hp = this.hpMax;
    }
    return { leveled };
  }

  /** Public so that JobSystem / SkillLearningSystem / equipment can mutate base
   *  stats and have the level-scaled values re-derived. */
  recomputeStats(): void {
    const debuff = getAgingDebuff(this.age);
    this.atk = Math.floor(heroAtkAtLevel(this.atkBase, this.level) * debuff.atkMul);
    this.hpMax = Math.floor(heroHpMaxAtLevel(this.hpBase, this.level) * debuff.hpMul);
    if (this.hp > this.hpMax) this.hp = this.hpMax;
  }

  /** V3-B aging mechanic + V3-C aging_slow buff.
   *  agingMul (default 1.0) 가 < 1.0 이면 fractional accumulator 로 늦춤.
   *  >= 1.0 이면 while-loop 으로 다중 tick 처리. */
  tickAge(agingMul: number = 1.0): void {
    this.agingAccum += agingMul;
    while (this.agingAccum >= 1.0) {
      this.agingAccum -= 1.0;
      this.actionCount += 1;
    }
    this.age = HeroLifecycle.ageFromActions(this.actionCount);
    this.chapter = HeroLifecycle.chapterForAge(this.age);
    this.recomputeStats();
  }

  /** Spec §4.3 — invert actionCount via actionsForAge so age decreases by
   *  `years`. Clamps at the minimum age (5). Increments rejuvenationCount as
   *  the saga marker. recomputeStats() applies updated aging debuff after
   *  age changes. */
  rejuvenate(years: number): void {
    const targetAge = Math.max(5, this.age - years);
    const targetActions = HeroLifecycle.actionsForAge(targetAge);
    this.actionCount = Math.max(0, targetActions);
    this.age = HeroLifecycle.ageFromActions(this.actionCount);
    this.chapter = HeroLifecycle.chapterForAge(this.age);
    this.rejuvenationCount += 1;
    this.recomputeStats();
  }

  /** Restore HP to max and clear the staggered flag. Called by controller
   *  on the arrival after a defeat. */
  recoverFromStagger(): void {
    this.staggered = false;
    this.hp = this.hpMax;
  }

  /** Called by CycleControllerV2 after each arrival. Checks for age milestones
   *  and unlocks a job if one matches the current personality. Returns the
   *  list of newly unlocked jobs (typically 0 or 1, but technically possible
   *  to skip multiple if age jumps via large action step). */
  maybeUnlockJobForAge(currentAge: number): JobUnlockResult[] {
    const milestones: Array<{ age: number; m: JobMilestone }> = [
      { age: 10, m: 'age10' },
      { age: 30, m: 'age30' },
      { age: 50, m: 'age50' },
    ];
    const out: JobUnlockResult[] = [];
    for (const ms of milestones) {
      if (currentAge < ms.age) continue;
      if (this.unlockedMilestones.has(ms.m)) continue;
      this.unlockedMilestones.add(ms.m);
      const job = JobSystem.evaluate(this, ms.m);
      if (!job) continue;
      this.unlockedJobId = job.id;
      this.job = job.nameKR;
      this.emoji = job.emoji;
      this.atkBase = Math.floor(this.atkBase * job.atkMul);
      this.hpBase = Math.floor(this.hpBase * job.hpMul);
      this.recomputeStats();
      this.hp = this.hpMax;
      out.push({ jobId: job.id, jobNameKR: job.nameKR, tier: job.tier });
    }
    return out;
  }

  /** V3-H B2 — Snapshot for persist. Serialize all mutable hero state to a plain object. */
  serialize(seed: number): HeroSnapshot {
    return {
      name: this.name,
      emoji: this.emoji,
      age: this.age,
      chapter: this.chapter,
      job: this.job,
      level: this.level,
      exp: this.exp,
      hp: this.hp,
      hpMax: this.hpMax,
      atk: this.atk,
      atkBase: this.atkBase,
      hpBase: this.hpBase,
      actionCount: this.actionCount,
      rejuvenationCount: this.rejuvenationCount,
      gridX: this.gridX,
      gridY: this.gridY,
      equipment: [...this.equipment],
      personality: this.personality.snapshot(),
      unlockedJobId: this.unlockedJobId,
      unlockedMilestones: [...this.unlockedMilestones],
      learnedSkillIds: [...this.learnedSkillIds],
      seed,
    };
  }

  /** V3-H B2 — Restore a HeroEntity from a snapshot. Derived stats are
   *  re-computed via recomputeStats() so aging debuff is applied correctly. */
  static restore(snap: HeroSnapshot): HeroEntity {
    const h = new HeroEntity();
    h.name = snap.name;
    h.emoji = snap.emoji;
    h.actionCount = snap.actionCount;
    h.age = snap.age;
    h.chapter = snap.chapter;
    h.job = snap.job;
    h.level = snap.level;
    h.exp = snap.exp;
    h.atkBase = snap.atkBase;
    h.hpBase = snap.hpBase;
    h.rejuvenationCount = snap.rejuvenationCount;
    h.gridX = snap.gridX;
    h.gridY = snap.gridY;
    h.equipment = [...snap.equipment];
    h.unlockedJobId = snap.unlockedJobId;
    h.unlockedMilestones = new Set(snap.unlockedMilestones);
    h.learnedSkillIds = new Set(snap.learnedSkillIds);
    h.personality = PersonalityState.fromTraitPriors(snap.personality);
    h.recomputeStats();
    // Restore HP within new hpMax bounds
    h.hp = Math.min(snap.hp, h.hpMax);
    return h;
  }

  private expRequired(): number {
    return expRequiredForLevel(EXP_REQ_BASE, this.level);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.staggered = true;
  }

  /** V3-H E1: 패배 시 -10% 레벨 패널티.
   *  staggered=true 를 설정하고 level 을 floor(level × 0.90) 으로 감소 (최소 1).
   *  recomputeStats() 를 호출해 새 level 에 맞게 hpMax/atk 을 갱신한다.
   *  oldLevel / newLevel 을 반환해 호출자가 saga narration 에 사용할 수 있게 한다. */
  applyDeathPenalty(): { oldLevel: number; newLevel: number } {
    const oldLevel = this.level;
    this.staggered = true;
    this.level = Math.max(1, Math.floor(this.level * 0.90));
    this.recomputeStats();
    return { oldLevel, newLevel: this.level };
  }

  heal(amount: number): void {
    this.hp = Math.min(this.hpMax, this.hp + amount);
  }

  addEquipment(itemId: string): void {
    this.equipment.push(itemId);
    // Additive flat bonuses. Multiplicative would compound across N drops and
    // break the Sim-G curve — see 2026-05-21-sim-g-v1a-report.md §V1b.
    const item = lookupDrop(itemId);
    if (item) {
      this.atkBase += item.atkFlat;
      this.hpBase += item.hpFlat;
      this.recomputeStats();
    }
  }
}
