/**
 * GemCarvingModal.test.tsx — C1088: GemCarvingModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GemCarvingModal } from '../GemCarvingModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import type { EquipmentInstance } from '../../types';

describe('C1088 [ui]: GemCarvingModal Component Tests', () => {
  const dummyWeapon: EquipmentInstance = {
    instanceId: 'inst-weapon-1',
    baseId: 'w-sword-excalibur',
    enhanceLv: 10,
    modifiers: [],
  };

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 1000000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 300,
        crackStones: 50,
        equippedItemIds: ['inst-weapon-1'],
        inventory: {
          weapons: [dummyWeapon],
          armors: [],
          accessories: [],
        },
        carvedGems: [],
      },
    });
  });

  it('renders modal with title, currencies, 4 gem tabs, and close button', () => {
    const onClose = vi.fn();
    render(<GemCarvingModal onClose={onClose} />);

    expect(screen.getByTestId('gem-carving-modal')).toBeDefined();
    expect(screen.getByText(/천상 보옥 제련소/)).toBeDefined();
    expect(screen.getByText(/1,000,000G/)).toBeDefined();
    expect(screen.getByText(/300개/)).toBeDefined();
    expect(screen.getByText(/50개/)).toBeDefined();

    expect(screen.getByTestId('gem-tab-fire_ruby')).toBeDefined();
    expect(screen.getByTestId('gem-tab-water_sapphire')).toBeDefined();
    expect(screen.getByTestId('gem-tab-lightning_topaz')).toBeDefined();
    expect(screen.getByTestId('gem-tab-dark_amethyst')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-gem-modal-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches between gem tabs and updates details card', () => {
    render(<GemCarvingModal onClose={() => {}} />);

    const card = screen.getByTestId('gem-details-card');
    // Default Fire Ruby
    expect(card.textContent).toContain('홍련의 겁화석');

    // Click Water Sapphire
    fireEvent.click(screen.getByTestId('gem-tab-water_sapphire'));
    expect(card.textContent).toContain('창해의 빙정석');
  });

  it('carves a new normal gem, updates store resources and inventory', () => {
    render(<GemCarvingModal onClose={() => {}} />);

    const carveBtn = screen.getByTestId('carve-gem-btn');
    expect(carveBtn).not.toBeDisabled();
    fireEvent.click(carveBtn);

    // Feedback displayed
    const banner = screen.getByTestId('gem-feedback-banner');
    expect(banner.textContent).toContain('하급 제련에 성공');

    // Store state updated
    const state = useGameStore.getState();
    expect(state.meta.carvedGems).toHaveLength(1);
    expect(state.meta.carvedGems?.[0].type).toBe('fire_ruby');
    expect(state.meta.carvedGems?.[0].tier).toBe('normal');
    expect(state.meta.starlightShards).toBe(270); // 300 - 30
    expect(state.meta.crackStones).toBe(47);      // 50 - 3
    expect(state.run.goldThisRun).toBe(950000);   // 1M - 50k
  });

  it('upgrades existing gem from normal to rare tier', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        carvedGems: [{ type: 'fire_ruby', tier: 'normal' }],
      },
    }));

    render(<GemCarvingModal onClose={() => {}} />);

    const upgradeBtn = screen.getByTestId('upgrade-gem-btn');
    expect(upgradeBtn).toBeDefined();
    expect(upgradeBtn.textContent).toContain('[중급] 승급 제련');

    fireEvent.click(upgradeBtn);

    const state = useGameStore.getState();
    expect(state.meta.carvedGems?.[0].tier).toBe('rare');
    expect(state.meta.starlightShards).toBe(250); // 300 - 50
    expect(state.meta.crackStones).toBe(44);      // 50 - 6
  });

  it('sockets and unsockets carved gem on equipped item', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        carvedGems: [{ type: 'fire_ruby', tier: 'rare' }],
      },
    }));

    render(<GemCarvingModal onClose={() => {}} />);

    // Socket gem
    const socketBtn = screen.getByTestId('socket-gem-btn');
    fireEvent.click(socketBtn);

    let state = useGameStore.getState();
    const weapon = state.meta.inventory.weapons[0];
    expect(weapon.carvedGem?.type).toBe('fire_ruby');
    expect(weapon.carvedGem?.tier).toBe('rare');

    // Unsocket gem
    const unsocketBtn = screen.getByTestId('unsocket-gem-btn');
    expect(unsocketBtn).toBeDefined();
    fireEvent.click(unsocketBtn);

    state = useGameStore.getState();
    expect(state.meta.inventory.weapons[0].carvedGem).toBeUndefined();
  });
});
