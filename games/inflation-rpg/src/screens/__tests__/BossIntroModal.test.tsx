import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { BossIntroModal, type BossIntroCard } from '../BossIntroModal';

/**
 * Cycle 109 F2 — BossIntroModal integration tests (react testing-library).
 *
 * PRD §F2 invariants:
 *   - 3 cards render with tier labels (소량/중량/대량)
 *   - clicking card N → onResolve(N)
 *   - 8 초 timeout → onResolve(0) auto-fire
 *   - countdown text decrements per second
 *   - keyboard 1/2/3 selects respective card
 *   - resolved=true after first interaction → subsequent clicks ignored
 */

const SAMPLE_CARDS: BossIntroCard[] = [
  { id: 'atk_small', nameKR: '날카로운 결의', descKR: '공격력 +10%', tier: 'small' },
  { id: 'atk_mid',   nameKR: '전사의 광채',   descKR: '공격력 +25%', tier: 'mid'   },
  { id: 'atk_big',   nameKR: '파괴의 광휘',   descKR: '공격력 +50%', tier: 'big'   },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('BossIntroModal rendering', () => {
  it('renders 3 card buttons with tier labels', () => {
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={() => {}} />);
    expect(screen.getByTestId('boss-intro-card-0')).toBeTruthy();
    expect(screen.getByTestId('boss-intro-card-1')).toBeTruthy();
    expect(screen.getByTestId('boss-intro-card-2')).toBeTruthy();
    // Tier label text variants present.
    expect(screen.getByText(/소량/)).toBeTruthy();
    expect(screen.getByText(/중량/)).toBeTruthy();
    expect(screen.getByText(/대량/)).toBeTruthy();
  });

  it('countdown initially shows 8 seconds', () => {
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={() => {}} />);
    const cd = screen.getByTestId('boss-intro-countdown');
    expect(cd.textContent).toMatch(/8/);
  });

  it('card buttons carry the card id and tier as data attributes', () => {
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={() => {}} />);
    const card0 = screen.getByTestId('boss-intro-card-0');
    expect(card0.getAttribute('data-card-id')).toBe('atk_small');
    expect(card0.getAttribute('data-card-tier')).toBe('small');
  });
});

describe('BossIntroModal interaction', () => {
  it('clicking card idx=1 → onResolve(1)', () => {
    const onResolve = vi.fn();
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={onResolve} />);
    fireEvent.click(screen.getByTestId('boss-intro-card-1'));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith(1);
  });

  it('second click is ignored (resolved guard)', () => {
    const onResolve = vi.fn();
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={onResolve} />);
    fireEvent.click(screen.getByTestId('boss-intro-card-0'));
    fireEvent.click(screen.getByTestId('boss-intro-card-1'));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith(0);
  });

  it('countdown decrements every second', () => {
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={() => {}} />);
    const cd = screen.getByTestId('boss-intro-countdown');
    expect(cd.textContent).toMatch(/8/);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(cd.textContent).toMatch(/7/);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(cd.textContent).toMatch(/5/);
  });

  it('8s timeout → auto onResolve(0)', () => {
    const onResolve = vi.fn();
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={onResolve} />);
    expect(onResolve).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(8000); });
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith(0);
  });

  it('keyboard 1/2/3 selects respective card', () => {
    const onResolve = vi.fn();
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={onResolve} />);
    fireEvent.keyDown(window, { key: '2' });
    expect(onResolve).toHaveBeenCalledWith(1);
  });

  it('timeout does NOT fire after user already resolved', () => {
    const onResolve = vi.fn();
    render(<BossIntroModal cards={SAMPLE_CARDS} onResolve={onResolve} />);
    fireEvent.click(screen.getByTestId('boss-intro-card-2'));
    expect(onResolve).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(10000); });
    // Still only one call.
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith(2);
  });
});
