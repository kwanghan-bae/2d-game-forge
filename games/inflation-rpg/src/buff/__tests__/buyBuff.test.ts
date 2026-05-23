import { beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { useGameStore } from '../../store/gameStore';

describe('gameStore.buyBuff', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 0, buffLevels: {} },
      }));
    });
  });

  it('insufficient light → no-op + returns ok=false', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 50 } }));
    });
    let result: { ok: boolean; reason?: string } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 1); });
    expect(result?.ok).toBe(false);
    expect(useGameStore.getState().meta.light).toBe(50);
    expect(useGameStore.getState().meta.buffLevels?.move_speed ?? 0).toBe(0);
  });

  it('exact cost → deducts light + increments level', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 100 } }));
    });
    let result: { ok: boolean } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 1); });
    expect(result?.ok).toBe(true);
    expect(useGameStore.getState().meta.light).toBe(0);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(1);
  });

  it("count='max' buys as many as light allows", () => {
    act(() => {
      // 215 light = exactly 2 steps (100 + 115)
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 215 } }));
    });
    let result: { ok: boolean; count?: number } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('move_speed', 'max'); });
    expect(result?.ok).toBe(true);
    expect(result?.count).toBe(2);
    expect(useGameStore.getState().meta.light).toBe(0);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(2);
  });

  it('oneshot_rejuv via buyBuff is rejected (separate path)', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 9999 } }));
    });
    let result: { ok: boolean; reason?: string } | undefined;
    act(() => { result = useGameStore.getState().buyBuff('oneshot_rejuv', 1); });
    expect(result?.ok).toBe(false);
  });

  it('count=0 or negative → ok=false', () => {
    act(() => {
      useGameStore.setState(s => ({ ...s, meta: { ...s.meta, light: 1000 } }));
    });
    let r: { ok: boolean } | undefined;
    act(() => { r = useGameStore.getState().buyBuff('move_speed', 0 as 1); });
    expect(r?.ok).toBe(false);
  });

  it('preserves other meta fields', () => {
    act(() => {
      useGameStore.setState(s => ({
        ...s,
        meta: { ...s.meta, light: 100, gold: 5000, buffLevels: { drop_chance: 3 } },
      }));
    });
    act(() => { useGameStore.getState().buyBuff('move_speed', 1); });
    expect(useGameStore.getState().meta.gold).toBe(5000);
    expect(useGameStore.getState().meta.buffLevels?.drop_chance).toBe(3);
    expect(useGameStore.getState().meta.buffLevels?.move_speed).toBe(1);
  });
});
