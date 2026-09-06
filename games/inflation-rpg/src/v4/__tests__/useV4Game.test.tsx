import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialV4Save, persistV4Save, V4_RECOVERY_BACKUP_KEY, V4_SAVE_KEY } from '../save';
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

function RecoveryHarness() {
  const game = useV4Game();
  return (
    <>
      <div data-testid="storage-status">{game.storageStatus}</div>
      <button type="button" onClick={game.startFreshSave}>fresh</button>
    </>
  );
}

function RefreshHarness() {
  const game = useV4Game();
  return (
    <>
      <div data-testid="task-count">{Object.keys(game.save.meta.tasks).length}</div>
      <button type="button" onClick={game.refresh}>refresh</button>
    </>
  );
}

describe('useV4Game monetization actions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('applies an offline double reward only once when the button is clicked concurrently', async () => {
    const base = createInitialV4Save(88);
    const startedAt = Date.now() - 60_000;
    // Keep the fixture chronologically valid: a save cannot have been
    // processed before it was created.
    base.createdAt = startedAt;
    base.lastProcessedAt = startedAt;
    base.updatedAt = startedAt;
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
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

  it('does not request an ad when offline settlement has no positive currency reward', async () => {
    const base = createInitialV4Save(89);
    const startedAt = Date.now() - 60_000;
    base.createdAt = startedAt;
    base.lastProcessedAt = startedAt;
    base.updatedAt = startedAt;
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    started.save.meta.tasks[started.task.id].outputPreview = {};
    persistV4Save(started.save);

    let providerCalls = 0;
    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => { providerCalls += 1; return true; },
    }, null);
    render(<Harness monetization={monetization} />);
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'double' })); });

    expect(providerCalls).toBe(0);
    expect(screen.getByTestId('spirit')).toHaveTextContent('100');
  });
});

describe('useV4Game save recovery', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('does not overwrite an invalid save until the player explicitly starts fresh', async () => {
    const raw = JSON.stringify({ schemaVersion: 999, preserve: true });
    localStorage.setItem(V4_SAVE_KEY, raw);

    render(<RecoveryHarness />);
    expect(screen.getByTestId('storage-status')).toHaveTextContent('invalid');
    expect(localStorage.getItem(V4_SAVE_KEY)).toBe(raw);

    fireEvent.click(screen.getByRole('button', { name: 'fresh' }));
    await waitFor(() => expect(screen.getByTestId('storage-status')).toHaveTextContent('valid'));
    expect(localStorage.getItem(V4_RECOVERY_BACKUP_KEY)).toBe(raw);
    expect(JSON.parse(localStorage.getItem(V4_SAVE_KEY) ?? '{}').schemaVersion).toBe(1);
  });

  it('does not settle due work while the persisted save clock is in the future', async () => {
    const now = Date.now();
    const base = createInitialV4Save(103);
    base.createdAt = now - 60_000;
    base.lastProcessedAt = base.createdAt;
    base.updatedAt = now + 60 * 60 * 1000;
    const started = startFacilityTask(base, 'temple', now - 30_000);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = now - 1_000;
    persistV4Save(started.save);

    render(<RefreshHarness />);
    await waitFor(() => expect(screen.getByTestId('task-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('task-count')).toHaveTextContent('1');
  });
});
