import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Shop } from './Shop';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({
    screen: 'shop',
    run: { ...INITIAL_RUN, characterId: 'hwarang', goldThisRun: 10_000 },
    meta: { ...INITIAL_META, equipSlotCount: 1 },
  });
});

describe('Shop — 현재 골드 표시', () => {
  it('displays goldThisRun as current gold', () => {
    render(<Shop />);
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });
});

describe('Shop — 슬롯 확장', () => {
  it('shows slot expansion button with price', () => {
    render(<Shop />);
    const slotBtn = screen.getByRole('button', { name: /슬롯 확장/i });
    expect(slotBtn).toBeInTheDocument();
    expect(slotBtn).toHaveTextContent('5,000G');
  });

  it('slot expansion button is disabled when not enough gold', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 100 } }));
    render(<Shop />);
    const slotBtn = screen.getByRole('button', { name: /슬롯 확장/i });
    expect(slotBtn).toBeDisabled();
  });

  it('buying slot increments equipSlotCount', async () => {
    render(<Shop />);
    await userEvent.click(screen.getByRole('button', { name: /슬롯 확장/i }));
    expect(useGameStore.getState().meta.equipSlotCount).toBe(2);
    expect(useGameStore.getState().run.goldThisRun).toBe(5_000);
  });

  it('hides slot expansion when at max 10 slots', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, equipSlotCount: 10 } }));
    render(<Shop />);
    expect(screen.queryByRole('button', { name: /슬롯 확장/i })).not.toBeInTheDocument();
  });
});

describe('Shop — 장비 구매', () => {
  it('장비 구매 button disabled when not enough goldThisRun', () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 0 } }));
    render(<Shop />);
    const buyBtns = screen.getAllByRole('button').filter(
      (b) => b.textContent?.match(/G$/) && !b.textContent?.includes('슬롯')
    );
    buyBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('구매 후 goldThisRun 차감 및 inventory 추가', async () => {
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: 1_000 } }));
    render(<Shop />);
    // 단도 (100G)
    const btn = screen.getByRole('button', { name: /100/i });
    await userEvent.click(btn);
    expect(useGameStore.getState().run.goldThisRun).toBe(900);
    expect(useGameStore.getState().meta.inventory.weapons.length).toBeGreaterThan(0);
  });
});
