import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EquipmentSetBadge, EquipmentSetSummaryPanel } from '../EquipmentSetBadge';

describe('C1028: EquipmentSetBadge & EquipmentSetSummaryPanel', () => {
  describe('EquipmentSetBadge', () => {
    it('renders null for item without a set', () => {
      const { container } = render(<EquipmentSetBadge baseId="w-knife" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders set badge for set item', () => {
      render(<EquipmentSetBadge baseId="w-bluedragon" />);
      const badge = screen.getByTestId('equipment-set-badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain('세트: 용의 위엄');
    });
  });

  describe('EquipmentSetSummaryPanel', () => {
    it('renders null when no equipped items belong to any set', () => {
      const { container } = render(<EquipmentSetSummaryPanel equippedBaseIds={['w-knife', 'a-padded']} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders 2-piece active bonus and 3-piece locked bonus for partial set', () => {
      render(<EquipmentSetSummaryPanel equippedBaseIds={['w-bluedragon', 'a-dragon']} />);
      const summary = screen.getByTestId('equipment-set-summary');
      expect(summary).toBeInTheDocument();
      expect(summary.textContent).toContain('용의 위엄');
      expect(summary.textContent).toContain('(2/3)');

      const active = screen.getByTestId('equipment-set-active-bonus');
      expect(active.textContent).toContain('용의 분노 (2P): 공격력 +15%');

      const inactive = screen.getByTestId('equipment-set-inactive-bonus');
      expect(inactive.textContent).toContain('용왕의 패기 (3P): 보스에게 입히는 피해 +20%');
    });

    it('renders full set with all active bonuses when 3 pieces are equipped', () => {
      render(<EquipmentSetSummaryPanel equippedBaseIds={['w-fairy', 'a-celestial', 'w-celestial-spear']} />);
      const summary = screen.getByTestId('equipment-set-summary');
      expect(summary).toBeInTheDocument();
      expect(summary.textContent).toContain('신비로운 선경');
      expect(summary.textContent).toContain('(3/3)');

      const activeBonuses = screen.getAllByTestId('equipment-set-active-bonus');
      expect(activeBonuses).toHaveLength(2);
      expect(activeBonuses[0]!.textContent).toContain('선녀의 가호 (2P): 최대 HP +20%');
      expect(activeBonuses[1]!.textContent).toContain('우화등선 (3P): 경험치 획득량 +25%');

      expect(screen.queryByTestId('equipment-set-inactive-bonus')).not.toBeInTheDocument();
    });
  });
});
