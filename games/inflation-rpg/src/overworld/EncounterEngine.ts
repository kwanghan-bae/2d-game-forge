import type { SeededRng } from '../cycle/SeededRng';
import type { HeroEntity } from '../hero/HeroEntity';
import type { LandmarkKind } from '../data/landmarks';
import type { OverworldEvent } from './OverworldEvents';
import { ENEMY_DROPS, BOSS_DROPS } from './dropTable';
import {
  enemyHpAtLevel,
  enemyAtkAtLevel,
  expGainForKill,
} from '../cycle/inflationCurve';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 2;
const ENEMY_EXP_BASE = 12;
const BOSS_EXP_BASE = 60;
const DROP_RATE = 0.3;

export class EncounterEngine {
  constructor(private readonly rng: SeededRng) {}

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      const enemyHp = enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : 1);
      const enemyAtk = enemyAtkAtLevel(ENEMY_BASE_ATK, hero.level, isBoss ? BOSS_ATK_MUL : 1);

      events.push({ type: 'battle_started', enemyId: landmarkId });

      // Auto-resolve battle: hero attacks for hero.atk per round, enemy retaliates
      let eHp = enemyHp;
      while (eHp > 0 && !hero.dead) {
        eHp -= hero.atk;
        if (eHp > 0) hero.takeDamage(enemyAtk);
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId });
        return events;
      }
      // Hero wins
      const expGain = expGainForKill(isBoss ? BOSS_EXP_BASE : ENEMY_EXP_BASE, hero.level);
      const dropOdds = isBoss ? 0.8 : DROP_RATE;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss) : null;
      if (dropId) hero.addEquipment(dropId);

      const { leveled } = hero.gainExp(expGain);
      hero.consumeBp(isBoss ? 3 : 1);

      events.push({ type: 'battle_won', enemyId: landmarkId, expGain, dropId });
      for (const newLv of leveled) {
        events.push({ type: 'level_up', from: newLv - 1, to: newLv });
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '자연사' });
      }
    } else if (kind === 'village') {
      const healAmount = Math.floor(hero.hpMax * 0.25);
      hero.heal(healAmount);
      hero.consumeBp(0); // village does not consume BP in V1a
    }
    // Other kinds (shrine, cave, market, ruin, exit, rival) are no-ops in V1a — V1b handles
    return events;
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss ? BOSS_DROPS : ENEMY_DROPS;
    return pool[this.rng.int(pool.length)].id;
  }
}
