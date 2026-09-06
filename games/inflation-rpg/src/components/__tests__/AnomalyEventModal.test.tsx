import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnomalyEventModal } from '../AnomalyEventModal';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../../store/gameStore';

describe('C1112: AnomalyEventModal Component Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: {
        ...INITIAL_META,
        starlightShards: 10,
      },
    });
  });

  it('renders modal with anomaly title, description, and close button', () => {
    const onClose = vi.fn();
    const onSelectTactic = vi.fn();

    render(
      <AnomalyEventModal
        anomalyType="chrono_surge"
        onSelectTactic={onSelectTactic}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('anomaly-event-modal')).toBeDefined();
    expect(screen.getByText(/차원 왜곡 이상 현상 감지!/)).toBeDefined();
    expect(screen.getByText(/시간 왜곡 \(Chrono Surge\)/)).toBeDefined();

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows selecting collapse tactic and passes guaranteed essence modifier', () => {
    const onSelectTactic = vi.fn();
    render(
      <AnomalyEventModal
        anomalyType="singularity_core"
        onSelectTactic={onSelectTactic}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('tactic-collapse-btn'));
    fireEvent.click(screen.getByTestId('confirm-tactic-btn'));

    expect(onSelectTactic).toHaveBeenCalledTimes(1);
    const [tactic, modifiers] = onSelectTactic.mock.calls[0];
    expect(tactic).toBe('collapse');
    expect(modifiers.guaranteedEssenceDrop).toBe(true);
    expect(modifiers.rewardsMultiplier).toBe(4.5);
  });

  it('deducts 5 starlight shards when stabilize tactic is confirmed', () => {
    const onSelectTactic = vi.fn();
    render(
      <AnomalyEventModal
        anomalyType="gravity_well"
        onSelectTactic={onSelectTactic}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('tactic-stabilize-btn'));
    fireEvent.click(screen.getByTestId('confirm-tactic-btn'));

    expect(onSelectTactic).toHaveBeenCalledTimes(1);
    const [tactic, modifiers] = onSelectTactic.mock.calls[0];
    expect(tactic).toBe('stabilize');
    expect(modifiers.heroAtkMultiplier).toBe(1.15);

    expect(useGameStore.getState().meta.starlightShards).toBe(5); // 10 - 5
  });

  it('disables confirm button when stabilize is selected but player lacks shards', () => {
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        starlightShards: 2, // < 5
      },
    }));

    render(
      <AnomalyEventModal
        anomalyType="gravity_well"
        onSelectTactic={() => {}}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('tactic-stabilize-btn'));
    expect(screen.getByTestId('confirm-tactic-btn')).toBeDisabled();
  });
});
