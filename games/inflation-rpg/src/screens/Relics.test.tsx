import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Relics — Mythic tab', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        mythicSlotCap: 1,
        mythicOwned: ['tier1_charm'],
        mythicEquipped: [null, null, null, null, null],
      },
    }));
  });

  it('switches to Mythic tab and shows slot info', () => {
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    expect(screen.getByTestId('mythic-slot-info').textContent).toMatch(/1\/5/);
  });

  it('shows 4 locked slots when slotCap=1', () => {
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    expect(screen.getByTestId('mythic-slot-1-locked')).toBeDefined();
    expect(screen.getByTestId('mythic-slot-2-locked')).toBeDefined();
    expect(screen.getByTestId('mythic-slot-3-locked')).toBeDefined();
    expect(screen.getByTestId('mythic-slot-4-locked')).toBeDefined();
  });

  it('clicking 장착 on owned mythic equips into first empty slot', () => {
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    fireEvent.click(screen.getByTestId('mythic-equip-btn-tier1_charm'));
    expect(useGameStore.getState().meta.mythicEquipped[0]).toBe('tier1_charm');
  });

  it('clicking equipped slot calls unequip', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        mythicSlotCap: 1,
        mythicOwned: ['tier1_charm'],
        mythicEquipped: ['tier1_charm', null, null, null, null],
      },
    }));
    render(<Relics />);
    fireEvent.click(screen.getByText('Mythic'));
    fireEvent.click(screen.getByTestId('mythic-slot-0-equipped'));
    expect(useGameStore.getState().meta.mythicEquipped[0]).toBeNull();
  });
});
