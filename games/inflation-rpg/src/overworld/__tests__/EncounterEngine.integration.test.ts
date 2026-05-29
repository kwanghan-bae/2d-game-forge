import { describe, it, expect } from 'vitest';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';

/**
 * C127: Headless sim smoke test — runs 200 encounters to verify all C119-C126
 * mechanics interact without crash or degenerate behavior.
 */
describe('EncounterEngine — C127 headless sim smoke', () => {
  it('200 encounters produce valid event stream with all mechanic interactions', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 500, heroAtkBase: 200 });
    const engine = new EncounterEngine(new SeededRng(42));

    const stats = {
      battles: 0,
      dangerZones: 0,
      comboStreaks: 0,
      criticalHits: 0,
      overkills: 0,
      closeCalls: 0,
      milestones: 0,
      dropUpgrades: 0,
      deaths: 0,
      maxLevel: 1,
      maxMomentum: 0,
      maxCombo: 0,
    };

    for (let i = 0; i < 200; i++) {
      // Mix enemy/boss/village encounters
      const kind = i % 7 === 0 ? 'village' : i % 13 === 0 ? 'boss' : 'enemy';
      const evs = engine.resolveEncounter(hero, kind, `${kind}_${i}`);

      for (const e of evs) {
        switch (e.type) {
          case 'battle_won': stats.battles++; break;
          case 'danger_zone_entered': stats.dangerZones++; break;
          case 'combo_streak': stats.comboStreaks++; break;
          case 'critical_hit': stats.criticalHits++; break;
          case 'overkill': stats.overkills++; break;
          case 'close_call': stats.closeCalls++; break;
          case 'milestone_reached': stats.milestones++; break;
          case 'drop_upgraded': stats.dropUpgrades++; break;
          case 'hero_died': stats.deaths++; break;
        }
      }

      stats.maxLevel = Math.max(stats.maxLevel, hero.level);
      stats.maxMomentum = Math.max(stats.maxMomentum, engine.getBattleMomentum());
      stats.maxCombo = Math.max(stats.maxCombo, engine.getComboStreak());
    }

    // Sanity checks — mechanics should fire at reasonable rates
    expect(stats.battles).toBeGreaterThan(100); // most encounters are battles
    expect(stats.dangerZones).toBeGreaterThan(0); // 15% rate
    expect(stats.overkills).toBeGreaterThan(0); // hero is strong
    expect(stats.maxLevel).toBeGreaterThan(1); // hero should level up
    expect(stats.maxMomentum).toBeGreaterThan(0); // momentum should build
    expect(stats.maxCombo).toBeGreaterThan(0); // combo should build

    // No infinite loops or NaN values
    expect(hero.hp).toBeGreaterThanOrEqual(0);
    expect(hero.level).toBeGreaterThan(0);
    expect(Number.isFinite(hero.hp)).toBe(true);
    expect(Number.isFinite(hero.atk)).toBe(true);
  });

  it('50 cycles with weak hero exercises death/close-call/fate-roll paths', () => {
    const hero = HeroEntity.create({ seed: 7, heroHpMax: 30, heroAtkBase: 10 });
    const engine = new EncounterEngine(new SeededRng(7));

    let deaths = 0;
    let closeCalls = 0;
    let fateRolls = 0;

    for (let i = 0; i < 50; i++) {
      if (hero.staggered) break;
      const evs = engine.resolveEncounter(hero, 'enemy', `e_${i}`);
      for (const e of evs) {
        if (e.type === 'hero_died') deaths++;
        if (e.type === 'close_call') closeCalls++;
        if (e.type === 'fate_roll_required') fateRolls++;
      }
    }

    // Weak hero should eventually die, have close calls, or trigger fate roll
    expect(deaths + closeCalls + fateRolls).toBeGreaterThan(0);
  });
});
