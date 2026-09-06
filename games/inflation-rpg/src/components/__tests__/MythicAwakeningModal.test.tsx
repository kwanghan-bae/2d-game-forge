/**
 * MythicAwakeningModal.test.tsx — C1094: MythicAwakeningModal Component Tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MythicAwakeningModal } from '../MythicAwakeningModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';
import type { EquipmentInstance } from '../../types';

describe('C1094 [ui]: MythicAwakeningModal Component Tests', () => {
  const dummyWeapon: EquipmentInstance = {
    instanceId: 'inst-weapon-mythic',
    baseId: 'w-sword-mythic-zenith',
    enhanceLv: 15,
    modifiers: [],
    mythicStars: 0,
  };

  const dummyArmor: EquipmentInstance = {
    instanceId: 'inst-armor-mythic',
    baseId: 'a-plate-celestial-aegis',
    enhanceLv: 15,
    modifiers: [],
    mythicStars: 2,
  };

  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: {
        ...INITIAL_RUN,
        goldThisRun: 1500000,
      },
      meta: {
        ...INITIAL_META,
        starlightShards: 400,
        crackStones: 80,
        equippedItemIds: ['inst-weapon-mythic', 'inst-armor-mythic'],
        inventory: {
          weapons: [dummyWeapon],
          armors: [dummyArmor],
          accessories: [],
        },
      },
    });
  });

  it('renders modal with title, currencies, resonance banner, and close button', () => {
    const onClose = vi.fn();
    render(<MythicAwakeningModal onClose={onClose} />);

    expect(screen.getByTestId('mythic-awakening-modal')).toBeDefined();
    expect(screen.getByText(/신화 장비 성운 각성/)).toBeDefined();
    expect(screen.getByText(/1,500,000G/)).toBeDefined();
    expect(screen.getByText(/400개/)).toBeDefined();
    expect(screen.getByText(/80개/)).toBeDefined();

    const banner = screen.getByTestId('resonance-banner');
    expect(banner.textContent).toContain('총 2성 각성');
    expect(banner.textContent).toContain('2성 공명: 원소 관통 +15%');

    fireEvent.click(screen.getByTestId('close-mythic-modal-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches between equipped items and displays star levels', () => {
    render(<MythicAwakeningModal onClose={() => {}} />);

    const weaponBtn = screen.getByTestId('mythic-item-inst-weapon-mythic');
    const armorBtn = screen.getByTestId('mythic-item-inst-armor-mythic');

    expect(weaponBtn).toBeDefined();
    expect(armorBtn).toBeDefined();

    // Select armor
    fireEvent.click(armorBtn);
    const card = screen.getByTestId('selected-equip-card');
    expect(card.textContent).toContain('a-plate-celestial-aegis');
    expect(card.textContent).toContain('(2성)');
  });

  it('executes star awakening, updates store resources and weapon stars', () => {
    render(<MythicAwakeningModal onClose={() => {}} />);

    const awakenBtn = screen.getByTestId('awaken-star-btn');
    expect(awakenBtn.textContent).toContain('1성 성운 각성 개시');

    fireEvent.click(awakenBtn);

    // Feedback message appears
    const feedback = screen.getByTestId('mythic-feedback-banner');
    expect(feedback.textContent).toContain('1성 성운');

    // Store state updated
    const state = useGameStore.getState();
    const weapon = state.meta.inventory.weapons[0];
    expect(weapon.mythicStars).toBe(1);
    expect(state.meta.starlightShards).toBe(360); // 400 - 40
    expect(state.meta.crackStones).toBe(75);      // 80 - 5
    expect(state.run.goldThisRun).toBe(1400000);  // 1.5M - 100k
  });

  it('displays maximum star completion message when item is 5 stars', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        inventory: {
          ...s.meta.inventory,
          weapons: [{ ...dummyWeapon, mythicStars: 5 }],
        },
      },
    }));

    render(<MythicAwakeningModal onClose={() => {}} />);

    const card = screen.getByTestId('selected-equip-card');
    expect(card.textContent).toContain('최고 성운 5성 각성을 완료');
    expect(screen.getByTestId('awaken-star-btn')).toBeDisabled();
  });
});
