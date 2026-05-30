/**
 * C656: LandmarkResolver — handles non-combat landmark encounters.
 * Extracted from EncounterEngine to reduce monolith size.
 * Uses LandmarkContext interface to access engine state without tight coupling.
 */

import type { HeroEntity } from '../../hero/HeroEntity';
import type { OverworldEvent } from '../OverworldEvents';
import { SHRINE_MEDITATION_BUFF_DURATION, SHRINE_TITHE_RATE, CAVE_TREASURE_MIN, CAVE_TREASURE_MAX, SHRINE_MASTERY_THRESHOLD, SHRINE_MASTERY_MEDITATION_CHANCE, CAVE_TREASURE_CHANCE, SHRINE_BLESSING_DURATION } from './constants';

const SHRINE_HEAL_FRACTION = 0.4;

export interface LandmarkContext {
  rngChance: (rate: number) => boolean;
  rngInt: (bound: number) => number;
  shrineTithes: number;
  incrementShrineTithes: () => void;
  setShrineBuffRemaining: (v: number) => void;
  setShrineBlessingRemaining: (v: number) => void;
  setDarknessCursed: (v: boolean) => void;
  tryLearnSkill?: (hero: HeroEntity, events: OverworldEvent[]) => void;
}

export class LandmarkResolver {
  constructor(private ctx: LandmarkContext) {}

  resolveShrine(hero: HeroEntity, landmarkId: string, events: OverworldEvent[]): void {
    const meditationChance = this.ctx.shrineTithes >= SHRINE_MASTERY_THRESHOLD
      ? SHRINE_MASTERY_MEDITATION_CHANCE : 0.2;

    if (this.ctx.rngChance(meditationChance)) {
      hero.personality.adjust('pious', 3);
      hero.heal(hero.hpMax);
      hero.tickAge(0.5);
      this.ctx.setShrineBuffRemaining(SHRINE_MEDITATION_BUFF_DURATION);
      events.push({ type: 'meditation_done', landmarkId });
      events.push({ type: 'shrine_buff_granted', duration: SHRINE_MEDITATION_BUFF_DURATION });
    } else {
      const before = hero.hp;
      hero.heal(Math.floor(hero.hpMax * SHRINE_HEAL_FRACTION));
      const healed = hero.hp - before;
      events.push({ type: 'shrine_visited', landmarkId, healed });
      this.ctx.setDarknessCursed(false);
      this.ctx.setShrineBlessingRemaining(SHRINE_BLESSING_DURATION);
      this.ctx.tryLearnSkill?.(hero, events);
    }
    // Shrine tithe
    if (hero.gold > 0) {
      const titheGold = Math.max(1, Math.floor(hero.gold * SHRINE_TITHE_RATE));
      hero.gold -= titheGold;
      this.ctx.incrementShrineTithes();
    }
  }

  resolveCave(hero: HeroEntity, events: OverworldEvent[]): void {
    if (this.ctx.rngChance(CAVE_TREASURE_CHANCE)) {
      const treasureGold = CAVE_TREASURE_MIN + this.ctx.rngInt(CAVE_TREASURE_MAX - CAVE_TREASURE_MIN + 1);
      hero.gold += treasureGold;
      events.push({ type: 'lucky_treasure', gold: treasureGold });
    } else {
      const heroic = hero.personality.get('heroic');
      const merciful = hero.personality.get('merciful');
      if (heroic + merciful >= 0) {
        hero.personality.adjust('moral', 1);
        events.push({ type: 'moral_choice', choice: 'help_injured', dim: 'moral', delta: 1, nameKR: '부상자를 도와 영혼이 정화되었다' });
      } else {
        hero.personality.adjust('moral', -1);
        events.push({ type: 'moral_choice', choice: 'ignore_injured', dim: 'moral', delta: -1, nameKR: '부상자를 외면하여 영혼이 어두워졌다' });
      }
    }
  }
}
