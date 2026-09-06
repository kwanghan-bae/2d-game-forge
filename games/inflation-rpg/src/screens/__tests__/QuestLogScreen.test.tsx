import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestLogScreen } from '../QuestLogScreen';
import { useGameStore } from '../../store/gameStore';

describe('QuestLogScreen — C1019', () => {
  beforeEach(() => {
    useGameStore.setState({
      meta: {
        ...useGameStore.getState().meta,
        questsCompleted: [],
        questProgress: {},
        jpPerksOwned: { '': [] },
      },
    });
  });

  it('renders title, back button, and tabs', () => {
    const onBack = vi.fn();
    render(<QuestLogScreen onBack={onBack} />);
    expect(screen.getByTestId('quest-log-screen')).toBeInTheDocument();
    expect(screen.getByTestId('quest-log-back')).toBeInTheDocument();
    expect(screen.getByTestId('quest-tab-all')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quest-log-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows unlock guidance when quest_insight perk is not owned', () => {
    render(<QuestLogScreen onBack={() => {}} />);
    expect(screen.queryByTestId('quest-insight-header-badge')).not.toBeInTheDocument();
    expect(screen.getByText(/퀘스트 직감/)).toBeInTheDocument();
  });

  it('shows insight active badge and quest hint boxes when quest_insight is owned', () => {
    useGameStore.setState({
      meta: {
        ...useGameStore.getState().meta,
        jpPerksOwned: { '': ['quest_insight'] },
      },
    });

    render(<QuestLogScreen onBack={() => {}} />);
    expect(screen.getByTestId('quest-insight-header-badge')).toBeInTheDocument();

    // Check for at least one quest insight hint container
    const hintBoxes = screen.getAllByTestId(/^quest-insight-q-/);
    expect(hintBoxes.length).toBeGreaterThan(0);
    expect(hintBoxes[0].textContent).toContain('추천');
  });

  it('switches region tabs when clicked', () => {
    render(<QuestLogScreen onBack={() => {}} />);
    const plainsTab = screen.getByTestId('quest-tab-plains');
    fireEvent.click(plainsTab);
    expect(plainsTab).toBeInTheDocument();
  });
});
