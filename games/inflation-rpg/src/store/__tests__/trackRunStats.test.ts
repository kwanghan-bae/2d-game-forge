import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

describe('trackRunStats — run_stat quest progression', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, questProgress: {}, questsCompleted: [] },
    }));
  });

  it('completes burst quest when burstCount >= target', () => {
    useGameStore.getState().trackRunStats({ burstCount: 3 });
    const state = useGameStore.getState();
    expect(state.meta.questsCompleted).toContain('q-stat-burst-1');
  });

  it('does not complete burst quest when burstCount < target', () => {
    useGameStore.getState().trackRunStats({ burstCount: 2 });
    const state = useGameStore.getState();
    expect(state.meta.questsCompleted).not.toContain('q-stat-burst-1');
  });

  it('completes cashout quest when cashOutCount >= 3', () => {
    useGameStore.getState().trackRunStats({ cashOutCount: 5 });
    const state = useGameStore.getState();
    expect(state.meta.questsCompleted).toContain('q-stat-cashout-1');
  });

  it('completes overkill quest when overkills >= 10', () => {
    useGameStore.getState().trackRunStats({ overkills: 10 });
    const state = useGameStore.getState();
    expect(state.meta.questsCompleted).toContain('q-stat-overkill-1');
  });

  it('completes peakCombo quest when peakCombo >= 50', () => {
    useGameStore.getState().trackRunStats({ peakCombo: 55 });
    const state = useGameStore.getState();
    expect(state.meta.questsCompleted).toContain('q-stat-deathless-1');
  });

  it('does not double-complete already completed quest', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, questsCompleted: ['q-stat-burst-1'] },
    }));
    const goldBefore = useGameStore.getState().meta.gold;
    useGameStore.getState().trackRunStats({ burstCount: 10 });
    const goldAfter = useGameStore.getState().meta.gold;
    expect(goldAfter).toBe(goldBefore);
  });

  it('awards quest reward gold on completion', () => {
    const goldBefore = useGameStore.getState().meta.gold;
    useGameStore.getState().trackRunStats({ burstCount: 3 });
    const goldAfter = useGameStore.getState().meta.gold;
    // q-stat-burst-1 reward: 15000 gold
    expect(goldAfter - goldBefore).toBe(15000);
  });
});
