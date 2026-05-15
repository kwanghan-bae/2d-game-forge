import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Relics from './Relics';
import { useGameStore } from '../store/gameStore';
import { EMPTY_RELIC_STACKS } from '../data/relics';

describe('Relics — 스택 유물 tab', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        relicStacks: { ...EMPTY_RELIC_STACKS },
        adsToday: 0,
        adsLastResetTs: Date.now(),
      },
    }));
  });

  it('renders 10 relic rows', () => {
    render(<Relics />);
    expect(screen.getByText(/전사의 깃발/)).toBeDefined();
    expect(screen.getByText(/도깨비 부적/)).toBeDefined();
    expect(screen.getByText(/명운의 깃털/)).toBeDefined();
    const rows = screen.getAllByTestId('relic-row');
    expect(rows).toHaveLength(10);
  });

  it('shows current stack count', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, relicStacks: { ...s.meta.relicStacks, warrior_banner: 7 } },
    }));
    render(<Relics />);
    expect(screen.getByText(/7 stack/)).toBeDefined();
  });

  it('disables 광고 보기 when relic at cap', () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, relicStacks: { ...s.meta.relicStacks, undead_coin: 1 } },
    }));
    render(<Relics />);
    // Find undead_coin row by its KR name and check that the button within is disabled
    const undeadRow = screen.getByText(/망자의 동전/).closest('[data-testid="relic-row"]') as HTMLElement;
    expect(undeadRow).toBeDefined();
    const btn = undeadRow.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows daily ad counter', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, adsToday: 12 } }));
    render(<Relics />);
    expect(screen.getByTestId('ad-counter').textContent).toMatch(/12\/30/);
  });
});
