import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReforgeModal } from '../ReforgeModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import type { EquipmentInstance } from '../../types';

describe('C1034: ReforgeModal Component Tests', () => {
  const knife: EquipmentInstance = { instanceId: 'w-knife-1', baseId: 'w-knife', enhanceLv: 0, modifiers: [] };
  const sword: EquipmentInstance = { instanceId: 'w-sword-1', baseId: 'w-sword', enhanceLv: 0, modifiers: [] };

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 50000 },
      meta: {
        ...INITIAL_META,
        enhanceStones: 50,
        equippedItemIds: ['w-knife-1'],
        inventory: {
          weapons: [knife, sword],
          armors: [],
          accessories: [],
        },
      },
    });
  });

  it('renders ReforgeModal with header, resources, and close button', () => {
    const onClose = vi.fn();
    render(<ReforgeModal onClose={onClose} />);

    expect(screen.getByTestId('reforge-modal')).toBeDefined();
    expect(screen.getByText('전설의 대장간')).toBeDefined();
    expect(screen.getByText(/50,000 G/)).toBeDefined();
    expect(screen.getByText(/강화석 50개/)).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches between reforge and dismantle tabs', () => {
    render(<ReforgeModal onClose={() => {}} />);

    expect(screen.getByTestId('tab-reforge')).toBeDefined();
    expect(screen.getByTestId('tab-dismantle')).toBeDefined();

    // Click dismantle tab
    fireEvent.click(screen.getByTestId('tab-dismantle'));
    expect(screen.getByText('📦 미착용 장비 일괄 분해')).toBeDefined();

    // Click reforge tab
    fireEvent.click(screen.getByTestId('tab-reforge'));
    expect(screen.getByText('강화할 장비 선택:')).toBeDefined();
  });

  it('reforge button performs enhancement, deducts resources, and updates inventory', () => {
    // Mock Math.random to guarantee success without great success
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.1);

    render(<ReforgeModal onClose={() => {}} />);

    const reforgeBtn = screen.getByTestId('reforge-btn');
    expect(reforgeBtn).not.toBeDisabled();

    fireEvent.click(reforgeBtn);

    const state = useGameStore.getState();
    const updatedKnife = state.meta.inventory.weapons.find(w => w.instanceId === 'w-knife-1');
    expect(updatedKnife?.enhanceLv).toBeGreaterThan(0);
    expect(state.run.goldThisRun).toBeLessThan(50000);
    expect(state.meta.enhanceStones).toBeLessThan(50);

    expect(screen.getByTestId('reforge-feedback')).toBeDefined();
    mockRandom.mockRestore();
  });

  it('dismantle tab blocks equipped item but allows unequipped item dismantle', () => {
    render(<ReforgeModal onClose={() => {}} initialTab="dismantle" />);

    // Knife is equipped: button is disabled
    const knifeBtn = screen.getByTestId('dismantle-btn-w-knife-1');
    expect(knifeBtn).toBeDisabled();
    expect(knifeBtn.textContent).toBe('착용 중');

    // Sword is unequipped: button is enabled
    const swordBtn = screen.getByTestId('dismantle-btn-w-sword-1');
    expect(swordBtn).not.toBeDisabled();

    const goldBefore = useGameStore.getState().run.goldThisRun;
    const stonesBefore = useGameStore.getState().meta.enhanceStones;

    fireEvent.click(swordBtn);

    const state = useGameStore.getState();
    expect(state.meta.inventory.weapons.some(w => w.instanceId === 'w-sword-1')).toBe(false);
    expect(state.meta.enhanceStones).toBeGreaterThan(stonesBefore);
    expect(state.run.goldThisRun).toBeGreaterThan(goldBefore);
    expect(screen.getByTestId('reforge-feedback')).toBeDefined();
  });

  it('batch dismantles unequipped common gear', () => {
    render(<ReforgeModal onClose={() => {}} initialTab="dismantle" />);

    const batchBtn = screen.getByTestId('batch-dismantle-common');
    fireEvent.click(batchBtn);

    const state = useGameStore.getState();
    // Only w-knife-1 should remain because it was equipped
    expect(state.meta.inventory.weapons).toHaveLength(1);
    expect(state.meta.inventory.weapons[0].instanceId).toBe('w-knife-1');
  });
});
