import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quests } from './Quests';
import { useGameStore } from '../store/gameStore';
import { QUESTS } from '../data/quests';

describe('Quests', () => {
  beforeEach(() => {
    useGameStore.setState({
      meta: {
        ...useGameStore.getState().meta,
        questProgress: { 'q-plains-1': 100 },
        questsCompleted: [],
      },
    } as any);
  });

  it('renders quest title from data', () => {
    render(<Quests />);
    expect(screen.getByText('도깨비 사냥꾼')).toBeInTheDocument();
  });

  it('shows 보상 수령 button when target met', () => {
    render(<Quests />);
    expect(screen.getAllByText('보상 수령').length).toBeGreaterThan(0);
  });

  it('shows ✅ 완료 for completed quest', () => {
    useGameStore.setState({
      meta: {
        ...useGameStore.getState().meta,
        questProgress: { 'q-plains-1': 100 },
        questsCompleted: ['q-plains-1'],
      },
    } as any);
    render(<Quests />);
    expect(screen.getByText('✅ 완료')).toBeInTheDocument();
  });

  it('shows "재설계 예정" placeholder when in dungeon flow', () => {
    useGameStore.setState((s) => ({
      run: { ...s.run, currentDungeonId: 'plains' },
      meta: {
        ...s.meta,
        // Force a quest to be claimable in legacy flow so we can confirm the button is hidden.
        questProgress: { ...s.meta.questProgress, ...QUESTS.reduce((acc, q) => ({ ...acc, [q.id]: q.target.count }), {}) },
      },
    }));
    render(<Quests />);
    expect(screen.getAllByText(/재설계 예정/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /보상 수령/ })).toBeNull();
  });
});
