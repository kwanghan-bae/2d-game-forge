/**
 * PrimordialConstellationBadge.test.tsx — C1133: Component tests for PrimordialConstellationBadge.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrimordialConstellationBadge } from '../PrimordialConstellationBadge';
import { useGameStore, INITIAL_META } from '../../store/gameStore';

describe('C1133: PrimordialConstellationBadge Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      meta: {
        ...INITIAL_META,
        primordialRanks: {},
      },
    });
  });

  it('renders nothing when total primordial ranks are 0', () => {
    const { container } = render(<PrimordialConstellationBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders genesis_spark badge when player has 1 to 5 ranks', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        primordialRanks: { primordial_genesis: 3 },
      },
    }));

    render(<PrimordialConstellationBadge />);

    const badge = screen.getByTestId('primordial-constellation-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('창세의 불씨');
    expect(badge.textContent).toContain('[3/18]');
    expect(badge.textContent).toContain('🌱');
  });

  it('toggles tooltip on click showing omni-stat bonus and barrier info', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        primordialRanks: {
          primordial_genesis: 5,
          primordial_annihilation: 5,
          primordial_eternity: 5,
          primordial_singularity: 3,
        },
      },
    }));

    render(<PrimordialConstellationBadge />);

    const badge = screen.getByTestId('primordial-constellation-badge');
    expect(badge.textContent).toContain('태초의 절대 지배신');
    expect(badge.textContent).toContain('[18/18]');
    expect(badge.textContent).toContain('👑');

    // Click to open tooltip
    fireEvent.click(badge);

    const tooltip = screen.getByTestId('primordial-badge-tooltip');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toContain('원초적 태초 성좌 18랭크 공명 활성화');
    expect(tooltip.textContent).toContain('전투 개시 절대 성막: 3턴');
  });

  it('displays primordial_zenith tier styling for 12 to 17 ranks', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        primordialRanks: {
          primordial_genesis: 5,
          primordial_annihilation: 5,
          primordial_eternity: 3,
        },
      },
    }));

    render(<PrimordialConstellationBadge />);

    const badge = screen.getByTestId('primordial-constellation-badge');
    expect(badge.textContent).toContain('원초의 정점');
    expect(badge.textContent).toContain('[13/18]');
    expect(badge.textContent).toContain('🌌');
  });
});
