/**
 * ZenithSanctuaryBadge.test.tsx — C1109: Zenith Sanctuary Badge Component Tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZenithSanctuaryBadge } from '../ZenithSanctuaryBadge';

describe('C1109: ZenithSanctuaryBadge Component Tests', () => {
  it('returns null when hideZero is true and no tiers are cleared', () => {
    const { container } = render(<ZenithSanctuaryBadge clearedTiers={[]} hideZero />);
    expect(container.firstChild).toBeNull();
  });

  it('renders default state when hideZero is false and no tiers are cleared', () => {
    render(<ZenithSanctuaryBadge clearedTiers={[]} hideZero={false} />);
    const badge = screen.getByTestId('zenith-sanctuary-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('시련 미개척');
    expect(badge.textContent).toContain('[0/3]');
  });

  it('renders Tier 1 title and count when 1 tier is cleared', () => {
    render(<ZenithSanctuaryBadge clearedTiers={[1]} />);
    const badge = screen.getByTestId('zenith-sanctuary-badge');
    expect(badge.textContent).toContain('여명의 개척자');
    expect(badge.textContent).toContain('[1/3]');
  });

  it('renders Tier 2 title and count when 2 tiers are cleared', () => {
    render(<ZenithSanctuaryBadge clearedTiers={[1, 2]} />);
    const badge = screen.getByTestId('zenith-sanctuary-badge');
    expect(badge.textContent).toContain('황혼의 정복자');
    expect(badge.textContent).toContain('[2/3]');
  });

  it('renders Tier 3 apex title and comprehensive tooltip when all 3 tiers are cleared', () => {
    render(<ZenithSanctuaryBadge clearedTiers={[1, 2, 3]} />);
    const badge = screen.getByTestId('zenith-sanctuary-badge');
    expect(badge.textContent).toContain('무극의 초월자');
    expect(badge.textContent).toContain('[3/3]');

    const titleAttr = badge.getAttribute('title');
    expect(titleAttr).toContain('무극 전승 성소 축복: 3/3단계');
    expect(titleAttr).toContain('전 능력치: +15%');
    expect(titleAttr).toContain('피해 경감: +9%');
    expect(titleAttr).toContain('치명 피해: +15%');
    expect(titleAttr).toContain('최종 피해: +10%');
    expect(titleAttr).toContain('방어 관통: +10%');
  });
});
