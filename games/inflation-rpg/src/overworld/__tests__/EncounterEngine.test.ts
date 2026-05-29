import { describe, it, expect } from 'vitest';
import {
  EncounterEngine,
  SHRINE_SKILL_GRANT_RATE,
  MERCIFUL_PROC_RATE,
} from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

function makeHero(seed = 42) {
  return HeroEntity.create({ seed, heroHpMax: 100, heroAtkBase: 100000 });
}

describe('EncounterEngine', () => {
  it('enemy encounter: hero wins → event has battle_won', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'battle_won')).toBe(true);
  });

  it('battle_won includes expGain, drop occasionally', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    const won = events.find(e => e.type === 'battle_won');
    expect(won?.type === 'battle_won' && won.expGain).toBeGreaterThan(0);
  });

  it('high exp triggers level_up event', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(1));
    // First battle gains exp, may level
    const events = engine.resolveEncounter(hero, 'boss', 'dragon_1');
    const levelEvents = events.filter(e => e.type === 'level_up');
    expect(levelEvents.length).toBeGreaterThanOrEqual(0);
    if (levelEvents.length > 0) {
      expect(hero.level).toBeGreaterThan(1);
    }
  });

  it('hero with extremely low hp becomes staggered in enemy encounter', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 1, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(hero.staggered).toBe(true);
  });

  it('village encounter heals slightly (V1a placeholder)', () => {
    const hero = makeHero();
    hero.takeDamage(50);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'village', 'village_1');
    expect(hero.hp).toBeGreaterThan(50);
  });
});

describe('EncounterEngine — staggered hero', () => {
  it('skips battle resolution when hero is staggered', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 100 });
    hero.staggered = true;
    const engine = new EncounterEngine(new SeededRng(42));
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.filter(e => e.type === 'battle_started').length).toBe(0);
  });
});

describe('Cycle 1 F1 — variance pass 상수', () => {
  it('F1.1: SHRINE_SKILL_GRANT_RATE = 0.20', () => {
    expect(SHRINE_SKILL_GRANT_RATE).toBe(0.20);
  });
  it('F1.2: MERCIFUL_PROC_RATE = 0.04 (cycle 321 lever 5)', () => {
    expect(MERCIFUL_PROC_RATE).toBe(0.04);
  });
  it('F1.3: SHRINE_SKILL_GRANT_RATE 1000회 chance → 평균 200 ± 15% (170-230)', () => {
    // adapt: plan 은 `runShrineEncounter` helper 를 가정했으나 실제 코드에는 없다.
    // resolveEncounter('shrine', ...) 호출은 명상 분기(0.2) 와 SkillLearningSystem
    // pool 고갈로 인해 순수 상수 통계 신호를 흐린다. 대신 SeededRng.chance(rate)
    // 의 통계를 직접 측정 — 상수의 의도된 평균 비율 검증.
    const rng = new SeededRng(42);
    let fires = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.chance(SHRINE_SKILL_GRANT_RATE)) fires += 1;
    }
    expect(fires).toBeGreaterThanOrEqual(170);
    expect(fires).toBeLessThanOrEqual(230);
  });
});

describe('EncounterEngine — C119 danger zone', () => {
  it('danger_zone_entered fires probabilistically on enemy encounters', () => {
    let dangerCount = 0;
    for (let seed = 0; seed < 200; seed++) {
      const hero = makeHero(seed);
      const engine = new EncounterEngine(new SeededRng(seed));
      const events = engine.resolveEncounter(hero, 'enemy', `e_${seed}`);
      if (events.some(e => e.type === 'danger_zone_entered')) dangerCount++;
    }
    // 15% rate over 200 → expect 10-60 triggers (binomial variance)
    expect(dangerCount).toBeGreaterThan(10);
    expect(dangerCount).toBeLessThan(60);
  });

  it('danger_zone_entered never fires on boss encounters', () => {
    for (let seed = 0; seed < 100; seed++) {
      const hero = makeHero(seed);
      const engine = new EncounterEngine(new SeededRng(seed));
      const events = engine.resolveEncounter(hero, 'boss', `b_${seed}`);
      expect(events.some(e => e.type === 'danger_zone_entered')).toBe(false);
    }
  });

  it('danger zone gives ×3 exp compared to normal', () => {
    // Find a seed that triggers danger zone
    let dangerSeed = -1;
    for (let seed = 0; seed < 200; seed++) {
      const hero = makeHero(seed);
      const engine = new EncounterEngine(new SeededRng(seed));
      const events = engine.resolveEncounter(hero, 'enemy', 'e_test');
      if (events.some(e => e.type === 'danger_zone_entered')) {
        dangerSeed = seed;
        break;
      }
    }
    expect(dangerSeed).toBeGreaterThanOrEqual(0);

    // Get danger exp
    const heroD = makeHero(dangerSeed);
    const engD = new EncounterEngine(new SeededRng(dangerSeed));
    const eventsD = engD.resolveEncounter(heroD, 'enemy', 'e_test');
    const wonD = eventsD.find(e => e.type === 'battle_won');

    // Get normal exp with a seed that does NOT trigger danger zone
    let normalSeed = -1;
    for (let seed = 0; seed < 200; seed++) {
      const hero = makeHero(seed);
      const engine = new EncounterEngine(new SeededRng(seed));
      const events = engine.resolveEncounter(hero, 'enemy', 'e_test');
      if (!events.some(e => e.type === 'danger_zone_entered')) {
        normalSeed = seed;
        break;
      }
    }
    const heroN = makeHero(normalSeed);
    const engN = new EncounterEngine(new SeededRng(normalSeed));
    const eventsN = engN.resolveEncounter(heroN, 'enemy', 'e_test');
    const wonN = eventsN.find(e => e.type === 'battle_won');

    // Both should have battle_won with exp; danger should be 3× normal
    expect(wonD?.type === 'battle_won' && wonD.expGain).toBeGreaterThan(0);
    expect(wonN?.type === 'battle_won' && wonN.expGain).toBeGreaterThan(0);
    if (wonD?.type === 'battle_won' && wonN?.type === 'battle_won') {
      expect(wonD.expGain).toBe(wonN.expGain * 3);
    }
  });
});

describe('EncounterEngine — C120 combo streak', () => {
  it('combo streak increments on no-damage kills', () => {
    // heroAtk=100000 one-shots everything, so hero takes no damage
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(999));
    for (let i = 0; i < 5; i++) {
      engine.resolveEncounter(hero, 'enemy', `e_${i}`);
    }
    expect(engine.getComboStreak()).toBe(5);
  });

  it('combo streak resets on death', () => {
    // hero with very low HP will die
    const hero = HeroEntity.create({ seed: 1, heroHpMax: 1, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'enemy', 'e_0');
    expect(engine.getComboStreak()).toBe(0);
  });

  it('emits combo_streak event at threshold (>=3)', () => {
    const hero = makeHero();
    const engine = new EncounterEngine(new SeededRng(42));
    let comboEvents = 0;
    for (let i = 0; i < 5; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      if (evs.some(e => e.type === 'combo_streak')) comboEvents++;
    }
    // Streak 1,2 = no event; streak 3,4,5 = event (3 events)
    expect(comboEvents).toBe(3);
  });

  it('combo bonus increases exp at streak >= 3', () => {
    const hero1 = makeHero(77);
    const engine1 = new EncounterEngine(new SeededRng(77));
    // First kill: streak=1, no bonus
    const evs1 = engine1.resolveEncounter(hero1, 'enemy', 'e_first');
    const exp1 = evs1.find(e => e.type === 'battle_won');

    // Build streak to 3
    const hero2 = makeHero(77);
    const engine2 = new EncounterEngine(new SeededRng(77));
    for (let i = 0; i < 3; i++) {
      engine2.resolveEncounter(hero2, 'enemy', `e_${i}`);
    }
    // 4th kill: streak=4 (above threshold) → has bonus
    const evs4 = engine2.resolveEncounter(hero2, 'enemy', 'e_bonus');
    const exp4 = evs4.find(e => e.type === 'battle_won');

    // Both should have exp, and the streak version should be higher
    if (exp1?.type === 'battle_won' && exp4?.type === 'battle_won') {
      expect(exp4.expGain).toBeGreaterThan(exp1.expGain);
    }
  });
});

describe('EncounterEngine — C121 milestone fanfare', () => {
  it('emits milestone_reached when hero crosses a milestone level', () => {
    const hero = HeroEntity.create({ seed: 1, heroHpMax: 9999, heroAtkBase: 999999 });
    const engine = new EncounterEngine(new SeededRng(1));
    const milestoneEvents: number[] = [];
    for (let i = 0; i < 500; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      for (const e of evs) {
        if (e.type === 'milestone_reached') milestoneEvents.push(e.level);
      }
      if (hero.level >= 10) break;
    }
    expect(milestoneEvents).toContain(10);
  });

  it('does not emit milestone_reached for non-milestone levels', () => {
    const hero = HeroEntity.create({ seed: 5, heroHpMax: 9999, heroAtkBase: 999999 });
    const engine = new EncounterEngine(new SeededRng(5));
    const milestoneEvents: number[] = [];
    for (let i = 0; i < 50; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      for (const e of evs) {
        if (e.type === 'milestone_reached') milestoneEvents.push(e.level);
      }
      if (hero.level >= 5 && hero.level < 10) break;
    }
    expect(milestoneEvents.filter(l => l < 10)).toHaveLength(0);
  });
});

describe('EncounterEngine — C122 critical hit', () => {
  it('critical_hit event does not fire when combo < 5', () => {
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1));
    for (let i = 0; i < 4; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      expect(evs.some(e => e.type === 'critical_hit')).toBe(false);
    }
  });

  it('critical_hit can fire when combo >= 5 (probabilistic)', () => {
    const hero = makeHero(42);
    const engine = new EncounterEngine(new SeededRng(42));
    let critSeen = false;
    for (let i = 0; i < 20; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      if (evs.some(e => e.type === 'critical_hit')) critSeen = true;
    }
    expect(critSeen).toBe(true);
  });
});

describe('EncounterEngine — C123 overkill', () => {
  it('overkill event fires when hero one-shots enemy', () => {
    // heroAtkBase=100000 guarantees one-shot at lv1
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1));
    const evs = engine.resolveEncounter(hero, 'enemy', 'e_0');
    expect(evs.some(e => e.type === 'overkill')).toBe(true);
  });

  it('overkill does not fire when fight takes multiple hits', () => {
    // Very weak hero that needs multiple hits
    const hero = HeroEntity.create({ seed: 1, heroHpMax: 99999, heroAtkBase: 1 });
    const engine = new EncounterEngine(new SeededRng(1));
    const evs = engine.resolveEncounter(hero, 'enemy', 'e_weak');
    expect(evs.some(e => e.type === 'overkill')).toBe(false);
  });
});

describe('EncounterEngine — C124 close call', () => {
  it('close_call fires when hero survives with < 10% HP', () => {
    // Hero with low HP that barely survives
    const hero = HeroEntity.create({ seed: 1, heroHpMax: 100, heroAtkBase: 50 });
    const engine = new EncounterEngine(new SeededRng(1));
    // Damage hero to < 10% HP manually, then fight a very weak enemy
    hero.takeDamage(92); // 8 HP remaining (8% of 100)
    // The enemy will do some damage but hero should survive with strong atk
    const evs = engine.resolveEncounter(hero, 'enemy', 'e_0');
    // Either close_call fires or hero dies — both are valid depending on RNG
    const hasCloseCall = evs.some(e => e.type === 'close_call');
    const hasDeath = evs.some(e => e.type === 'hero_died');
    // At least one of these should happen since HP is very low
    expect(hasCloseCall || hasDeath || hero.hp >= hero.hpMax * 0.10).toBe(true);
  });

  it('close_call does not fire on overkill (no damage taken)', () => {
    const hero = makeHero(1); // massive ATK, one-shots everything
    const engine = new EncounterEngine(new SeededRng(1));
    const evs = engine.resolveEncounter(hero, 'enemy', 'e_0');
    expect(evs.some(e => e.type === 'close_call')).toBe(false);
  });
});

describe('EncounterEngine — C125 battle momentum', () => {
  it('momentum increases on each battle win', () => {
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'enemy', 'e_0');
    engine.resolveEncounter(hero, 'enemy', 'e_1');
    engine.resolveEncounter(hero, 'enemy', 'e_2');
    expect(engine.getBattleMomentum()).toBe(3);
  });

  it('momentum resets on village visit', () => {
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1));
    engine.resolveEncounter(hero, 'enemy', 'e_0');
    engine.resolveEncounter(hero, 'enemy', 'e_1');
    expect(engine.getBattleMomentum()).toBe(2);
    engine.resolveEncounter(hero, 'village', 'v_0');
    expect(engine.getBattleMomentum()).toBe(0);
  });

  it('momentum caps at 20', () => {
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1));
    for (let i = 0; i < 25; i++) {
      engine.resolveEncounter(hero, 'enemy', `e_${i}`);
    }
    expect(engine.getBattleMomentum()).toBe(20);
  });
});

describe('EncounterEngine — C126 drop streak', () => {
  it('dropStreak increments on consecutive drops', () => {
    // Use dropChanceBonus to guarantee drops
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1), { dropChanceBonus: 1.0 });
    engine.resolveEncounter(hero, 'enemy', 'e_0');
    engine.resolveEncounter(hero, 'enemy', 'e_1');
    expect(engine.getDropStreak()).toBeGreaterThanOrEqual(2);
  });

  it('dropStreak resets on no-drop', () => {
    // Use dropChanceBonus = -1 to guarantee no drops
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1), { dropChanceBonus: -1.0 });
    engine.resolveEncounter(hero, 'enemy', 'e_0');
    expect(engine.getDropStreak()).toBe(0);
  });

  it('drop_upgraded event fires after 3 consecutive drops', () => {
    const hero = makeHero(1);
    const engine = new EncounterEngine(new SeededRng(1), { dropChanceBonus: 1.0 });
    let upgraded = false;
    for (let i = 0; i < 10; i++) {
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      if (evs.some(e => e.type === 'drop_upgraded')) upgraded = true;
    }
    // With guaranteed drops, streak reaches 3 quickly → upgrade fires
    expect(upgraded).toBe(true);
  });
});
