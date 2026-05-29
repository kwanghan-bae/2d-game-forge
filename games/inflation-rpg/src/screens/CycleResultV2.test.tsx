import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleResultV2 } from './CycleResultV2';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

vi.mock('./InflationCurveChart', () => ({
  InflationCurveChart: () => <div data-testid="mock-chart" />,
}));

describe('CycleResultV2 combat stats', () => {
  beforeEach(() => {
    useCycleStoreV2.setState({
      lastSaga: {
        cycleId: 'test-1',
        endedAtMs: Date.now(),
        hero: {
          name: '테스트 영웅',
          seed: 1,
          finalAge: 80,
          finalJob: '전사',
          finalLevel: 42,
          finalPersonality: { moral: 3, prudent: 2, heroic: 4, merciful: 1, pious: 2 },
          cause: '자연사',
        },
        chapters: [],
        highlightEvents: [],
      } as any,
      lastCycleStats: {
        kills: 55,
        bossKills: 3,
        drops: 12,
        maxLevel: 42,
        goldEarned: 1500,
      },
    });
  });

  it('displays combat stats panel when stats are available', () => {
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    const panel = screen.getByTestId('result-combat-stats');
    expect(panel.textContent).toContain('55');
    expect(panel.textContent).toContain('3');
    expect(panel.textContent).toContain('12');
    expect(panel.textContent).toContain('42');
    expect(panel.textContent).toContain('1500');
  });

  it('hides combat stats panel when stats are null', () => {
    useCycleStoreV2.setState({ lastCycleStats: null });
    render(<CycleResultV2 onBackToMenu={() => {}} />);
    expect(screen.queryByTestId('result-combat-stats')).toBeNull();
  });
});
