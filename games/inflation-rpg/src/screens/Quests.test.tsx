import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Quests } from './Quests';
import { useGameStore } from '../store/gameStore';

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
});
