/**
 * RiftLeaderboardBadge.test.tsx — C1085: RiftLeaderboardBadge Component Tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiftLeaderboardBadge } from '../RiftLeaderboardBadge';

describe('C1085 [ui]: RiftLeaderboardBadge Component Tests', () => {
  it('renders default tier D badge when highest depth is 0', () => {
    render(<RiftLeaderboardBadge highestDepth={0} />);

    const badge = screen.getByTestId('rift-leaderboard-badge');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-grade')).toBe('D');
    expect(badge.textContent).toContain('[심도 0층]');
    expect(badge.textContent).toContain('미답의 방랑자');
  });

  it('hides badge when hideZero is true and depth is 0', () => {
    const { container } = render(<RiftLeaderboardBadge highestDepth={0} hideZero />);
    expect(container.firstChild).toBeNull();
  });

  it('renders rank A badge for depth 10', () => {
    render(<RiftLeaderboardBadge highestDepth={10} />);

    const badge = screen.getByTestId('rift-leaderboard-badge');
    expect(badge.getAttribute('data-grade')).toBe('A');
    expect(badge.textContent).toContain('[심도 10층]');
    expect(badge.textContent).toContain('균열의 탐색자');
  });

  it('renders rank SS badge for depth 25', () => {
    render(<RiftLeaderboardBadge highestDepth={25} />);

    const badge = screen.getByTestId('rift-leaderboard-badge');
    expect(badge.getAttribute('data-grade')).toBe('SS');
    expect(badge.textContent).toContain('[심도 25층]');
    expect(badge.textContent).toContain('차원 절단자');
  });

  it('renders ZENITH badge for depth 50+', () => {
    render(<RiftLeaderboardBadge highestDepth={50} size="lg" />);

    const badge = screen.getByTestId('rift-leaderboard-badge');
    expect(badge.getAttribute('data-grade')).toBe('ZENITH');
    expect(badge.textContent).toContain('[심도 50층]');
    expect(badge.textContent).toContain('무극의 초월자');
  });

  it('correctly uses custom record when provided', () => {
    render(
      <RiftLeaderboardBadge
        record={{
          highestDepth: 100,
          totalGuardiansDefeated: 200,
          totalShardsHarvested: 10000,
          totalCrackStonesHarvested: 2000,
          totalGoldHarvested: 100000000,
          expeditionsCount: 20,
        }}
      />,
    );

    const badge = screen.getByTestId('rift-leaderboard-badge');
    expect(badge.getAttribute('data-grade')).toBe('ZENITH');
    expect(badge.textContent).toContain('[심도 100층]');
    expect(badge.textContent).toContain('영원의 파멸자');
  });
});
