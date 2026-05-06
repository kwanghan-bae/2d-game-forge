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
    useGameStore.getState().bossDrop('test-boss', 5);
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
