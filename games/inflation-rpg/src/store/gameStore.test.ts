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
});
