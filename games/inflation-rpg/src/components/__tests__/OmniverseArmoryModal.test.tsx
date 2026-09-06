/**
 * OmniverseArmoryModal.test.tsx — C1160: Component tests for OmniverseArmoryModal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OmniverseArmoryModal } from '../OmniverseArmoryModal';
import { PantheonRaidModal } from '../PantheonRaidModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1160: OmniverseArmoryModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: { ...INITIAL_RUN, goldThisRun: 0 },
      meta: {
        ...INITIAL_META,
        totalRebirths: 1,
        pantheonCrests: 0,
        pantheonClears: 0,
        forgedRegalia: [],
      },
    });
  });

  it('renders modal header, perks dashboard, and all 4 regalia cards', () => {
    render(<OmniverseArmoryModal onClose={() => {}} />);

    expect(screen.getByTestId('omniverse-armory-modal')).toBeDefined();
    expect(screen.getByTestId('armory-crests-count').textContent).toContain('문장: 0개 (0/4 주조)');
    expect(screen.getByTestId('regalia-perks-banner')).toBeDefined();

    expect(screen.getByTestId('regalia-card-ouroboros_chrono_blade')).toBeDefined();
    expect(screen.getByTestId('regalia-card-ymir_primordial_heart')).toBeDefined();
    expect(screen.getByTestId('regalia-card-nyx_void_eye')).toBeDefined();
    expect(screen.getByTestId('regalia-card-aion_singularity_aegis')).toBeDefined();
  });

  it('disables forging buttons when player has 0 pantheon crests', () => {
    render(<OmniverseArmoryModal onClose={() => {}} />);

    const bladeBtn = screen.getByTestId('forge-btn-ouroboros_chrono_blade') as HTMLButtonElement;
    expect(bladeBtn.disabled).toBe(true);
    expect(bladeBtn.textContent).toContain('문장 부족');
  });

  it('allows forging regalia when player has sufficient crests', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        pantheonCrests: 5,
        forgedRegalia: [],
      },
    }));

    render(<OmniverseArmoryModal onClose={() => {}} />);

    const bladeBtn = screen.getByTestId('forge-btn-ouroboros_chrono_blade') as HTMLButtonElement;
    expect(bladeBtn.disabled).toBe(false);
    expect(bladeBtn.textContent).toContain('보구 주조 (문장 5개)');

    fireEvent.click(bladeBtn);

    const state = useGameStore.getState();
    expect(state.meta.pantheonCrests).toBe(0);
    expect(state.meta.forgedRegalia).toContain('ouroboros_chrono_blade');

    // Button should now show forged complete and be disabled
    expect(bladeBtn.disabled).toBe(true);
    expect(bladeBtn.textContent).toContain('주조 완료');
  });

  it('updates perks dashboard values when regalia are forged', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        pantheonCrests: 10,
        forgedRegalia: ['ouroboros_chrono_blade', 'ymir_primordial_heart'],
      },
    }));

    render(<OmniverseArmoryModal onClose={() => {}} />);

    const perksBanner = screen.getByTestId('regalia-perks-banner');
    expect(perksBanner.textContent).toContain('+30%'); // DEF penetration
    expect(perksBanner.textContent).toContain('+1억 / +50만'); // Bonus HP & Barrier
  });

  it('closes when clicking close button or backdrop', () => {
    const onClose = vi.fn();
    render(<OmniverseArmoryModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('omniverse-armory-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens OmniverseArmoryModal from PantheonRaidModal', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        totalRebirths: 1,
      },
    }));

    render(<PantheonRaidModal onClose={() => {}} />);

    const openArmoryBtn = screen.getByTestId('open-armory-modal-btn');
    expect(openArmoryBtn).toBeDefined();

    expect(screen.queryByTestId('omniverse-armory-modal')).toBeNull();
    fireEvent.click(openArmoryBtn);

    expect(screen.getByTestId('omniverse-armory-modal')).toBeDefined();
  });
});
