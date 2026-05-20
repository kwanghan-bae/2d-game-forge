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

const EXP_REQ_BASE = 10;

export interface JobUnlockResult {
  jobId: string;
  jobNameKR: string;
  tier: 1 | 2 | 3;
}

export interface HeroCreateOpts {
  seed: number;
  bpMax: number;
  heroHpMax: number;
  heroAtkBase: number;
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
  bp: number;
  bpMax: number;
  equipment: string[] = [];
  dead: boolean = false;
  personality: PersonalityState;
  unlockedJobId: string | null = null;
  unlockedMilestones: Set<JobMilestone> = new Set();
  learnedSkillIds: Set<string> = new Set();

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
    this.bp = 0;
    this.bpMax = 0;
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
    h.bp = opts.bpMax;
    h.bpMax = opts.bpMax;
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
    this.atk = heroAtkAtLevel(this.atkBase, this.level);
    this.hpMax = heroHpMaxAtLevel(this.hpBase, this.level);
  }

  /** Called by CycleControllerV2 after each arrival. Checks for age milestones
   *  and unlocks a job if one matches the current personality. Returns the
   *  list of newly unlocked jobs (typically 0 or 1, but technically possible
   *  to skip multiple if age jumps via large BP step). */
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

  private expRequired(): number {
    return expRequiredForLevel(EXP_REQ_BASE, this.level);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.dead = true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.hpMax, this.hp + amount);
  }

  consumeBp(amount: number): void {
    this.bp = Math.max(0, this.bp - amount);
    this.refreshAge();
    if (this.bp <= 0) this.dead = true;
  }

  private refreshAge(): void {
    const progress = (this.bpMax - this.bp) / this.bpMax;
    this.age = HeroLifecycle.ageFromBpProgress(progress);
    this.chapter = HeroLifecycle.chapterForAge(this.age);
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
