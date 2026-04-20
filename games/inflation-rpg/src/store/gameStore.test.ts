import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_RUN, INITIAL_META } from './gameStore';

// Zustand store는 모듈 레벨 싱글턴 — 매 테스트 전 리셋
beforeEach(() => {
  useGameStore.setState({ screen: 'main-menu', run: INITIAL_RUN, meta: INITIAL_META });
});

describe('GameStore', () => {
  it('initial screen is main-menu', () => {
    expect(useGameStore.getState().screen).toBe('main-menu');
  });

  it('startRun: sets characterId, resets run, navigates to world-map', () => {
    useGameStore.getState().startRun('hwarang', false);
    const state = useGameStore.getState();
    expect(state.run.characterId).toBe('hwarang');
    expect(state.run.bp).toBe(30);
    expect(state.run.level).toBe(1);
    expect(state.screen).toBe('world-map');
  });

  it('encounterMonster: decrements BP by 1', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster();
    expect(useGameStore.getState().run.bp).toBe(29);
  });

  it('defeatRun normal: decrements BP by 2', () => {
    useGameStore.getState().startRun('hwarang', false);
    useGameStore.getState().encounterMonster(); // -1 = 29
    useGameStore.getState().defeatRun();        // -2 = 27
    expect(useGameStore.getState().run.bp).toBe(27);
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
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
    };
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
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
    };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('w1');
    expect(useGameStore.getState().meta.equippedItemIds).toContain('w1');
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
    const item = {
      id: 'w1', name: '검', slot: 'weapon' as const, rarity: 'common' as const,
      stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 100,
    };
    useGameStore.getState().addEquipment(item);
    useGameStore.getState().equipItem('w1');
    useGameStore.getState().sellEquipment('w1', 100);
    expect(useGameStore.getState().meta.equippedItemIds).not.toContain('w1');
  });
});
