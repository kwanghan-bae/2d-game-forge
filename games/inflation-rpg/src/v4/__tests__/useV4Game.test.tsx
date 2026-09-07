import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialV4Save, persistV4Save, V4_RECOVERY_BACKUP_KEY, V4_SAVE_KEY } from '../save';
import { completeFacilityTasks, startExpedition, startFacilityTask } from '../domain';
import { V4MonetizationAdapter } from '../monetization';
import { useV4Game } from '../useV4Game';

const HOUR = 60 * 60 * 1000;

function Harness({ monetization }: { monetization: V4MonetizationAdapter }) {
  const game = useV4Game(monetization);
  return (
    <>
      <div data-testid="offline-state">{game.offlineSummary ? 'ready' : 'pending'}</div>
      <div data-testid="spirit">{game.save.meta.currencies.spirit}</div>
      <button type="button" onClick={() => { void game.doubleOfflineReward(); }}>double</button>
      <button type="button" onClick={game.settleOffline}>resume</button>
    </>
  );
}

function InstantTaskHarness({ monetization }: { monetization: V4MonetizationAdapter }) {
  const game = useV4Game(monetization);
  return (
    <>
      <div data-testid="instant-task-count">{Object.keys(game.save.meta.tasks).length}</div>
      <div data-testid="instant-spirit">{game.save.meta.currencies.spirit}</div>
      <div data-testid="intervention-charges">{game.save.run.interventionCharges}</div>
      <div data-testid="policy">{game.save.run.policy}</div>
      <div data-testid="muted">{game.save.meta.settings.muted ? 'true' : 'false'}</div>
      <div data-testid="message">{game.message ?? ''}</div>
      <button type="button" onClick={() => { void game.instantTask('temple'); }}>instant</button>
      <button type="button" onClick={game.refresh}>refresh</button>
      <button type="button" onClick={() => game.startTask('temple')}>start</button>
      <button type="button" onClick={() => { void game.addInterventionCharge(); }}>charge</button>
      <button type="button" onClick={() => game.changePolicy('training')}>policy</button>
      <button type="button" onClick={() => { game.changePolicy('training'); game.updateSettings({ muted: true }); }}>multi</button>
    </>
  );
}

function RestoreHarness({ monetization }: { monetization: V4MonetizationAdapter }) {
  const game = useV4Game(monetization);
  return (
    <>
      <div data-testid="ad-free-state">{game.adFree ? 'owned' : 'not-owned'}</div>
      <div data-testid="restore-message">{game.message ?? ''}</div>
      <button type="button" onClick={() => { void game.restorePurchases(); }}>restore</button>
    </>
  );
}

function RecoveryHarness() {
  const game = useV4Game();
  return (
    <>
      <div data-testid="storage-status">{game.storageStatus}</div>
      <div data-testid="recovery-spirit">{game.save.meta.currencies.spirit}</div>
      <button type="button" onClick={game.startFreshSave}>fresh</button>
      <button type="button" onClick={() => game.startTask('temple')}>task</button>
      <button type="button" onClick={game.settleOffline}>resume</button>
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

function ConfirmHarness() {
  const game = useV4Game();
  return (
    <>
      <div data-testid="confirm-message">{game.message ?? ''}</div>
      <button type="button" onClick={game.confirmRun}>confirm</button>
    </>
  );
}

describe('useV4Game monetization actions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('uses offline efficiency when settling work after a background resume', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(87);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistV4Save(started.save);

    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);
    vi.setSystemTime(11_000);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'resume' })); });

    expect(screen.getByTestId('spirit')).toHaveTextContent('112');
    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('shows a result when a sub-second offline window still completes work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(87);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistV4Save(started.save);
    vi.setSystemTime(10_002);

    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('shows a result when resume parks a risky boss at the exact watermark', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(88);
    base.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(base, 'deep_forest', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const expedition = started.save.run.expedition;
    if (!expedition) return;
    expedition.encounterIndex = 2;
    expedition.startedAt = base.createdAt;
    expedition.completesAt = base.createdAt + 1_000;
    started.save.lastProcessedAt = expedition.completesAt;
    started.save.updatedAt = expedition.completesAt;
    persistV4Save(started.save);
    vi.setSystemTime(expedition.completesAt);

    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('shows a result when offline settlement only upgrades existing equipment', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(113);
    base.run.hero.equipmentIds = ['v4_iron_sword'];
    base.run.hero.equipmentLevels = { v4_iron_sword: 1 };
    const started = startFacilityTask(base, 'blacksmith', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    started.save.meta.tasks[started.task.id].outputPreview = {};
    persistV4Save(started.save);
    vi.setSystemTime(10_002);

    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

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

  it('settles the initial offline state once under React StrictMode', async () => {
    const base = createInitialV4Save(90);
    const startedAt = Date.now() - 60_000;
    base.createdAt = startedAt;
    base.lastProcessedAt = startedAt;
    base.updatedAt = startedAt;
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistV4Save(started.save);

    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    render(
      <StrictMode>
        <Harness monetization={new V4MonetizationAdapter(null, null)} />
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();
  });

  it('does not persist or rerender when resume has no new offline work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    persistV4Save(createInitialV4Save(901));
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
    });

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('offline-state')).toHaveTextContent('pending');
    setItemSpy.mockRestore();
  });

  it('does not re-persist a risky boss that is already awaiting confirmation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(902);
    base.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(base, 'deep_forest', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.id = 'e2e-victory-4';
    const afterNormal = completeFacilityTasks(started.save, started.save.run.expedition!.completesAt);
    const afterElite = completeFacilityTasks(afterNormal, afterNormal.run.expedition!.completesAt);
    const pending = completeFacilityTasks(afterElite, afterElite.run.expedition!.completesAt, 0.7, false);
    expect(pending.run.expedition?.status).toBe('awaiting_confirmation');
    vi.setSystemTime(pending.lastProcessedAt);
    persistV4Save(pending);

    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    render(<Harness monetization={new V4MonetizationAdapter(null, null)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
    });

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('offline-state')).toHaveTextContent('pending');
    setItemSpy.mockRestore();
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

  it('only requests one instant-task ad when the same action is clicked concurrently', async () => {
    const base = createInitialV4Save(105);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
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
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    await waitFor(() => expect(providerCalls).toBe(1));

    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByTestId('instant-task-count')).toHaveTextContent('0'));
    expect(screen.getByTestId('instant-spirit')).toHaveTextContent('118');
    expect(monetization.getAdsToday()).toBe(1);
  });

  it('does not watch an ad when the requested facility has no active task', async () => {
    const showRewarded = vi.fn(async () => true);
    const monetization = new V4MonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('즉시 완료할 작업이 없습니다'));
    expect(showRewarded).not.toHaveBeenCalled();
  });

  it('only requests one intervention-charge ad when the same action is clicked concurrently', async () => {
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
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));
    fireEvent.click(screen.getByRole('button', { name: 'charge' }));
    await waitFor(() => expect(providerCalls).toBe(1));

    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByTestId('intervention-charges')).toHaveTextContent('2'));
    expect(monetization.getAdsToday()).toBe(1);
  });

  it('does not report a rewarded charge when the save clock is stale', async () => {
    const now = Date.now();
    const base = createInitialV4Save(91);
    base.createdAt = now - 60_000;
    base.lastProcessedAt = base.createdAt;
    base.updatedAt = now + HOUR;
    persistV4Save(base);

    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => true,
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('적용하지 않았습니다'));
    expect(screen.getByTestId('intervention-charges')).toHaveTextContent('1');
  });

  it('does not watch an ad when the intervention reserve is already full', async () => {
    const base = createInitialV4Save(125);
    base.run.interventionCharges = 3;
    persistV4Save(base);
    const showRewarded = vi.fn(async () => true);
    const monetization = new V4MonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('이미 가득 찼습니다'));
    expect(showRewarded).not.toHaveBeenCalled();
    expect(screen.getByTestId('intervention-charges')).toHaveTextContent('3');
  });

  it('preserves a newer policy change while an instant-task ad is pending', async () => {
    const base = createInitialV4Save(110);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistV4Save(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => {
        await pending;
        return true;
      },
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    await waitFor(() => expect(monetization.getAdsToday()).toBe(0));
    fireEvent.click(screen.getByRole('button', { name: 'policy' }));
    await waitFor(() => expect(screen.getByTestId('policy')).toHaveTextContent('training'));

    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByTestId('instant-task-count')).toHaveTextContent('0'));
    expect(screen.getByTestId('policy')).toHaveTextContent('training');
  });

  it('does not commit an instant task after the game unmounts while an ad is pending', async () => {
    const base = createInitialV4Save(111);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistV4Save(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => {
        await pending;
        return true;
      },
    }, null);
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    const { unmount } = render(<InstantTaskHarness monetization={monetization} />);
    await waitFor(() => expect(screen.getByTestId('instant-task-count')).toHaveTextContent('1'));
    setItemSpy.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    await waitFor(() => expect(monetization.getAdsToday()).toBe(0));
    unmount();

    await act(async () => { release(); });
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(V4_SAVE_KEY) ?? '{}').meta.tasks).toHaveProperty(started.task.id);
    setItemSpy.mockRestore();
  });

  it('does not instantly complete a replacement task after the original task finishes during an ad', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialV4Save(112);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistV4Save(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new V4MonetizationAdapter({
      showRewarded: async () => {
        await pending;
        return true;
      },
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'instant' }));
      await Promise.resolve();
    });
    expect(monetization.getAdsToday()).toBe(0);
    act(() => {
      vi.setSystemTime(10_002);
      fireEvent.click(screen.getByRole('button', { name: 'refresh' }));
    });
    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('0');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'start' })); });
    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('1');

    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('1');
    expect(screen.getByTestId('instant-spirit')).toHaveTextContent('118');
    expect(screen.getByTestId('message')).toHaveTextContent('작업 상태가 바뀌어');
  });

  it('preserves both same-event save mutations instead of applying the second to stale state', async () => {
    const monetization = new V4MonetizationAdapter(null, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'multi' }));

    await waitFor(() => expect(screen.getByTestId('policy')).toHaveTextContent('training'));
    expect(screen.getByTestId('muted')).toHaveTextContent('true');
  });

  it('refreshes the ad-free UI after a successful purchase restoration', async () => {
    const monetization = new V4MonetizationAdapter(null, null, null, async () => true);
    render(<RestoreHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'restore' }));

    await waitFor(() => expect(screen.getByTestId('ad-free-state')).toHaveTextContent('owned'));
    expect(screen.getByTestId('restore-message')).toHaveTextContent('광고 제거 구매를 복원했습니다.');
  });
});

describe('useV4Game save recovery', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('persists a newly created save even when the offline window is empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

    render(<RecoveryHarness />);

    expect(screen.getByTestId('storage-status')).toHaveTextContent('valid');
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();
  });

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

  it('continues offline settlement after recovery creates a fresh save', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    localStorage.setItem(V4_SAVE_KEY, JSON.stringify({ schemaVersion: 999, preserve: true }));

    render(<RecoveryHarness />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'fresh' })); });
    expect(screen.getByTestId('storage-status')).toHaveTextContent('valid');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'task' })); });
    vi.setSystemTime(50_000);

    act(() => { fireEvent.click(screen.getByRole('button', { name: 'resume' })); });

    expect(screen.getByTestId('recovery-spirit')).toHaveTextContent('112');
  });

  it('marks the session as unavailable when local persistence starts failing', async () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    render(<RecoveryHarness />);

    await waitFor(() => expect(screen.getByTestId('storage-status')).toHaveTextContent('unavailable'));
    expect(screen.getByTestId('recovery-spirit')).toHaveTextContent('100');
    setItem.mockRestore();
  });

  it('does not settle due work while the persisted save clock is in the future', async () => {
    const now = Date.now();
    const base = createInitialV4Save(103);
    base.createdAt = now - 60_000;
    base.lastProcessedAt = base.createdAt;
    base.updatedAt = now + 60 * 60 * 1000;
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.save.updatedAt + 1_000;
    persistV4Save(started.save);

    render(<RefreshHarness />);
    await waitFor(() => expect(screen.getByTestId('task-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('task-count')).toHaveTextContent('1');
  });

  it('does not report a risky expedition confirmation before its completion time', async () => {
    const base = createInitialV4Save(104);
    const started = startExpedition(base, 'joseon_plains', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.status = 'awaiting_confirmation';
    started.save.run.expedition!.completesAt = started.save.updatedAt + HOUR;
    persistV4Save(started.save);

    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.getByTestId('confirm-message')).toHaveTextContent('확인할 수 없습니다'));
    expect(JSON.parse(localStorage.getItem(V4_SAVE_KEY) ?? '{}').run.expedition).not.toBeNull();
  });
});
