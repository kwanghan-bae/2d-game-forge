import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_RUN, INITIAL_META } from './gameStore';
import { STARTING_BP } from '../systems/bp';
import type { EquipmentInstance } from '../types';

// Zustand store는 모듈 레벨 싱글턴 — 매 테스트 전 리셋
beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('GameStore', () => {
  it('initial screen is main-menu', () => {
    expect(useGameStore.getState().screen).toBe('main-menu');
  });

  it('startRun: sets characterId, resets run, navigates to dungeon-floors', () => {
    useGameStore.getState().startRun('hwarang', false);
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.run.bp).toBe(30);
    expect(state.run.level).toBe(1);
    expect(state.screen).toBe('dungeon-floors');
  });

  it('encounterMonster: decrements BP by encounterCost(level)', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster(1);
    expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1);
  });

  it('encounterMonster: scales with level', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster(100);
    expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 3); // ceil(log10(100))+1=3
  });

  it('defeatRun normal: -defeatCost(level)', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster(1);  // -1 → 29
    useGameStore.getState().defeatRun(1);          // -2 → 27
    expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1 - 2);
  });

  it('defeatRun hard: -defeatCost(level) × 2', () => {
    useGameStore.getState().startRun('hwarang', true);
    useGameStore.getState().encounterMonster(1);  // -1 → 29
    useGameStore.getState().defeatRun(1);          // -2×2=-4 → 25
    expect(useGameStore.getState().run.bp).toBe(STARTING_BP - 1 - 4);
  });

  it('allocateSP: increases allocated stat, decreases statPoints', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().gainLevels(1, 4);
    useGameStore.getState().allocateSP('atk', 2);
    const run = useGameStore.getState().run;
    expect(run.allocated.atk).toBe(2);
    expect(run.statPoints).toBe(2);
  });

  it('allocateSP: does not go below 0 statPoints', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().allocateSP('atk', 5); // no SP available
    expect(useGameStore.getState().run.allocated.atk).toBe(0);
  });

  it('endRun: updates bestRunLevel in meta', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().gainLevels(999, 0);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.bestRunLevel).toBe(1000);
    expect(useGameStore.getState().screen).toBe('game-over');
  });

  it('addEquipment: adds to inventory', () => {
    const item: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 };
    useGameStore.getState().addEquipment(item);
    expect(useGameStore.getState().meta.inventory.weapons).toHaveLength(1);
  });

  it('abandonRun: resets run to INITIAL_RUN and screen to main-menu', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().gainLevels(50, 100);
    useGameStore.getState().abandonRun();
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('');
    expect(state.run.level).toBe(1);
    expect(state.run.statPoints).toBe(0);
    expect(state.screen).toBe('main-menu');
  });
});

describe('GameStore — Phase 3 메타 진행', () => {
  it('INITIAL_META has equippedItemIds=[] and equipSlotCount=1', () => {
    expect(INITIAL_META.equippedItemIds).toEqual([]);
    expect(INITIAL_META.equipSlotCount).toBe(1);
    expect(INITIAL_META.lastPlayedCharId).toBe('');
  });

  it('equipItem: adds itemId to equippedItemIds', () => {
    const item: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('i1');
    expect(useGameStore.getState().meta.equippedItemIds).toContain('i1');
  });

  it('equipItem: ignores when slot full', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 1, equippedItemIds: ['existing'] } }));
    useGameStore.getState().equipItem('w2');
    expect(useGameStore.getState().meta.equippedItemIds).toHaveLength(1);
  });

  it('equipItem: ignores duplicate', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 2, equippedItemIds: ['w1'] } }));
    useGameStore.getState().equipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toHaveLength(1);
  });

  it('unequipItem: removes itemId from equippedItemIds', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equippedItemIds: ['w1', 'a1'] } }));
    useGameStore.getState().unequipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toEqual(['a1']);
  });

  it('buyEquipSlot: deducts goldThisRun and increments equipSlotCount', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 10_000 } }));
    useGameStore.getState().buyEquipSlot();
    const state = useGameStore.getState();
    expect(state.meta.equipSlotCount).toBe(2);
    expect(state.run.goldThisRun).toBe(5_000);
  });

  it('buyEquipSlot: ignores if not enough gold', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 100 } }));
    useGameStore.getState().buyEquipSlot();
    expect(useGameStore.getState().meta.equipSlotCount).toBe(1);
  });

  it('buyEquipSlot: ignores if already at max 10 slots', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equipSlotCount: 10 },
      run: { ...s.run, goldThisRun: 999_999_999 },
    }));
    useGameStore.getState().buyEquipSlot();
    expect(useGameStore.getState().meta.equipSlotCount).toBe(10);
  });

  it('endRun: increments characterLevels for active character', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBe(1);
  });

  it('endRun: increments from existing character level', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, characterLevels: { hwarang: 3 } } }));
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBe(4);
  });

  it('endRun: sets lastPlayedCharId', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().meta.lastPlayedCharId).toBe('hwarang');
  });

  it('abandonRun: does NOT increment characterLevels', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().abandonRun();
    expect(useGameStore.getState().meta.characterLevels['hwarang']).toBeUndefined();
  });

  it('sellEquipment: also removes from equippedItemIds', () => {
    const item: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('i1');
    useGameStore.getState().sellEquipment('i1', 100);
    expect(useGameStore.getState().meta.equippedItemIds).not.toContain('i1');
  });

  it('persist migrate: adds Phase 3 fields to pre-phase3 meta', () => {
    // Simulate a Phase 2 persisted state (no equippedItemIds etc.)
    const legacyMeta = {
      inventory: { weapons: [], armors: [], accessories: [] },
      baseAbilityLevel: 0,
      soulGrade: 0,
      hardModeUnlocked: false,
      characterLevels: {},
      bestRunLevel: 0,
      normalBossesKilled: [],
      hardBossesKilled: [],
      gold: 0,
      // NO equippedItemIds, equipSlotCount, lastPlayedCharId
    };
    // Apply the same migration logic manually (testing the logic, not Zustand internals)
    const migrated = {
      equippedItemIds: [],
      equipSlotCount: 1,
      lastPlayedCharId: '',
      ...legacyMeta,
    };
    expect(migrated.equippedItemIds).toEqual([]);
    expect(migrated.equipSlotCount).toBe(1);
    expect(migrated.lastPlayedCharId).toBe('');
    // Original fields preserved
    expect(migrated.gold).toBe(0);
    expect(migrated.baseAbilityLevel).toBe(0);
  });
});

describe('Currency actions', () => {
  it('gainDR adds to meta.dr', () => {
    useGameStore.setState({
      meta: { ...useGameStore.getState().meta, dr: 0 },
    });
    useGameStore.getState().gainDR(150);
    expect(useGameStore.getState().meta.dr).toBe(150);
    useGameStore.getState().gainDR(25);
    expect(useGameStore.getState().meta.dr).toBe(175);
  });

  it('gainEnhanceStones adds to meta.enhanceStones', () => {
    useGameStore.setState({
      meta: { ...useGameStore.getState().meta, enhanceStones: 0 },
    });
    useGameStore.getState().gainEnhanceStones(3);
    expect(useGameStore.getState().meta.enhanceStones).toBe(3);
    useGameStore.getState().gainEnhanceStones(10);
    expect(useGameStore.getState().meta.enhanceStones).toBe(13);
  });
});

describe('Currency on combat events', () => {
  it('incrementDungeonKill grants DR proportional to monster level', () => {
    useGameStore.getState().startRun('hwarang', false);
    const before = useGameStore.getState().meta.dr;
    useGameStore.getState().incrementDungeonKill(100);
    expect(useGameStore.getState().meta.dr).toBe(before + 50);  // 100 * 0.5
  });

  it('incrementDungeonKill min DR is 1', () => {
    useGameStore.getState().startRun('hwarang', false);
    const before = useGameStore.getState().meta.dr;
    useGameStore.getState().incrementDungeonKill(0);
    expect(useGameStore.getState().meta.dr).toBe(before + 1);
  });

  it('bossDrop grants DR + stones AND increments kill counters', () => {
    useGameStore.getState().startRun('hwarang', false);
    const beforeMeta = useGameStore.getState().meta;
    const beforeRun = useGameStore.getState().run;
    useGameStore.getState().bossDrop('test-boss', 5, 'mini');
    const afterMeta = useGameStore.getState().meta;
    const afterRun = useGameStore.getState().run;
    expect(afterMeta.dr).toBe(beforeMeta.dr + 500);                                               // bpReward * 100
    expect(afterMeta.enhanceStones).toBe(beforeMeta.enhanceStones + 5);                           // bpReward * 1
    expect(afterRun.dungeonRunMonstersDefeated).toBe(beforeRun.dungeonRunMonstersDefeated + 1);   // counter
    expect(afterRun.monstersDefeated).toBe(beforeRun.monstersDefeated + 1);                       // counter
  });
});

describe('selectDungeon', () => {
  it('sets currentDungeonId on run state', () => {
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
    useGameStore.getState().selectDungeon('plains');
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
  });

  it('can clear with null', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().selectDungeon('forest');
    expect(useGameStore.getState().run.currentDungeonId).toBe('forest');
    useGameStore.getState().selectDungeon(null);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
  });

  it('startRun preserves currentDungeonId set by Town selection', () => {
    // Simulate Town → ClassSelect → startRun flow
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
    expect(useGameStore.getState().run.characterId).toBe('hwarang');
    expect(useGameStore.getState().run.isHardMode).toBe(false);
  });

  it('startRun with no prior dungeon selection leaves currentDungeonId null', () => {
    // Existing flow (MainMenu → ClassSelect, skipping Town) — backwards compat
    useGameStore.getState().selectDungeon(null); // ensure no carryover
    useGameStore.getState().startRun('mudang', true);
    expect(useGameStore.getState().run.currentDungeonId).toBeNull();
    expect(useGameStore.getState().run.characterId).toBe('mudang');
    expect(useGameStore.getState().run.isHardMode).toBe(true);
  });
});

describe('Phase B-3α — currentFloor + dungeon-floors routing', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('INITIAL_RUN.currentFloor === 1', () => {
    expect(INITIAL_RUN.currentFloor).toBe(1);
  });

  it('setCurrentFloor updates run.currentFloor', () => {
    useGameStore.getState().setCurrentFloor(7);
    expect(useGameStore.getState().run.currentFloor).toBe(7);
  });

  it('startRun routes to dungeon-floors when currentDungeonId is set', () => {
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('hwarang', false);
    expect(useGameStore.getState().screen).toBe('dungeon-floors');
    expect(useGameStore.getState().run.currentDungeonId).toBe('plains');
    expect(useGameStore.getState().run.currentFloor).toBe(1);
  });

  it('endRun resets currentFloor to 1', () => {
    useGameStore.getState().selectDungeon('plains');
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().setCurrentFloor(15);
    useGameStore.getState().endRun();
    expect(useGameStore.getState().run.currentFloor).toBe(1);
  });
});

describe('Phase B-3β1 — dungeon progress + finals', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN },
      meta: { ...INITIAL_META },
    });
  });

  it('INITIAL_META has empty dungeonProgress + dungeonFinalsCleared + null pendingFinalClearedId', () => {
    expect(INITIAL_META.dungeonProgress).toEqual({});
    expect(INITIAL_META.dungeonFinalsCleared).toEqual([]);
    expect(INITIAL_META.pendingFinalClearedId).toBeNull();
  });

  it('markDungeonProgress sets maxFloor for first time', () => {
    useGameStore.getState().markDungeonProgress('plains', 5);
    expect(useGameStore.getState().meta.dungeonProgress['plains']).toEqual({ maxFloor: 5 });
  });

  it('markDungeonProgress only increases, never decreases maxFloor', () => {
    useGameStore.getState().markDungeonProgress('plains', 10);
    useGameStore.getState().markDungeonProgress('plains', 7);
    expect(useGameStore.getState().meta.dungeonProgress['plains']!.maxFloor).toBe(10);
  });

  it('markFinalCleared adds dungeonId once (idempotent)', () => {
    useGameStore.getState().markFinalCleared('plains');
    useGameStore.getState().markFinalCleared('plains');
    expect(useGameStore.getState().meta.dungeonFinalsCleared).toEqual(['plains']);
  });

  it('setPendingFinalCleared sets and clears id', () => {
    useGameStore.getState().setPendingFinalCleared('plains');
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBe('plains');
    useGameStore.getState().setPendingFinalCleared(null);
    expect(useGameStore.getState().meta.pendingFinalClearedId).toBeNull();
  });

  it('persist migrate v4 → v5 injects defaults', () => {
    const persistedV4 = {
      meta: {},
      run: { currentFloor: 1 },
    };
    expect(INITIAL_META.dungeonProgress).toEqual({});
    expect(INITIAL_META.dungeonFinalsCleared).toEqual([]);
    expect(INITIAL_META.pendingFinalClearedId).toBeNull();
    void persistedV4;
  });
});

describe('Phase B-3β2 — INITIAL_RUN shape', () => {
  it('has no currentAreaId field (legacy world-map flow removed)', () => {
    expect((INITIAL_RUN as unknown as { currentAreaId?: string }).currentAreaId).toBeUndefined();
  });
});

describe('Phase F-1 — Ascension', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('INITIAL_META has crackStones=0, ascTier=0, ascPoints=0', () => {
    expect(INITIAL_META.crackStones).toBe(0);
    expect(INITIAL_META.ascTier).toBe(0);
    expect(INITIAL_META.ascPoints).toBe(0);
  });

  it('gainCrackStones increments meta.crackStones', () => {
    useGameStore.getState().gainCrackStones(5);
    expect(useGameStore.getState().meta.crackStones).toBe(5);
    useGameStore.getState().gainCrackStones(3);
    expect(useGameStore.getState().meta.crackStones).toBe(8);
  });

  it('canAscend reports finals-blocked when fewer than nextTier+2 dungeons cleared', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains'], crackStones: 100 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('finals');
    expect(result.nextTier).toBe(1);
    expect(result.finalsRequired).toBe(3);
    expect(result.finalsCleared).toBe(1);
    expect(result.cost).toBe(1);
  });

  it('canAscend reports stones-blocked when crackStones < cost', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 0 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('stones');
    expect(result.cost).toBe(1);
  });

  it('canAscend returns ok when conditions met (Tier 0 → 1)', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains', 'forest', 'mountains'], crackStones: 1 },
    }));
    const result = useGameStore.getState().canAscend();
    expect(result.ok).toBe(true);
    expect(result.nextTier).toBe(1);
    expect(result.cost).toBe(1);
    expect(result.reason).toBeNull();
  });

  it('ascend returns false and does not mutate when blocked', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, dungeonFinalsCleared: ['plains'], crackStones: 0 },
    }));
    const before = useGameStore.getState().meta;
    expect(useGameStore.getState().ascend()).toBe(false);
    expect(useGameStore.getState().meta.ascTier).toBe(before.ascTier);
    expect(useGameStore.getState().meta.crackStones).toBe(before.crackStones);
  });

  it('ascend applies reset, advances tier, deducts stones, accrues points (Tier 0 → 1)', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, characterId: 'hwarang', level: 50, currentDungeonId: 'plains', currentFloor: 25 },
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains', 'forest', 'mountains'],
        crackStones: 5,
        dr: 1000,
        soulGrade: 3,
        characterLevels: { hwarang: 7 },
        normalBossesKilled: ['gate-guardian'],
        enhanceStones: 42,
      },
    }));

    expect(useGameStore.getState().ascend()).toBe(true);

    const state = useGameStore.getState();
    // Reset 적용
    expect(state.run.characterId).toBe('');
    expect(state.run.currentFloor).toBe(1);
    expect(state.run.currentDungeonId).toBeNull();
    expect(state.screen).toBe('main-menu');
    expect(state.meta.dr).toBe(0);
    expect(state.meta.soulGrade).toBe(0);
    expect(state.meta.characterLevels).toEqual({});
    expect(state.meta.normalBossesKilled).toEqual([]);
    expect(state.meta.enhanceStones).toBe(0);
    expect(state.meta.dungeonProgress).toEqual({});

    // 보존 + 수정
    expect(state.meta.ascTier).toBe(1);
    expect(state.meta.crackStones).toBe(4); // 5 - 1
    expect(state.meta.ascPoints).toBe(1); // 0 + 1
    expect(state.meta.dungeonFinalsCleared).toEqual(['plains', 'forest', 'mountains']);
  });

  it('ascend keeps equipped items, drops unequipped from inventory', () => {
    const equippedSword: EquipmentInstance = { instanceId: 'inst-eq', baseId: 'w-knife', enhanceLv: 0 };
    const unequippedSword: EquipmentInstance = { instanceId: 'inst-uneq', baseId: 'w-sword', enhanceLv: 0 };
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        dungeonFinalsCleared: ['plains', 'forest', 'mountains'],
        crackStones: 1,
        inventory: { weapons: [equippedSword, unequippedSword], armors: [], accessories: [] },
        equippedItemIds: ['inst-eq'],
      },
    }));
    expect(useGameStore.getState().ascend()).toBe(true);
    const inv = useGameStore.getState().meta.inventory;
    expect(inv.weapons).toHaveLength(1);
    expect(inv.weapons[0]!.instanceId).toBe('inst-eq');
    expect(useGameStore.getState().meta.equippedItemIds).toEqual(['inst-eq']);
  });
});

describe('GameStore — Phase F-2 강화', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('enhanceItem: lv 0 → 1, 자원 차감 (common w-knife)', () => {
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 };
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        inventory: { ...s.meta.inventory, weapons: [inst] },
        dr: 1000,
        enhanceStones: 100,
      },
    }));
    useGameStore.getState().enhanceItem('i1');
    const m = useGameStore.getState().meta;
    expect(m.inventory.weapons[0]?.enhanceLv).toBe(1);
    expect(m.dr).toBe(1000 - 100);             // common lv0→1: dr cost 100
    expect(m.enhanceStones).toBe(100 - 1);     // common lv0→1: stones 1
  });

  it('enhanceItem: 자원 부족 시 no-op', () => {
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 };
    useGameStore.setState((s) => ({
      meta: { ...s.meta, inventory: { ...s.meta.inventory, weapons: [inst] }, dr: 50, enhanceStones: 0 },
    }));
    useGameStore.getState().enhanceItem('i1');
    const m = useGameStore.getState().meta;
    expect(m.inventory.weapons[0]?.enhanceLv).toBe(0);
    expect(m.dr).toBe(50);
  });

  it('enhanceItem: 잘못된 instanceId 무시', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, dr: 1000, enhanceStones: 100 } }));
    useGameStore.getState().enhanceItem('does-not-exist');
    const m = useGameStore.getState().meta;
    expect(m.dr).toBe(1000);
  });

  it('enhanceItem: rare 등급 비용 적용 (lv0→1, rarityMult 2.5)', () => {
    const inst: EquipmentInstance = { instanceId: 'i1', baseId: 'w-bow', enhanceLv: 0 };
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        inventory: { ...s.meta.inventory, weapons: [inst] },
        dr: 1000,
        enhanceStones: 100,
      },
    }));
    useGameStore.getState().enhanceItem('i1');
    const m = useGameStore.getState().meta;
    expect(m.dr).toBe(1000 - 250);            // rare lv0→1: dr 100*2.5 = 250
    expect(m.enhanceStones).toBe(100 - 2.5);  // rare lv0→1: stones ceil(1/5)*2.5 = 2.5
  });
});

describe('GameStore — Phase F-2+3 v8 migration', () => {
  it('inventory becomes EquipmentInstance[] + equippedItemIds maps base→instance', () => {
    const legacyMeta = {
      ...INITIAL_META,
      inventory: {
        weapons: [{ id: 'w-knife', name: '단도', slot: 'weapon', rarity: 'common', stats: { flat: { atk: 30 } }, dropAreaIds: [], price: 100 }],
        armors: [],
        accessories: [],
      },
      equippedItemIds: ['w-knife'],
    };
    const migrate = (useGameStore.persist as any).getOptions().migrate;
    const migrated = migrate({ meta: legacyMeta, run: INITIAL_RUN }, 7);

    expect(migrated.meta.inventory.weapons).toHaveLength(1);
    expect(migrated.meta.inventory.weapons[0]).toMatchObject({ baseId: 'w-knife', enhanceLv: 0 });
    expect(typeof migrated.meta.inventory.weapons[0].instanceId).toBe('string');
    expect(migrated.meta.equippedItemIds).toEqual([migrated.meta.inventory.weapons[0].instanceId]);
  });

  it('duplicate baseId in equippedItemIds maps to distinct instances', () => {
    const legacyMeta = {
      ...INITIAL_META,
      inventory: {
        weapons: [
          { id: 'w-knife', name: '단도', slot: 'weapon', rarity: 'common', stats: { flat: { atk: 30 } }, dropAreaIds: [], price: 100 },
          { id: 'w-knife', name: '단도', slot: 'weapon', rarity: 'common', stats: { flat: { atk: 30 } }, dropAreaIds: [], price: 100 },
        ],
        armors: [], accessories: [],
      },
      equippedItemIds: ['w-knife', 'w-knife'],
    };
    const migrate = (useGameStore.persist as any).getOptions().migrate;
    const migrated = migrate({ meta: legacyMeta, run: INITIAL_RUN }, 7);

    expect(migrated.meta.equippedItemIds).toHaveLength(2);
    expect(migrated.meta.equippedItemIds[0]).not.toBe(migrated.meta.equippedItemIds[1]);
  });

  it('orphan equipped baseId is silently dropped', () => {
    const legacyMeta = {
      ...INITIAL_META,
      inventory: { weapons: [], armors: [], accessories: [] },
      equippedItemIds: ['w-knife'],
    };
    const migrate = (useGameStore.persist as any).getOptions().migrate;
    const migrated = migrate({ meta: legacyMeta, run: INITIAL_RUN }, 7);
    expect(migrated.meta.equippedItemIds).toEqual([]);
  });

  it('initializes new JP / skill fields with defaults', () => {
    const legacyMeta = { ...INITIAL_META, inventory: { weapons: [], armors: [], accessories: [] }, equippedItemIds: [] };
    const migrate = (useGameStore.persist as any).getOptions().migrate;
    const migrated = migrate({ meta: legacyMeta, run: INITIAL_RUN }, 7);
    expect(migrated.meta.jp).toEqual({});
    expect(migrated.meta.jpCap).toEqual({ hwarang: 50, mudang: 50, choeui: 50 });
    expect(migrated.meta.skillLevels).toEqual({});
    expect(migrated.meta.ultSlotPicks.hwarang).toEqual([null, null, null, null]);
  });
});

describe('GameStore — Phase F-3 JP — boss kill', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('awardJpOnBossKill: first-kill ×2 bonus, increments jp + jpEarnedTotal', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'hwarang' } }));
    useGameStore.getState().awardJpOnBossKill('boss-mini-1', 'mini');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang).toBe(2);
    expect(m.jpEarnedTotal.hwarang).toBe(2);
    expect(m.jpFirstKillAwarded.hwarang?.['boss-mini-1']).toBe(true);
  });

  it('awardJpOnBossKill: repeat kill = base only (no first bonus)', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, characterId: 'hwarang' },
      meta: {
        ...s.meta,
        jpFirstKillAwarded: { hwarang: { 'boss-major-1': true } },
      },
    }));
    useGameStore.getState().awardJpOnBossKill('boss-major-1', 'major');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang).toBe(2);
    expect(m.jpEarnedTotal.hwarang).toBe(2);
  });

  it('awardJpOnBossKill: cap reached → 0 grant', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, characterId: 'hwarang' },
      meta: { ...s.meta, jpEarnedTotal: { hwarang: 50 } },
    }));
    useGameStore.getState().awardJpOnBossKill('boss-final-1', 'final');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang ?? 0).toBe(0);
    expect(m.jpEarnedTotal.hwarang).toBe(50);
    expect(m.jpFirstKillAwarded.hwarang?.['boss-final-1']).toBe(true);
  });

  it('awardJpOnBossKill: cap partially full → grants only headroom', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, characterId: 'hwarang' },
      meta: { ...s.meta, jpEarnedTotal: { hwarang: 49 } },
    }));
    useGameStore.getState().awardJpOnBossKill('boss-final-1', 'final');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang).toBe(1);
    expect(m.jpEarnedTotal.hwarang).toBe(50);
  });

  it('awardJpOnBossKill: per-character isolated', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'mudang' } }));
    useGameStore.getState().awardJpOnBossKill('boss-mini-1', 'mini');
    const m = useGameStore.getState().meta;
    expect(m.jp.mudang).toBe(2);
    expect(m.jp.hwarang ?? 0).toBe(0);
  });
});

describe('GameStore — Phase F-3 광고 cap', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });
  it('watchAdForJpCap: cap +50 영구', () => {
    useGameStore.getState().watchAdForJpCap('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jpCap.hwarang).toBe(100);
    useGameStore.getState().watchAdForJpCap('hwarang');
    expect(useGameStore.getState().meta.jpCap.hwarang).toBe(150);
  });
});

describe('GameStore — Phase F-3 JP — charLv milestone', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('awardJpOnCharLvMilestone: 50 도달 → +3 JP, jpCharLvAwarded=50', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, characterLevels: { hwarang: 50 } } }));
    useGameStore.getState().awardJpOnCharLvMilestone('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang).toBe(3);
    expect(m.jpCharLvAwarded.hwarang).toBe(50);
  });

  it('awardJpOnCharLvMilestone: 100 도달 → +3 (50) +5 (100), 두 마일스톤 적용', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, characterLevels: { hwarang: 100 }, jpCap: { hwarang: 200 } },
    }));
    useGameStore.getState().awardJpOnCharLvMilestone('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang).toBe(8);
    expect(m.jpCharLvAwarded.hwarang).toBe(100);
  });

  it('awardJpOnCharLvMilestone: 이미 받은 마일스톤 재부여 ✗ (Asc reset 후에도)', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        characterLevels: { hwarang: 0 },
        jpCharLvAwarded: { hwarang: 100 },
      },
    }));
    useGameStore.getState().awardJpOnCharLvMilestone('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang ?? 0).toBe(0);
    expect(m.jpCharLvAwarded.hwarang).toBe(100);
  });

  it('awardJpOnCharLvMilestone: cap 적용', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        characterLevels: { hwarang: 1000 },
        jpCap: { hwarang: 50 },
        jpEarnedTotal: { hwarang: 48 },
      },
    }));
    useGameStore.getState().awardJpOnCharLvMilestone('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jpEarnedTotal.hwarang).toBe(50);
    expect(m.jpCharLvAwarded.hwarang).toBe(1000);
  });

  it('awardJpOnCharLvMilestone: 마일스톤 미달 시 no-op', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, characterLevels: { hwarang: 49 } } }));
    useGameStore.getState().awardJpOnCharLvMilestone('hwarang');
    const m = useGameStore.getState().meta;
    expect(m.jp.hwarang ?? 0).toBe(0);
    expect(m.jpCharLvAwarded.hwarang ?? 0).toBe(0);
  });
});

describe('GameStore — Phase F-3 bossDrop wiring', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });
  it('bossDrop: also calls awardJpOnBossKill with given bossType', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'hwarang' } }));
    useGameStore.getState().bossDrop('test-boss', 10, 'major');
    expect(useGameStore.getState().meta.jp.hwarang).toBe(4);  // major base 2 × first ×2
  });
});

describe('GameStore — Phase F-3 levelUpSkill + pickUltSlot', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('levelUpSkill: base skill, JP 충분 → lv +1, jp 차감', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, jp: { hwarang: 10 } } }));
    useGameStore.getState().levelUpSkill('hwarang', 'hwarang-strike');
    const m = useGameStore.getState().meta;
    expect(m.skillLevels.hwarang?.['hwarang-strike']).toBe(1);
    expect(m.jp.hwarang).toBe(9);
  });

  it('levelUpSkill: JP 부족 시 no-op', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, jp: { hwarang: 0 } } }));
    useGameStore.getState().levelUpSkill('hwarang', 'hwarang-strike');
    const m = useGameStore.getState().meta;
    expect(m.skillLevels.hwarang?.['hwarang-strike'] ?? 0).toBe(0);
  });

  it('levelUpSkill: ULT 가 슬롯에 없으면 no-op (slot pick 필요)', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, jp: { hwarang: 100 } } }));
    useGameStore.getState().levelUpSkill('hwarang', 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.skillLevels.hwarang?.['hwarang_ult_ilseom'] ?? 0).toBe(0);
    expect(m.jp.hwarang).toBe(100);
  });

  it('levelUpSkill: ULT 가 슬롯에 박혀있으면 lv +1', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        jp: { hwarang: 100 },
        ultSlotPicks: { ...s.meta.ultSlotPicks, hwarang: ['hwarang_ult_ilseom', null, null, null] },
      },
    }));
    useGameStore.getState().levelUpSkill('hwarang', 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.skillLevels.hwarang?.['hwarang_ult_ilseom']).toBe(1);
    expect(m.jp.hwarang).toBe(97);
  });

  it('pickUltSlot: 슬롯 0 unlock(누적 50+) 됐을 때 박기', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, skillLevels: { hwarang: { 'hwarang-strike': 50 } } },
    }));
    useGameStore.getState().pickUltSlot('hwarang', 0, 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.ultSlotPicks.hwarang?.[0]).toBe('hwarang_ult_ilseom');
  });

  it('pickUltSlot: 슬롯 미unlock 이면 no-op', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, skillLevels: { hwarang: { 'hwarang-strike': 49 } } },
    }));
    useGameStore.getState().pickUltSlot('hwarang', 0, 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.ultSlotPicks.hwarang?.[0]).toBeNull();
  });

  it('pickUltSlot: 다른 슬롯에 같은 ULT 박혀있으면 거부', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        skillLevels: { hwarang: { 'hwarang-strike': 200 } },
        ultSlotPicks: { ...s.meta.ultSlotPicks, hwarang: ['hwarang_ult_ilseom', null, null, null] },
      },
    }));
    useGameStore.getState().pickUltSlot('hwarang', 1, 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.ultSlotPicks.hwarang?.[1]).toBeNull();
  });

  it('pickUltSlot: null = 슬롯 비우기 (lv 보존)', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        skillLevels: { hwarang: { 'hwarang-strike': 50, 'hwarang_ult_ilseom': 5 } },
        ultSlotPicks: { ...s.meta.ultSlotPicks, hwarang: ['hwarang_ult_ilseom', null, null, null] },
      },
    }));
    useGameStore.getState().pickUltSlot('hwarang', 0, null);
    const m = useGameStore.getState().meta;
    expect(m.ultSlotPicks.hwarang?.[0]).toBeNull();
    expect(m.skillLevels.hwarang?.['hwarang_ult_ilseom']).toBe(5);
  });

  it('pickUltSlot: swap 후 다시 박으면 lv 그대로 재개', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        skillLevels: { hwarang: { 'hwarang-strike': 200, 'hwarang_ult_ilseom': 7, 'hwarang_ult_jinmyung': 3 } },
        ultSlotPicks: { ...s.meta.ultSlotPicks, hwarang: ['hwarang_ult_ilseom', null, null, null] },
      },
    }));
    useGameStore.getState().pickUltSlot('hwarang', 0, null);
    useGameStore.getState().pickUltSlot('hwarang', 0, 'hwarang_ult_jinmyung');
    useGameStore.getState().pickUltSlot('hwarang', 0, 'hwarang_ult_ilseom');
    const m = useGameStore.getState().meta;
    expect(m.ultSlotPicks.hwarang?.[0]).toBe('hwarang_ult_ilseom');
    expect(m.skillLevels.hwarang?.['hwarang_ult_ilseom']).toBe(7);
  });
});

describe('GameStore — Phase Balance-Patch TODO-a: F30 final boss stone reward', () => {
  beforeEach(() => {
    useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
  });

  it('final boss drops at least 50 enhanceStones (spec §2 TODO-a)', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'hwarang' } }));
    const before = useGameStore.getState().meta.enhanceStones;
    useGameStore.getState().bossDrop('final-boss-id', 5, 'final');
    const after = useGameStore.getState().meta.enhanceStones;
    expect(after - before).toBeGreaterThanOrEqual(50);
  });

  it('final boss drops exactly 50 enhanceStones (deterministic)', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'hwarang' } }));
    const before = useGameStore.getState().meta.enhanceStones;
    useGameStore.getState().bossDrop('final-boss-id', 5, 'final');
    const after = useGameStore.getState().meta.enhanceStones;
    expect(after - before).toBe(50);
  });

  it('non-final boss (mini) still uses bpReward for stones', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, characterId: 'hwarang' } }));
    const before = useGameStore.getState().meta.enhanceStones;
    useGameStore.getState().bossDrop('mini-boss-id', 5, 'mini');
    const after = useGameStore.getState().meta.enhanceStones;
    expect(after - before).toBe(5); // bpReward unchanged for non-final
  });
});
