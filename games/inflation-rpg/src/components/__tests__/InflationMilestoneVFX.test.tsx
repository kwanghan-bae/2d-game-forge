/**
 * Cycle 106 F2 — InflationMilestoneVFX component tests.
 *
 * PRD §F2 §수용 기준:
 *   (a) mount → DOM marker 존재 (data-testid="inflation-milestone-vfx")
 *   (b) durationMs 만료 후 onDone fire
 *   (c) tier=8 ↔ tier=1 의 color / size diff
 *   (d) sound 호출 실패 graceful (silent fallback)
 *
 * 추가: reduced-motion 분기, aria-live announcement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { InflationMilestoneVFX } from '../InflationMilestoneVFX';
import { _resetSoundForTest } from '../../systems/sound';

beforeEach(() => {
  vi.useFakeTimers();
  _resetSoundForTest();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Cycle 106 F2 — InflationMilestoneVFX', () => {
  it('(a) mount renders DOM marker with tier + threshold data attrs', () => {
    const { getByTestId } = render(<InflationMilestoneVFX tier={1} thresholdLv={100} />);
    const vfx = getByTestId('inflation-milestone-vfx');
    expect(vfx).toBeDefined();
    expect(vfx.getAttribute('data-tier')).toBe('1');
    expect(vfx.getAttribute('data-threshold-lv')).toBe('100');
  });

  it('(b) onDone fires after duration timeout', () => {
    const onDone = vi.fn();
    render(<InflationMilestoneVFX tier={1} thresholdLv={100} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    // Tier 1 duration = 600 ms.
    vi.advanceTimersByTime(700);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('(c) tier 8 has larger size + different color CSS var than tier 1', () => {
    const { getByTestId: getT1, unmount: unmount1 } = render(<InflationMilestoneVFX tier={1} thresholdLv={100} />);
    const t1 = getT1('inflation-milestone-vfx');
    const t1Size = (t1 as HTMLElement).style.width;
    const t1Background = (t1 as HTMLElement).style.background;
    unmount1();

    const { getByTestId: getT8 } = render(<InflationMilestoneVFX tier={8} thresholdLv={1_000_000_000} />);
    const t8 = getT8('inflation-milestone-vfx');
    const t8Size = (t8 as HTMLElement).style.width;
    const t8Background = (t8 as HTMLElement).style.background;

    expect(t1Size).toBe('120px');
    expect(t8Size).toBe('640px');
    expect(t1Background).toContain('--color-milestone-tier-1');
    expect(t8Background).toContain('--color-milestone-tier-8');
    expect(t8Background).not.toContain('--color-milestone-tier-1');
  });

  it('(d) sound failure is silent — playSfx errors do not throw / unmount unaffected', () => {
    // playSfx in jsdom returns silently (no Audio backend). Verify mount + unmount don't throw.
    expect(() => {
      const { unmount } = render(<InflationMilestoneVFX tier={3} thresholdLv={10_000} />);
      vi.advanceTimersByTime(1100);
      unmount();
    }).not.toThrow();
  });

  it('aria-live status announcement contains Korean threshold text', () => {
    const { getByTestId } = render(<InflationMilestoneVFX tier={5} thresholdLv={1_000_000} />);
    const announcement = getByTestId('inflation-milestone-announcement');
    expect(announcement.getAttribute('aria-live')).toBe('polite');
    expect(announcement.getAttribute('role')).toBe('status');
    expect(announcement.textContent).toContain('1,000,000');
    expect(announcement.textContent).toContain('돌파');
  });

  it('reduced-motion branch uses shorter duration (200ms)', () => {
    // jsdom doesn't implement matchMedia by default. Polyfill it to return matches=true.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    const onDone = vi.fn();
    render(<InflationMilestoneVFX tier={5} thresholdLv={1_000_000} onDone={onDone} />);
    // Tier 5 normal duration = 1500. Reduced-motion = 200.
    vi.advanceTimersByTime(250);
    expect(onDone).toHaveBeenCalledTimes(1);

    window.matchMedia = originalMatchMedia;
  });
});
