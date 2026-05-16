import { SeededRng } from '../cycle/SeededRng';
import { HeroSpawner } from './HeroSpawner';
import { HeroLifecycle, type Chapter } from './HeroLifecycle';
import { PersonalityState } from './PersonalityState';

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
  bp: number;
  bpMax: number;
  equipment: string[] = [];
  dead: boolean = false;
  personality: PersonalityState;

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
    h.hp = opts.heroHpMax;
    h.hpMax = opts.heroHpMax;
    h.atk = opts.heroAtkBase;
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
      const hpDelta = Math.floor(this.hpMax * 0.05);
      this.hpMax += hpDelta;
      this.hp = this.hpMax;
    }
    return { leveled };
  }

  private expRequired(): number {
    // Placeholder curve (Sim-A heritage). Sim-G tunes for inflation.
    return Math.max(1, Math.floor(10 * Math.pow(this.level, 1.3)));
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
  }
}
