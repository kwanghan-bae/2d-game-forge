import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { useGameStore, INITIAL_META } from '../store/gameStore';

describe('TutorialOverlay', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      meta: { ...INITIAL_META, tutorialDone: false, tutorialStep: 0 },
    } as any);
  });

  it('renders step 1 on main-menu', () => {
    render(<TutorialOverlay />);
    expect(screen.getByText(/환영한다/)).toBeInTheDocument();
    expect(screen.getByText(/튜토리얼 1 \/ 7/)).toBeInTheDocument();
  });

  it('hides when tutorialDone', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, tutorialDone: true, tutorialStep: -1 },
    } as any);
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('hides when screen mismatches step.screen', () => {
    useGameStore.setState({ screen: 'inventory' } as any);
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('advance button increments step', () => {
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByText('시작'));
    expect(useGameStore.getState().meta.tutorialStep).toBe(1);
  });

  it('skip button sets done', () => {
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByText('건너뛰기'));
    expect(useGameStore.getState().meta.tutorialDone).toBe(true);
    expect(useGameStore.getState().meta.tutorialStep).toBe(-1);
  });
});
