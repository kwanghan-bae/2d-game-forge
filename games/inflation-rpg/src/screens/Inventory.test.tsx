import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Inventory } from './Inventory';
import { useGameStore, INITIAL_RUN, INITIAL_META } from '../store/gameStore';
import type { Equipment } from '../types';

const sword: Equipment = {
  id: 'w-sword', name: '철검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};
const cloth: Equipment = {
  id: 'a-cloth', name: '베옷', slot: 'armor', rarity: 'common',
  stats: { flat: { def: 20 } }, dropAreaIds: [], price: 150,
};

beforeEach(() => {
  useGameStore.setState({
    screen: 'inventory',
    run: INITIAL_RUN,
    meta: {
      ...INITIAL_META,
      inventory: { weapons: [sword], armors: [cloth], accessories: [] },
      equipSlotCount: 1,
      equippedItemIds: [],
    },
  });
});

describe('Inventory — 기존 테스트', () => {
  it('shows weapon tab with item count', () => {
    render(<Inventory />);
    expect(screen.getByText(/무기.*1\/10/i)).toBeInTheDocument();
  });

  it('renders the sword item', () => {
    render(<Inventory />);
    expect(screen.getByText('철검')).toBeInTheDocument();
  });

  it('back button returns to previous screen', async () => {
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /뒤로/i }));
    expect(['main-menu', 'world-map']).toContain(useGameStore.getState().screen);
  });
});

describe('Inventory — 장착 슬롯', () => {
  it('shows equipped slot count label', () => {
    render(<Inventory />);
    expect(screen.getByText(/장착 슬롯.*0\/1/i)).toBeInTheDocument();
  });

  it('장착 button is enabled when slot available', () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    expect(equipBtn).not.toBeDisabled();
  });

  it('클릭 장착 → equippedItemIds에 추가', async () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    await userEvent.click(equipBtn!);
    expect(useGameStore.getState().meta.equippedItemIds).toContain('w-sword');
  });

  it('해제 button appears after equipping', async () => {
    render(<Inventory />);
    const equipBtn = screen.getAllByRole('button', { name: /장착/i })[0];
    await userEvent.click(equipBtn!);
    expect(screen.getByRole('button', { name: /해제/i })).toBeInTheDocument();
  });

  it('클릭 해제 → equippedItemIds에서 제거', async () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equippedItemIds: ['w-sword'], equipSlotCount: 1 },
    }));
    render(<Inventory />);
    await userEvent.click(screen.getByRole('button', { name: /해제/i }));
    expect(useGameStore.getState().meta.equippedItemIds).not.toContain('w-sword');
  });

  it('장착 button disabled when slots full', async () => {
    useGameStore.setState((s) => ({
      meta: { ...s.meta, equippedItemIds: ['w-sword'], equipSlotCount: 1 },
    }));
    render(<Inventory />);
    // 방어구 탭으로 전환
    await userEvent.click(screen.getByRole('button', { name: /방어구/i }));
    const equipBtn = screen.queryByRole('button', { name: /^장착$/i });
    expect(equipBtn).toBeDisabled();
  });
});
