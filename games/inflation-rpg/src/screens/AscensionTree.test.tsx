import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AscensionTree } from './AscensionTree';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

describe('AscensionTree', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'ascension',
      run: INITIAL_RUN,
      meta: {
        ...INITIAL_META,
        ascPoints: 10,
        ascTree: {
          hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
          dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
          mod_magnitude: 0, effect_proc: 0,
        },
      },
    });
  });

  it('AP 카운터 노출', () => {
    render(<AscensionTree />);
    expect(screen.getByTestId('asctree-ap').textContent).toContain('10');
  });

  it('10 노드 카드 렌더링', () => {
    render(<AscensionTree />);
    const ids = [
      'hp_pct', 'atk_pct', 'gold_drop', 'bp_start', 'sp_per_lvl',
      'dungeon_currency', 'crit_damage', 'asc_accel', 'mod_magnitude', 'effect_proc',
    ];
    for (const id of ids) {
      expect(screen.getByTestId(`asctree-node-${id}`)).toBeTruthy();
    }
  });

  it('강화 클릭 → 확인 → AP 차감 + lv 증가', () => {
    render(<AscensionTree />);
    fireEvent.click(screen.getByTestId('asctree-buy-hp_pct'));
    fireEvent.click(screen.getByTestId('asctree-confirm-hp_pct'));
    const state = useGameStore.getState();
    expect(state.meta.ascPoints).toBe(9);
    expect(state.meta.ascTree.hp_pct).toBe(1);
  });

  it('AP 부족 시 강화 버튼 비활성', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, ascPoints: 0 } }));
    render(<AscensionTree />);
    const btn = screen.getByTestId('asctree-buy-hp_pct') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('max lv 도달 시 MAX 표시 + 비활성', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, ascTree: { ...s.meta.ascTree, gold_drop: 5 } },
    }));
    render(<AscensionTree />);
    const btn = screen.getByTestId('asctree-buy-gold_drop') as HTMLButtonElement;
    expect(btn.textContent).toContain('MAX');
    expect(btn.disabled).toBe(true);
  });
});
