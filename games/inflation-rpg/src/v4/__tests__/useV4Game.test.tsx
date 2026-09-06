import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialV4Save, persistV4Save } from '../save';
import { startFacilityTask } from '../domain';
import { V4MonetizationAdapter } from '../monetization';
import { useV4Game } from '../useV4Game';

function Harness({ monetization }: { monetization: V4MonetizationAdapter }) {
  const game = useV4Game(monetization);
  return (
    <>
      <div data-testid="offline-state">{game.offlineSummary ? 'ready' : 'pending'}</div>
      <div data-testid="spirit">{game.save.meta.currencies.spirit}</div>
      <button type="button" onClick={() => { void game.doubleOfflineReward(); }}>double</button>
    </>
  );
}

describe('useV4Game monetization actions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('applies an offline double reward only once when the button is clicked concurrently', async () => {
    const base = createInitialV4Save(88);
    base.lastProcessedAt = Date.now() - 60_000;
    base.updatedAt = base.lastProcessedAt;
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt;
    persistV4Save(started.save);

    let providerCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => {
        providerCalls += 1;
        await pending;
        return true;
      },
    }, null);
    render(<Harness monetization={monetization} />);
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByRole('button', { name: 'double' }));
    fireEvent.click(screen.getByRole('button', { name: 'double' }));
    await waitFor(() => expect(providerCalls).toBe(1));

    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByTestId('spirit')).toHaveTextContent('124'));
    expect(monetization.getAdsToday()).toBe(1);
  });
});
