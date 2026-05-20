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
import { SkillLearningSystem, isSkillMilestoneLevel } from '../hero/SkillLearningSystem';

const ENEMY_BASE_HP = 30;
const ENEMY_BASE_ATK = 8;
const BOSS_HP_MUL = 4;
const BOSS_ATK_MUL = 2;
const ENEMY_EXP_BASE = 12;
const BOSS_EXP_BASE = 60;
const DROP_RATE = 0.3;
const SHRINE_SKILL_GRANT_RATE = 0.4;
const SHRINE_HEAL_FRACTION = 0.4;

export class EncounterEngine {
  constructor(private readonly rng: SeededRng) {}

  resolveEncounter(hero: HeroEntity, kind: LandmarkKind, landmarkId: string): OverworldEvent[] {
    const events: OverworldEvent[] = [];
    if (kind === 'enemy' || kind === 'boss') {
      const isBoss = kind === 'boss';
      const enemyHp = enemyHpAtLevel(ENEMY_BASE_HP, hero.level, isBoss ? BOSS_HP_MUL : 1);
      const enemyAtk = enemyAtkAtLevel(ENEMY_BASE_ATK, hero.level, isBoss ? BOSS_ATK_MUL : 1);

      events.push({ type: 'battle_started', enemyId: landmarkId });

      let eHp = enemyHp;
      while (eHp > 0 && !hero.dead) {
        eHp -= hero.atk;
        if (eHp > 0) hero.takeDamage(enemyAtk);
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '전사', enemyId: landmarkId });
        return events;
      }
      const expGain = expGainForKill(isBoss ? BOSS_EXP_BASE : ENEMY_EXP_BASE, hero.level);
      const dropOdds = isBoss ? 0.8 : DROP_RATE;
      const dropId = this.rng.chance(dropOdds) ? this.rollDrop(isBoss) : null;
      if (dropId) hero.addEquipment(dropId);

      const { leveled } = hero.gainExp(expGain);
      hero.consumeBp(isBoss ? 3 : 1);

      events.push({ type: 'battle_won', enemyId: landmarkId, expGain, dropId });
      for (const newLv of leveled) {
        events.push({ type: 'level_up', from: newLv - 1, to: newLv });
        if (isSkillMilestoneLevel(newLv)) {
          const learn = SkillLearningSystem.tryLearn(hero, this.rng.int(1_000_000_000));
          if (learn) {
            events.push({ type: 'skill_learned', skillId: learn.skillId, skillNameKR: learn.skillNameKR, atkBefore: learn.atkBefore, atkAfter: learn.atkAfter });
          }
        }
      }
      if (hero.dead) {
        events.push({ type: 'hero_died', cause: '자연사' });
      }
    } else if (kind === 'village') {
      const healAmount = Math.floor(hero.hpMax * 0.25);
      hero.heal(healAmount);
      hero.consumeBp(0);
    } else if (kind === 'shrine') {
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
      hero.consumeBp(0);
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
      hero.consumeBp(0);
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
      hero.consumeBp(0);
    }
    return events;
  }

  private rollDrop(isBoss: boolean): string {
    const pool = isBoss ? BOSS_DROPS : ENEMY_DROPS;
    return pool[this.rng.int(pool.length)].id;
  }
}
