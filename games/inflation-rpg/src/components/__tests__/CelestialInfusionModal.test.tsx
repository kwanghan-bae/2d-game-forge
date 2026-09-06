import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CelestialInfusionModal } from '../CelestialInfusionModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import type { EquipmentInstance } from '../../types';

describe('C1117: CelestialInfusionModal Component Tests', () => {
  const mockWeapon: EquipmentInstance = {
    instanceId: 'test-wpn-1',
    baseId: 'w-sword-1',
    enhanceLv: 5,
    modifiers: [],
  };

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 100_000,
      },
      meta: {
        ...INITIAL_META,
        dimensionalEssence: 2,
        starlightShards: 50,
        inventory: {
          weapons: [mockWeapon],
          armors: [],
          accessories: [],
        },
      },
    });
  });

  it('renders modal with title, currencies, item list, affix cards, and close button', () => {
    const onClose = vi.fn();
    render(<CelestialInfusionModal onClose={onClose} />);

    expect(screen.getByTestId('celestial-infusion-modal')).toBeDefined();
    expect(screen.getByText(/차원 정수 천상 주입 \(Celestial Infusion\)/)).toBeDefined();
    expect(screen.getByText(/차원 정수: 2개/)).toBeDefined();
    expect(screen.getByTestId('affix-btn-celestial_sharpness')).toBeDefined();
    expect(screen.getByTestId('affix-btn-astral_fortitude')).toBeDefined();
    expect(screen.getByTestId('affix-btn-singularity_might')).toBeDefined();
    expect(screen.getByTestId('affix-btn-cosmic_celerity')).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes infusion successfully, deducts currencies, and updates inventory item', () => {
    render(<CelestialInfusionModal onClose={() => {}} />);

    // Select singularity_might
    fireEvent.click(screen.getByTestId('affix-btn-singularity_might'));

    const infuseBtn = screen.getByTestId('execute-infuse-btn');
    expect(infuseBtn).not.toBeDisabled();
    fireEvent.click(infuseBtn);

    // Feedback appears
    const feedback = screen.getByTestId('infusion-feedback');
    expect(feedback.textContent).toContain('특이점의 위력');
    expect(feedback.textContent).toContain('성공했습니다');

    // Store state updated
    const state = useGameStore.getState();
    expect(state.meta.dimensionalEssence).toBe(1); // 2 - 1
    expect(state.meta.starlightShards).toBe(30); // 50 - 20
    expect(state.run.goldThisRun).toBe(50_000); // 100k - 50k
    expect(state.meta.inventory.weapons[0].cosmicAffix).toBe('singularity_might');
  });

  it('disables infusion button when player lacks dimensional essence', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        dimensionalEssence: 0,
      },
    }));

    render(<CelestialInfusionModal onClose={() => {}} />);
    expect(screen.getByTestId('execute-infuse-btn')).toBeDisabled();
  });
});
