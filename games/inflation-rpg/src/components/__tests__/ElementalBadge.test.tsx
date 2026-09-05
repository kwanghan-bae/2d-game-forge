import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ElementalBadge, AffinityMatchBanner } from '../ElementalBadge';

describe('C1040: ElementalBadge & AffinityMatchBanner Component Tests', () => {
  describe('ElementalBadge', () => {
    it('renders element with emoji and Korean text', () => {
      render(<ElementalBadge element="fire" />);
      const badge = screen.getByTestId('elemental-badge');
      expect(badge).toBeDefined();
      expect(badge.getAttribute('data-element')).toBe('fire');
      expect(badge.textContent).toContain('🔥');
      expect(badge.textContent).toContain('화(火)');
    });

    it('resolves element from weapon baseId', () => {
      render(<ElementalBadge baseId="w-bluedragon" />);
      const badge = screen.getByTestId('elemental-badge');
      expect(badge.getAttribute('data-element')).toBe('fire');
    });

    it('resolves element from enemyId', () => {
      render(<ElementalBadge enemyId="sea_serpent" />);
      const badge = screen.getByTestId('elemental-badge');
      expect(badge.getAttribute('data-element')).toBe('water');
      expect(badge.textContent).toContain('💧');
    });

    it('hides neutral element when hideNeutral is true', () => {
      const { container } = render(<ElementalBadge element="neutral" hideNeutral />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('AffinityMatchBanner', () => {
    it('renders WEAKNESS banner when attacker has elemental advantage', () => {
      render(<AffinityMatchBanner attackerElement="fire" defenderElement="lightning" />);
      const banner = screen.getByTestId('affinity-weakness');
      expect(banner).toBeDefined();
      expect(banner.textContent).toContain('WEAKNESS!');
      expect(banner.textContent).toContain('1.5x');
    });

    it('renders RESIST banner when attacker has elemental disadvantage', () => {
      render(<AffinityMatchBanner attackerElement="lightning" defenderElement="fire" />);
      const banner = screen.getByTestId('affinity-resistance');
      expect(banner).toBeDefined();
      expect(banner.textContent).toContain('RESIST');
      expect(banner.textContent).toContain('0.7x');
    });

    it('renders DARK CLASH banner when dark element is involved', () => {
      render(<AffinityMatchBanner attackerElement="dark" defenderElement="water" />);
      const banner = screen.getByTestId('affinity-dark-clash');
      expect(banner).toBeDefined();
      expect(banner.textContent).toContain('DARK CLASH!');
      expect(banner.textContent).toContain('1.25x');
    });

    it('renders nothing when matchup is neutral', () => {
      const { container } = render(<AffinityMatchBanner attackerElement="fire" defenderElement="fire" />);
      expect(container.firstChild).toBeNull();
    });
  });
});
