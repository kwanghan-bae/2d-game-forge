import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { useGameStore, INITIAL_META } from '../store/gameStore';

// V1a — TUTORIAL_STEPS is empty; TutorialOverlay renders nothing in all cases.
describe('TutorialOverlay (V1a — no steps)', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      meta: { ...INITIAL_META, tutorialDone: false, tutorialStep: 0 },
    } as any);
  });

  it('renders nothing when TUTORIAL_STEPS is empty', () => {
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('renders nothing when tutorialDone', () => {
    useGameStore.setState({
      meta: { ...INITIAL_META, tutorialDone: true, tutorialStep: -1 },
    } as any);
    const { queryByTestId } = render(<TutorialOverlay />);
    expect(queryByTestId('tutorial-overlay')).toBeNull();
  });
});
