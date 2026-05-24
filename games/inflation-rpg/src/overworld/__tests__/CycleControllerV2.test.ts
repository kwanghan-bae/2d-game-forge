import { describe, it, expect, beforeEach } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import { PERSONALITY_DIMS } from '../../hero/PersonalityState';
import { useGameStore } from '../../store/gameStore';
import type { NpcEntity } from '../../types';

describe('CycleControllerV2', () => {
  it('constructs without crashing', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    expect(ctrl.getHero().name.length).toBeGreaterThan(0);
    expect(ctrl.getHero().staggered).toBe(false);
  });

  it('getSeed() returns the input seed', () => {
    const ctrl = new CycleControllerV2({ seed: 12345, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    expect(ctrl.getSeed()).toBe(12345);
  });

  it('same seed produces same personality (determinism)', () => {
    const makeCtrl = (seed: number) => new CycleControllerV2({ seed, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const a = makeCtrl(77);
    const b = makeCtrl(77);
    const snapA = a.getHero().personality.snapshot();
    const snapB = b.getHero().personality.snapshot();
    expect(snapA).toEqual(snapB);
    // At least 2 dims must be non-zero (personality engaged)
    const nonZero = PERSONALITY_DIMS.filter(d => snapA[d] !== 0);
    expect(nonZero.length).toBeGreaterThanOrEqual(2);
  });

  it('handleArrival on enemy → at least one event emitted', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    expect(events.length).toBeGreaterThan(0);
  });

  it('finalize produces a CycleSaga with events recorded', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    for (let i = 0; i < 10; i++) {
      ctrl.handleArrival('enemy', `wolf_${i}`);
    }
    const saga = ctrl.finalize();
    expect(saga.hero.name.length).toBeGreaterThan(0);
    expect(saga.chapters.flatMap(c => c.events).length).toBeGreaterThan(0);
  });
});

describe('CycleControllerV2 chapter_transition', () => {
  it('emits chapter_transition when hero crosses 어린시절 → 청년기 boundary', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    // Hero starts at age 5 (어린시절). Each enemy arrival ticks actionCount,
    // advancing age. Run arrivals until the hero reaches 청년기 (age >= 15),
    // collecting all events.
    const collected: Array<ReturnType<typeof ctrl.handleArrival>[number]> = [];
    for (let i = 0; i < 300; i++) {
      const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
      collected.push(...evs);
      if (ctrl.getHero().chapter === '청년기' || ctrl.getHero().chapter !== '어린시절') break;
    }
    const transitions = collected.filter(e => e.type === 'chapter_transition');
    expect(transitions.length).toBeGreaterThanOrEqual(1);
    const first = transitions[0]!;
    if (first.type !== 'chapter_transition') throw new Error('narrowing'); // type-narrow
    expect(first.fromChapter).toBe('어린시절');
    expect(first.toChapter).toBe('청년기');
    expect(first.atAge).toBeGreaterThanOrEqual(15);
  });

  it('emits no chapter_transition when hero stays in 어린시절', () => {
    const ctrl = new CycleControllerV2({
      seed: 42,
      traits: [],
      heroHpMax: 100,
      heroAtkBase: 100000,
    });
    // Single arrival — age moves a small amount, chapter unchanged.
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    const transitions = events.filter(e => e.type === 'chapter_transition');
    expect(transitions).toHaveLength(0);
    expect(ctrl.getHero().chapter).toBe('어린시절');
  });
});

describe('CycleControllerV2 action-time aging', () => {
  it('handleArrival increments hero.actionCount and advances age', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const before = ctrl.getHero().actionCount;
    ctrl.handleArrival('enemy', 'wolf_1');
    const after = ctrl.getHero().actionCount;
    expect(after).toBe(before + 1);
  });

  it('crosses 어린시절 → 청년기 within 300 arrivals (action-time curve, target ~154)', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    let crossed = false;
    for (let i = 0; i < 300; i++) {
      const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
      if (evs.some(e => e.type === 'chapter_transition')) {
        crossed = true;
        break;
      }
    }
    expect(crossed).toBe(true);
    expect(ctrl.getHero().chapter).toBe('청년기');
  });

  it('staggered hero recovers next arrival', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    hero.staggered = true;
    hero.hp = 0;
    ctrl.handleArrival('enemy', 'wolf_1');
    expect(hero.staggered).toBe(false);
    expect(hero.hp).toBeGreaterThan(0);
  });

  it('staggered hero recovery emits chapter_transition if recovery tick crosses chapter boundary', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    // Bring hero to age 14 (last action before chapter boundary 어린→청년 at action ~154).
    // ageFromActions(153) = floor(5 + 65*153/1000) = floor(14.945) = 14
    hero.actionCount = 153;
    hero.age = 14;
    hero.chapter = '어린시절';
    // Now stagger and let recovery tick (154) cross the boundary.
    hero.staggered = true;
    hero.hp = 0;
    const evs = ctrl.handleArrival('enemy', 'wolf_1');
    const transitions = evs.filter(e => e.type === 'chapter_transition');
    expect(transitions.length).toBeGreaterThanOrEqual(1);
    const t = transitions[0]!;
    if (t.type !== 'chapter_transition') throw new Error('narrowing');
    expect(t.fromChapter).toBe('어린시절');
    expect(t.toChapter).toBe('청년기');
  });
});

describe('Cycle 1 F3 — handleArrival NPC dead path 회수', () => {
  // 각 test 전 store npc 슬레이트 초기화 (다른 테스트의 NPC leak 방지).
  beforeEach(() => {
    useGameStore.setState(s => ({ ...s, run: { ...s.run, npcs: [] } }));
  });

  function makeNpc(overrides: Partial<NpcEntity> = {}): NpcEntity {
    return {
      instanceId: 'npc_test_1',
      kind: 'mentor',
      nameKR: '테스트 멘토',
      emoji: '🧙',
      age: 50,
      ageRate: 1,
      isAlive: true,
      bornChapter: '어린시절',
      relationship: 50,
      zoneRealmId: 'base',
      personalityDim: 'pious',
      ...overrides,
    };
  }

  it('F3.7: npc_encounter 발화 시 recordToStore("npcEncounter") 호출됨', () => {
    // alive NPC 1 명 (mentor) 을 base realm 에 위치시킴.
    useGameStore.setState(s => ({
      ...s,
      run: { ...s.run, npcs: [makeNpc({ kind: 'mentor', zoneRealmId: 'base' })] },
    }));
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    ctrl.setCurrentRealmId('base');
    // chance(0.2) — 충분히 많은 arrival 을 시도해 거의 확실히 hit.
    let encounters = 0;
    for (let i = 0; i < 80; i++) {
      const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
      if (evs.some(e => e.type === 'npc_encounter')) encounters += 1;
    }
    expect(encounters).toBeGreaterThanOrEqual(1);
    const recent = ctrl.getRecentSagaEvents(200);
    const enc = recent.filter(e => e.type === 'npcEncounter');
    expect(enc.length).toBeGreaterThanOrEqual(1);
    // generator narrativeText 가 "N세" 패턴 포함
    expect(enc[0]!.narrativeText).toMatch(/\d+세/);
  });

  it('F3.8: npc_died 발화 시 recordToStore("npcDeath") 호출됨', () => {
    // mentor max age = 100. age 99 + ageRate 2 → 다음 tick 에 죽음.
    useGameStore.setState(s => ({
      ...s,
      run: { ...s.run, npcs: [makeNpc({ kind: 'mentor', age: 99, ageRate: 2, zoneRealmId: 'base' })] },
    }));
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    ctrl.setCurrentRealmId('base');
    const evs = ctrl.handleArrival('enemy', 'wolf_1');
    expect(evs.some(e => e.type === 'npc_died')).toBe(true);
    const recent = ctrl.getRecentSagaEvents(50);
    const deaths = recent.filter(e => e.type === 'npcDeath');
    expect(deaths.length).toBeGreaterThanOrEqual(1);
    expect(deaths[0]!.narrativeText).toMatch(/\d+세/);
  });

  it('F3.9: family_event (marriage / child_birth) 발화 시 recordToStore("familyEvent") 호출됨', () => {
    // 장년기 진입 시 50% chance 로 family spouse/child 가 spawn.
    // 여러 seed 시도 → 최소 한 번은 chance(0.5) hit.
    let familyHit = 0;
    let transitionsObserved = 0;
    const SEEDS = [42, 123, 777, 99, 256, 1024, 31337, 8192, 11, 13, 17, 23, 100, 200, 300, 400];
    for (const seed of SEEDS) {
      useGameStore.setState(s => ({ ...s, run: { ...s.run, npcs: [] } }));
      const ctrl = new CycleControllerV2({ seed, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
      ctrl.setCurrentRealmId('base');
      const hero = ctrl.getHero();
      // 청년기 → 장년기 boundary 직전. actionsForAge(30) ≈ 385.
      hero.chapter = '청년기';
      hero.age = 29;
      hero.actionCount = 380;
      for (let i = 0; i < 50; i++) {
        const evs = ctrl.handleArrival('enemy', `wolf_${i}`);
        if (evs.some(e => e.type === 'chapter_transition')) transitionsObserved += 1;
        if (evs.some(e => e.type === 'family_event')) familyHit += 1;
        if (familyHit >= 1) break;
      }
      if (familyHit >= 1) {
        const recent = ctrl.getRecentSagaEvents(200);
        const fam = recent.filter(e => e.type === 'familyEvent');
        expect(fam.length).toBeGreaterThanOrEqual(1);
        expect(fam[0]!.narrativeText).toMatch(/\d+세/);
        return;
      }
      // family 분기 진입 못한 경우 — chance(0.5) miss 였거나 transition 못 일어남.
      // 다음 seed 시도.
    }
    throw new Error(`F3.9 fail: ${SEEDS.length} seed × ${transitionsObserved} transitions, family chance 모두 miss`);
  });
});

describe("Cycle-11 C10-A — hero_died('자연사') emit at age cap", () => {
  // beforeEach 로 store npc 슬레이트 초기화 (다른 테스트 leak 방지).
  beforeEach(() => {
    useGameStore.setState(s => ({ ...s, run: { ...s.run, npcs: [] } }));
  });

  it('emits hero_died(cause=자연사) when hero crosses action 1000 → age 70', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    // Park hero at action 999 (age 69) so the next tickAge bumps actionCount
    // to 1000 → age 70 inside handleArrival → C10-A guard fires.
    hero.actionCount = 999;
    hero.age = 69;
    hero.chapter = '노년기';
    const evs = ctrl.handleArrival('enemy', 'wolf_natural_1');
    const deaths = evs.filter(e => e.type === 'hero_died');
    expect(deaths.length).toBe(1);
    const d = deaths[0]!;
    if (d.type !== 'hero_died') throw new Error('narrowing');
    expect(d.cause).toBe('자연사');
    // 자연사 emit 시 oldLevel === newLevel (B3 의 -10% 패널티는 '전사' 전용).
    expect(d.oldLevel).toBe(d.newLevel);
    expect(hero.staggered).toBe(true);
  });

  it("sets endCause = '자연사' on the controller so finalize records it explicitly", () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    hero.actionCount = 999;
    hero.age = 69;
    hero.chapter = '노년기';
    ctrl.handleArrival('enemy', 'wolf_natural_2');
    const saga = ctrl.finalize();
    expect(saga.hero.cause).toBe('자연사');
  });

  it("is idempotent — only one hero_died('자연사') fires across subsequent arrivals", () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    const hero = ctrl.getHero();
    hero.actionCount = 999;
    hero.age = 69;
    hero.chapter = '노년기';
    const collected: ReturnType<typeof ctrl.handleArrival> = [];
    for (let i = 0; i < 5; i++) {
      collected.push(...ctrl.handleArrival('enemy', `wolf_idem_${i}`));
    }
    const naturals = collected.filter(e => e.type === 'hero_died' && e.cause === '자연사');
    expect(naturals.length).toBe(1);
  });

  it("does not pre-empt a '전사' from EncounterEngine in the same arrival", () => {
    // Hero entering arrival at age 69 with a fatal encounter (1 HP, huge enemy
    // atk via 0 atkBase makes hero deal 1 damage → eHp never drops to 0 →
    // hero takeDamage repeatedly → stagger). '전사' wins; '자연사' must not
    // double-emit even though tickAge would push to 70 afterward.
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 1, heroAtkBase: 0 });
    const hero = ctrl.getHero();
    hero.actionCount = 999;
    hero.age = 69;
    hero.chapter = '노년기';
    hero.hp = 1;
    hero.hpMax = 1;
    const evs = ctrl.handleArrival('enemy', 'wolf_combat_69');
    const deaths = evs.filter(e => e.type === 'hero_died');
    expect(deaths.length).toBe(1);
    const d = deaths[0]!;
    if (d.type !== 'hero_died') throw new Error('narrowing');
    expect(d.cause).toBe('전사');
  });

  it('does not fire when hero.age < 70 (regression — normal arrivals unaffected)', () => {
    const ctrl = new CycleControllerV2({ seed: 42, traits: [], heroHpMax: 100, heroAtkBase: 100000 });
    // Hero still under 70 (fresh hero starts at age 5).
    const evs = ctrl.handleArrival('enemy', 'wolf_young');
    const naturals = evs.filter(e => e.type === 'hero_died' && e.cause === '자연사');
    expect(naturals.length).toBe(0);
  });
});
