import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { HallScreen } from '../HallScreen';
import type { HallEntry } from '../../data/hallTypes';

function mkEntry(id: string, opts: Partial<HallEntry> = {}): HallEntry {
  return {
    id,
    cycleId: id,
    heroName: `hero-${id}`,
    maxLevel: 1000,
    ageEnd: 50,
    cause: '자연사',
    realm: 'base',
    finishedAt: 1_000_000,
    ...opts,
  };
}

describe('Cycle 114 N3 — HallScreen', () => {
  beforeEach(() => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, hall: { entries: [] } } }));
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, hall: { entries: [] } } }));
  });

  it('빈 hall — placeholder 표시', () => {
    render(<HallScreen onClose={() => {}} />);
    expect(screen.getByTestId('hall-empty')).toBeTruthy();
  });

  it('5+ entries → top 5 by maxLevel 표시', () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      mkEntry(`e${i}`, { maxLevel: (i + 1) * 1000, heroName: `hero${i}` })
    );
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, hall: { entries } } }));

    render(<HallScreen onClose={() => {}} />);
    // 7 entries 있지만 top 5 만 표시
    expect(screen.getByTestId('hall-entry-0')).toBeTruthy();
    expect(screen.getByTestId('hall-entry-4')).toBeTruthy();
    expect(screen.queryByTestId('hall-entry-5')).toBeNull();
  });

  it('maxLevel desc — 가장 높은 레벨이 rank 1', () => {
    const entries = [
      mkEntry('low', { maxLevel: 100 }),
      mkEntry('high', { maxLevel: 5000 }),
      mkEntry('mid', { maxLevel: 1000 }),
    ];
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, hall: { entries } } }));

    render(<HallScreen onClose={() => {}} />);
    const rank1 = screen.getByTestId('hall-entry-0');
    expect(rank1.textContent).toContain('5,000');
  });

  it('sort axis 변경 — ageEnd 누르면 ageEnd desc', () => {
    const entries = [
      mkEntry('young', { maxLevel: 9999, ageEnd: 20 }),
      mkEntry('elder', { maxLevel: 100, ageEnd: 80 }),
    ];
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, hall: { entries } } }));

    render(<HallScreen onClose={() => {}} />);
    // default = maxLevel → young rank 1
    expect(screen.getByTestId('hall-entry-0').textContent).toContain('20세');

    fireEvent.click(screen.getByTestId('hall-sort-ageEnd'));
    // sorted by ageEnd → elder rank 1
    expect(screen.getByTestId('hall-entry-0').textContent).toContain('80세');
  });

  it('onClose 호출 — ✕ 버튼 click', () => {
    let closed = false;
    render(<HallScreen onClose={() => { closed = true; }} />);
    fireEvent.click(screen.getByTestId('hall-modal-close'));
    expect(closed).toBe(true);
  });
});
