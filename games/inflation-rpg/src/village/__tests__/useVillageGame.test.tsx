import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialVillageSave, persistVillageSave, Village_RECOVERY_BACKUP_KEY, Village_SAVE_KEY } from '../save';
import { completeFacilityTasks, startExpedition, startFacilityTask } from '../domain';
import { getRealmVictoryEntry } from '../story';
import { VillageMonetizationAdapter } from '../monetization';
import { useVillageGame } from '../useVillageGame';
import { useGameStore } from '../../store/gameStore';
import { readVillageMetricEvents } from '../telemetry';
import type { HeroSnapshot } from '../../hero/HeroEntity';
import type { ExpeditionResult, VillageSaveEnvelope } from '../types';

const HOUR = 60 * 60 * 1000;

function setFixtureTimeline(
  save: ReturnType<typeof createInitialVillageSave>,
  createdAt: number,
  updatedAt = createdAt,
) {
  save.createdAt = createdAt;
  save.lastProcessedAt = createdAt;
  save.updatedAt = updatedAt;
  save.meta.sagaEntries = save.meta.sagaEntries.map((entry) => ({
    ...entry,
    createdAt: Math.min(updatedAt, Math.max(createdAt, entry.createdAt)),
  }));
}

function setDeepForestVictory(save: VillageSaveEnvelope): void {
  const result: ExpeditionResult = {
    id: 'expedition-result-deep-forest',
    realmId: 'deep_forest',
    outcome: 'victory',
    completedAt: save.updatedAt,
    reward: { materials: 1 },
    heroPower: 100,
    recommendedPower: 90,
    turns: 3,
    totalDamageDealt: 120,
    totalDamageTaken: 20,
    heroRemainingHp: 80,
    weaknessKR: '없음',
    recommendedFacilityId: 'training',
    recommendedEquipmentId: null,
    retryAfterSeconds: 0,
  };
  save.run.lastExpeditionResult = result;
  save.meta.sagaEntries.unshift(getRealmVictoryEntry('deep_forest', save.run.hero.name, save.updatedAt));
}

function Harness({ monetization }: { monetization: VillageMonetizationAdapter }) {
  const game = useVillageGame(monetization);
  return (
    <>
      <div data-testid="offline-state">{game.offlineSummary ? 'ready' : 'pending'}</div>
      <div data-testid="double-pending">{game.offlineRewardPending ? 'pending' : 'idle'}</div>
      <div data-testid="spirit">{game.save.meta.currencies.spirit}</div>
      <div data-testid="clock">{game.now}</div>
      <div data-testid="ad-free">{game.adFree ? 'owned' : 'not-owned'}</div>
      <div data-testid="ads-today">{game.adsToday}</div>
      <div data-testid="restore-available">{game.restorePurchasesAvailable ? 'available' : 'unavailable'}</div>
      <div data-testid="message">{game.message ?? ''}</div>
      <button type="button" onClick={() => { void game.doubleOfflineReward(); }}>double</button>
      <button type="button" onClick={game.settleOffline}>resume</button>
      <button type="button" onClick={() => game.startTask('temple')}>start temple</button>
      <button type="button" onClick={() => { void game.restorePurchases(); }}>restore</button>
    </>
  );
}

function InstantTaskHarness({ monetization }: { monetization: VillageMonetizationAdapter }) {
  const game = useVillageGame(monetization);
  return (
    <>
      <div data-testid="instant-task-count">{Object.keys(game.save.meta.tasks).length}</div>
      <div data-testid="instant-pending">{game.instantTaskPendingFacilities?.includes('temple') ? 'pending' : 'idle'}</div>
      <div data-testid="instant-spirit">{game.save.meta.currencies.spirit}</div>
      <div data-testid="intervention-charges">{game.save.run.interventionCharges}</div>
      <div data-testid="charge-pending">{game.interventionChargePending ? 'pending' : 'idle'}</div>
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

function RestoreHarness({ monetization }: { monetization: VillageMonetizationAdapter }) {
  const game = useVillageGame(monetization);
  return (
    <>
      <div data-testid="ad-free-state">{game.adFree ? 'owned' : 'not-owned'}</div>
      <div data-testid="restore-message">{game.message ?? ''}</div>
      <button type="button" onClick={() => { void game.restorePurchases(); }}>restore</button>
    </>
  );
}

function PurchaseHarness({ monetization }: { monetization: VillageMonetizationAdapter }) {
  const game = useVillageGame(monetization);
  return (
    <>
      <div data-testid="purchase-message">{game.message ?? ''}</div>
      <div data-testid="purchase-pending">{game.adFreePurchasePending ? 'pending' : 'idle'}</div>
      <button type="button" disabled={game.adFreePurchasePending} onClick={() => { void game.buyAdFree(); }}>purchase</button>
    </>
  );
}

function RecoveryHarness() {
  const game = useVillageGame();
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
  const game = useVillageGame();
  return (
    <>
      <div data-testid="task-count">{Object.keys(game.save.meta.tasks).length}</div>
      <div data-testid="refresh-clock">{game.now}</div>
      <div data-testid="expedition-status">{game.save.run.expedition?.status ?? 'none'}</div>
      <div data-testid="unlocked-realms">{game.save.meta.unlockedRealms.join(',')}</div>
      <button type="button" onClick={game.refresh}>refresh</button>
    </>
  );
}

function StoryChoiceHarness() {
  const game = useVillageGame();
  return (
    <>
      <div data-testid="story-choice">{game.storyChoice?.id ?? 'none'}</div>
      <div data-testid="story-realms">{game.save.meta.unlockedRealms.join(',')}</div>
      <button type="button" onClick={() => game.chooseStoryChoice('protect_flame')}>protect</button>
    </>
  );
}

function ConfirmHarness() {
  const game = useVillageGame();
  return (
    <>
      <div data-testid="confirm-message">{game.message ?? ''}</div>
      <button type="button" onClick={game.confirmRun}>confirm</button>
    </>
  );
}

function TelemetryHarness() {
  const game = useVillageGame();
  return (
    <>
      <button type="button" onClick={() => game.startTask('temple')}>start facility</button>
      <button type="button" onClick={() => game.changePolicy('training')}>change policy</button>
      <button type="button" onClick={() => game.startRun('sacred_fields')}>start expedition</button>
      <button type="button" onClick={() => game.chooseStoryChoice('protect_flame')}>choose story</button>
    </>
  );
}

function ImportHarness() {
  const game = useVillageGame();
  return (
    <>
      <div data-testid="import-hero">{game.save.run.hero.name}</div>
      <div data-testid="import-message">{game.message ?? ''}</div>
      <button type="button" onClick={game.importLegacyHero}>import</button>
    </>
  );
}

describe('useVillageGame monetization actions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('refreshes the ad-free UI when an entitlement callback changes the adapter externally', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(1);
    setFixtureTimeline(base, 10_000);
    persistVillageSave(base);
    const monetization = new VillageMonetizationAdapter(null, null);
    render(<Harness monetization={monetization} />);

    expect(screen.getByTestId('ad-free')).toHaveTextContent('not-owned');
    act(() => { monetization.setAdFreeOwned(true); });

    expect(screen.getByTestId('ad-free')).toHaveTextContent(/^owned$/);
  });

  it('keeps the game playable when monetization status getters throw', async () => {
    const monetization = new VillageMonetizationAdapter(null, null);
    vi.spyOn(monetization, 'isAdFree').mockImplementation(() => { throw new Error('entitlement bridge unavailable'); });
    vi.spyOn(monetization, 'getAdsToday').mockImplementation(() => { throw new Error('usage bridge unavailable'); });
    vi.spyOn(monetization, 'canRestorePurchases').mockImplementation(() => { throw new Error('restore bridge unavailable'); });

    render(<Harness monetization={monetization} />);

    expect(screen.getByTestId('ad-free')).toHaveTextContent('not-owned');
    expect(screen.getByTestId('ads-today')).toHaveTextContent('0');
    expect(screen.getByTestId('restore-available')).toHaveTextContent('unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'restore' }));
    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('구매 복원을 사용할 수 없습니다'));
  });

  it('keeps offline rewards playable when a custom ad bridge rejects', async () => {
    const base = createInitialVillageSave(2);
    const startedAt = Date.now() - 60_000;
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    const monetization = new VillageMonetizationAdapter(null, null);
    vi.spyOn(monetization, 'watchRewarded').mockRejectedValue(new Error('native bridge unavailable'));
    render(<Harness monetization={monetization} />);
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByRole('button', { name: 'double' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('광고를 불러오지 못했습니다'));
    expect(screen.getByTestId('spirit')).toHaveTextContent('112');
  });

  it('uses offline efficiency when settling work after a background resume', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(87);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);
    vi.setSystemTime(11_000);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'resume' })); });

    expect(screen.getByTestId('spirit')).toHaveTextContent('112');
    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
    expect(screen.getByTestId('clock')).toHaveTextContent('11000');
  });

  it('shows a result when a sub-second offline window still completes work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(87);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);
    vi.setSystemTime(10_002);

    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('shows a result when resume parks a risky boss at the exact watermark', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(88);
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
    persistVillageSave(started.save);
    vi.setSystemTime(expedition.completesAt);

    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('shows a result when offline settlement only upgrades existing equipment', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(113);
    base.run.hero.equipmentIds = ['iron_sword'];
    base.run.hero.equipmentLevels = { iron_sword: 1 };
    const started = startFacilityTask(base, 'blacksmith', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    started.save.meta.tasks[started.task.id].outputPreview = {};
    persistVillageSave(started.save);
    vi.setSystemTime(10_002);

    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);

    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');
  });

  it('applies an offline double reward only once when the button is clicked concurrently', async () => {
    const base = createInitialVillageSave(88);
    const startedAt = Date.now() - 60_000;
    // Keep the fixture chronologically valid: a save cannot have been
    // processed before it was created.
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    let providerCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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

  it('exposes offline reward pending state until the provider resolves', async () => {
    const base = createInitialVillageSave(112);
    const startedAt = Date.now() - 60_000;
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    let release!: (granted: boolean) => void;
    const monetization = new VillageMonetizationAdapter({
      showRewarded: () => new Promise<boolean>((resolve) => { release = resolve; }),
    }, null);
    render(<Harness monetization={monetization} />);

    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'double' }));

    await waitFor(() => expect(screen.getByTestId('double-pending')).toHaveTextContent('pending'));
    act(() => { release(false); });
    await waitFor(() => expect(screen.getByTestId('double-pending')).toHaveTextContent('idle'));
  });

  it('does not apply an older offline reward after a newer settlement replaces it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(89);
    const startedAt = 9_000;
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    let providerCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
      showRewarded: async () => {
        providerCalls += 1;
        await pending;
        return true;
      },
    }, null);
    render(<Harness monetization={monetization} />);
    expect(screen.getByTestId('offline-state')).toHaveTextContent('ready');

    fireEvent.click(screen.getByRole('button', { name: 'double' }));
    expect(providerCalls).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'start temple' }));
    vi.setSystemTime(41_000);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'resume' })); });
    expect(screen.getByTestId('spirit')).toHaveTextContent('124');

    await act(async () => { release(); });
    expect(screen.getByTestId('spirit')).toHaveTextContent('124');
    expect(monetization.getAdsToday()).toBe(1);
  });

  it('settles the initial offline state once under React StrictMode', async () => {
    const base = createInitialVillageSave(90);
    const startedAt = Date.now() - 60_000;
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    render(
      <StrictMode>
        <Harness monetization={new VillageMonetizationAdapter(null, null)} />
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    expect(setItemSpy.mock.calls.filter(([key]) => key === Village_SAVE_KEY)).toHaveLength(1);
    setItemSpy.mockRestore();
  });

  it('does not persist or rerender when resume has no new offline work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    persistVillageSave(createInitialVillageSave(901));
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);
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
    const base = createInitialVillageSave(902);
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
    persistVillageSave(pending);

    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    render(<Harness monetization={new VillageMonetizationAdapter(null, null)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
      fireEvent.click(screen.getByRole('button', { name: 'resume' }));
    });

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('offline-state')).toHaveTextContent('pending');
    setItemSpy.mockRestore();
  });

  it('does not request an ad when offline settlement has no positive currency reward', async () => {
    const base = createInitialVillageSave(89);
    const startedAt = Date.now() - 60_000;
    setFixtureTimeline(base, startedAt);
    const started = startFacilityTask(base, 'temple', base.lastProcessedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    started.save.meta.tasks[started.task.id].outputPreview = {};
    persistVillageSave(started.save);

    let providerCalls = 0;
    const monetization = new VillageMonetizationAdapter({
      showRewarded: async () => { providerCalls += 1; return true; },
    }, null);
    render(<Harness monetization={monetization} />);
    await waitFor(() => expect(screen.getByTestId('offline-state')).toHaveTextContent('ready'));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'double' })); });

    expect(providerCalls).toBe(0);
    expect(screen.getByTestId('spirit')).toHaveTextContent('100');
  });

  it('blocks a stale V3 import callback while an expedition is active', () => {
    const base = createInitialVillageSave(120);
    const started = startExpedition(base, 'sacred_fields', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistVillageSave(started.save);
    useGameStore.setState((state) => ({
      ...state,
      run: {
        ...state.run,
        heroSnapshot: {
          name: 'stale import', emoji: '🛡️', age: 17, chapter: '청년기', job: '검객', level: 1,
          exp: 0, hp: 1_000, hpMax: 1_000, atk: 160, atkBase: 160, hpBase: 1_000,
          actionCount: 185, rejuvenationCount: 0, gridX: 0, gridY: 0, equipment: [],
          personality: { courage: 0, curiosity: 0, greed: 0, compassion: 0, discipline: 0 },
          unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 120,
        } as unknown as HeroSnapshot,
      },
    }));

    render(<ImportHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'import' }));

    expect(screen.getByTestId('import-hero')).toHaveTextContent(base.run.hero.name);
    expect(screen.getByTestId('import-message')).toHaveTextContent('원정 중에는 영웅 기록을 바꿀 수 없습니다');
    useGameStore.setState((state) => ({ ...state, run: { ...state.run, heroSnapshot: null } }));
  });

  it('hydrates the legacy store only when importing from a cold current-product boot', async () => {
    const state = useGameStore.getState();
    const snapshot = {
      name: 'cold boot hero', emoji: '🛡️', age: 19, chapter: '청년기', job: '검객', level: 4,
      exp: 12, hp: 1_200, hpMax: 1_500, atk: 190, atkBase: 190, hpBase: 1_500,
      actionCount: 185, rejuvenationCount: 1, gridX: 0, gridY: 0, equipment: [],
      personality: { courage: 1, curiosity: 2, greed: 0, compassion: 3, discipline: 2 },
      unlockedJobId: null, unlockedMilestones: [], learnedSkillIds: [], seed: 777,
    } as unknown as HeroSnapshot;
    useGameStore.setState((current) => ({
      ...current,
      run: { ...current.run, heroSnapshot: null },
    }));
    const legacyRaw = JSON.stringify({
      state: {
        meta: state.meta,
        run: { ...state.run, heroSnapshot: snapshot },
      },
      version: 27,
    });
    localStorage.setItem('korea_inflation_rpg_save', legacyRaw);
    const rehydrateSpy = vi.spyOn(useGameStore.persist, 'rehydrate');

    render(<ImportHarness />);
    expect(rehydrateSpy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'import' }));
    });

    await waitFor(() => expect(screen.getByTestId('import-hero')).toHaveTextContent('cold boot hero'));
    expect(rehydrateSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('korea_inflation_rpg_save')).toBe(legacyRaw);
    rehydrateSpy.mockRestore();
    useGameStore.setState((current) => ({ ...current, run: { ...current.run, heroSnapshot: null } }));
  });

  it('only requests one instant-task ad when the same action is clicked concurrently', async () => {
    const base = createInitialVillageSave(105);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistVillageSave(started.save);

    let providerCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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

  it('exposes instant-task pending state until the provider resolves', async () => {
    let release!: (granted: boolean) => void;
    const monetization = new VillageMonetizationAdapter({
      showRewarded: () => new Promise<boolean>((resolve) => { release = resolve; }),
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    await waitFor(() => expect(screen.getByTestId('instant-pending')).toHaveTextContent('pending'));
    act(() => { release(false); });
    await waitFor(() => expect(screen.getByTestId('instant-pending')).toHaveTextContent('idle'));
  });

  it('exposes intervention charge pending state until the provider resolves', async () => {
    let release!: (granted: boolean) => void;
    const monetization = new VillageMonetizationAdapter({
      showRewarded: () => new Promise<boolean>((resolve) => { release = resolve; }),
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));
    await waitFor(() => expect(screen.getByTestId('charge-pending')).toHaveTextContent('pending'));
    act(() => { release(false); });
    await waitFor(() => expect(screen.getByTestId('charge-pending')).toHaveTextContent('idle'));
  });

  it('keeps a successful instant-task reward when the device clock moves backwards during the ad', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(107);
    setFixtureTimeline(base, 10_000);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistVillageSave(started.save);

    let providerStarted!: () => void;
    const providerStartedPromise = new Promise<void>((resolve) => { providerStarted = resolve; });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
      showRewarded: async () => {
        providerStarted();
        await pending;
        return true;
      },
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));
    await act(async () => { await providerStartedPromise; });
    expect(monetization.getAdsToday()).toBe(0);
    vi.setSystemTime(9_000);

    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('0');
    expect(screen.getByTestId('instant-spirit')).toHaveTextContent('118');
  });

  it('does not watch an ad when the requested facility has no active task', async () => {
    const showRewarded = vi.fn(async () => true);
    const monetization = new VillageMonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'instant' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('즉시 완료할 작업이 없습니다'));
    expect(showRewarded).not.toHaveBeenCalled();
  });

  it('only requests one intervention-charge ad when the same action is clicked concurrently', async () => {
    let providerCalls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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
    const base = createInitialVillageSave(91);
    base.createdAt = now - 60_000;
    base.lastProcessedAt = base.createdAt;
    base.updatedAt = now + HOUR;
    persistVillageSave(base);

    const monetization = new VillageMonetizationAdapter({
      showRewarded: async () => true,
    }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('적용하지 않았습니다'));
    expect(screen.getByTestId('intervention-charges')).toHaveTextContent('1');
  });

  it('does not watch an ad when the intervention reserve is already full', async () => {
    const base = createInitialVillageSave(125);
    base.run.interventionCharges = 3;
    persistVillageSave(base);
    const showRewarded = vi.fn(async () => true);
    const monetization = new VillageMonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'charge' }));

    await waitFor(() => expect(screen.getByTestId('message')).toHaveTextContent('이미 가득 찼습니다'));
    expect(showRewarded).not.toHaveBeenCalled();
    expect(screen.getByTestId('intervention-charges')).toHaveTextContent('3');
  });

  it('preserves a newer policy change while an instant-task ad is pending', async () => {
    const base = createInitialVillageSave(110);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistVillageSave(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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

  it('does not call the instant-task ad when a stale task is already naturally complete', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(114);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1_000;
    persistVillageSave(started.save);

    const showRewarded = vi.fn(async () => true);
    const monetization = new VillageMonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);
    vi.setSystemTime(11_001);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'instant' }));
      await Promise.resolve();
    });

    expect(screen.getByTestId('message')).toHaveTextContent('이미 완료된 작업입니다');
    expect(showRewarded).not.toHaveBeenCalled();
    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('1');
  });

  it('does not apply instant completion when the task becomes due while the ad is pending', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(115);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1_000;
    persistVillageSave(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const showRewarded = vi.fn(async () => {
      await pending;
      return true;
    });
    const monetization = new VillageMonetizationAdapter({ showRewarded }, null);
    render(<InstantTaskHarness monetization={monetization} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'instant' }));
      await Promise.resolve();
    });
    expect(showRewarded).toHaveBeenCalledOnce();

    vi.setSystemTime(11_001);
    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('instant-task-count')).toHaveTextContent('1');
    expect(screen.getByTestId('message')).toHaveTextContent('자연 완료되어');
  });

  it('does not commit an instant task after the game unmounts while an ad is pending', async () => {
    const base = createInitialVillageSave(111);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    persistVillageSave(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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
    expect(JSON.parse(localStorage.getItem(Village_SAVE_KEY) ?? '{}').meta.tasks).toHaveProperty(started.task.id);
    setItemSpy.mockRestore();
  });

  it('does not instantly complete a replacement task after the original task finishes during an ad', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(112);
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.task.startedAt + 1;
    persistVillageSave(started.save);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const monetization = new VillageMonetizationAdapter({
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
    const monetization = new VillageMonetizationAdapter(null, null);
    render(<InstantTaskHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'multi' }));

    await waitFor(() => expect(screen.getByTestId('policy')).toHaveTextContent('training'));
    expect(screen.getByTestId('muted')).toHaveTextContent('true');
  });

  it('refreshes the ad-free UI after a successful purchase restoration', async () => {
    const monetization = new VillageMonetizationAdapter(null, null, null, async () => true);
    render(<RestoreHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'restore' }));

    await waitFor(() => expect(screen.getByTestId('ad-free-state')).toHaveTextContent('owned'));
    expect(screen.getByTestId('restore-message')).toHaveTextContent('광고 제거 구매를 복원했습니다.');
  });

  it('keeps the game playable when a purchase bridge rejects', async () => {
    const monetization = new VillageMonetizationAdapter(null, null);
    vi.spyOn(monetization, 'buyAdFree').mockRejectedValue(new Error('store unavailable'));
    render(<PurchaseHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'purchase' }));

    await waitFor(() => expect(screen.getByTestId('purchase-message')).toHaveTextContent('구매를 확인하지 못했습니다'));
  });

  it('allows only one ad-free purchase request while the provider is pending', async () => {
    const monetization = new VillageMonetizationAdapter(null, null);
    let releasePurchase!: (result: Awaited<ReturnType<VillageMonetizationAdapter['buyAdFree']>>) => void;
    const pending = new Promise<Awaited<ReturnType<VillageMonetizationAdapter['buyAdFree']>>>((resolve) => {
      releasePurchase = resolve;
    });
    const purchase = vi.spyOn(monetization, 'buyAdFree').mockReturnValue(pending);
    render(<PurchaseHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'purchase' }));
    expect(screen.getByTestId('purchase-pending')).toHaveTextContent('pending');
    expect(screen.getByRole('button', { name: 'purchase' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'purchase' }));
    expect(purchase).toHaveBeenCalledOnce();

    await act(async () => {
      releasePurchase({ granted: false, reason: 'provider_failed' });
      await Promise.resolve();
    });
    expect(screen.getByTestId('purchase-pending')).toHaveTextContent('idle');
    expect(screen.getByRole('button', { name: 'purchase' })).toBeEnabled();
  });

  it('keeps the game playable when a restore bridge rejects', async () => {
    const monetization = new VillageMonetizationAdapter(null, null, null, async () => true);
    vi.spyOn(monetization, 'restorePurchases').mockRejectedValue(new Error('store unavailable'));
    render(<RestoreHarness monetization={monetization} />);

    fireEvent.click(screen.getByRole('button', { name: 'restore' }));

    await waitFor(() => expect(screen.getByTestId('restore-message')).toHaveTextContent('구매 복원에 실패했습니다'));
  });
});

describe('useVillageGame save recovery', () => {
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
    expect(setItemSpy.mock.calls.filter(([key]) => key === Village_SAVE_KEY)).toHaveLength(1);
    setItemSpy.mockRestore();
  });

  it('does not overwrite an invalid save until the player explicitly starts fresh', async () => {
    const raw = JSON.stringify({ schemaVersion: 999, preserve: true });
    localStorage.setItem(Village_SAVE_KEY, raw);

    render(<RecoveryHarness />);
    expect(screen.getByTestId('storage-status')).toHaveTextContent('invalid');
    expect(localStorage.getItem(Village_SAVE_KEY)).toBe(raw);

    fireEvent.click(screen.getByRole('button', { name: 'fresh' }));
    await waitFor(() => expect(screen.getByTestId('storage-status')).toHaveTextContent('valid'));
    expect(localStorage.getItem(Village_RECOVERY_BACKUP_KEY)).toBe(raw);
    expect(JSON.parse(localStorage.getItem(Village_SAVE_KEY) ?? '{}').schemaVersion).toBe(2);
  });

  it('continues offline settlement after recovery creates a fresh save', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    localStorage.setItem(Village_SAVE_KEY, JSON.stringify({ schemaVersion: 999, preserve: true }));

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
    const base = createInitialVillageSave(103);
    base.createdAt = now - 60_000;
    base.lastProcessedAt = base.createdAt;
    base.updatedAt = now + 60 * 60 * 1000;
    const started = startFacilityTask(base, 'temple', base.updatedAt);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.meta.tasks[started.task.id].completesAt = started.save.updatedAt + 1_000;
    persistVillageSave(started.save);

    render(<RefreshHarness />);
    await waitFor(() => expect(screen.getByTestId('task-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('task-count')).toHaveTextContent('1');
  });

  it('keeps the presentation clock monotonic when the device clock moves backwards', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    persistVillageSave(createInitialVillageSave(105));

    render(<RefreshHarness />);
    vi.setSystemTime(20_000);
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    vi.setSystemTime(15_000);
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('refresh-clock')).toHaveTextContent('20000');
  });

  it('starts one autonomous expedition after the fifteen-second intervention window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    persistVillageSave(createInitialVillageSave(113));

    render(<RefreshHarness />);
    vi.setSystemTime(25_000);
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('expedition-status')).toHaveTextContent('traveling');
    expect(screen.getByTestId('task-count')).toHaveTextContent('0');
  });

  it('persists the Saga choice through the hook without adding a schema field', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(114);
    base.meta.unlockedRealms.push('deep_forest');
    setDeepForestVictory(base);
    persistVillageSave(base);

    render(<StoryChoiceHarness />);

    expect(screen.getByTestId('story-choice')).toHaveTextContent('deep_forest_embers');
    fireEvent.click(screen.getByRole('button', { name: 'protect' }));

    expect(screen.getByTestId('story-choice')).toHaveTextContent('none');
    expect(screen.getByTestId('story-realms')).toHaveTextContent('sacred_fields,deep_forest,underworld');
    expect(JSON.parse(localStorage.getItem(Village_SAVE_KEY) ?? '{}').schemaVersion).toBe(2);
    expect(JSON.parse(localStorage.getItem(Village_SAVE_KEY) ?? '{}').meta.storyChoice).toBeUndefined();
  });

  it('routes a large live clock gap through offline safety before resolving a risky boss', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(106);
    base.meta.unlockedRealms.push('deep_forest');
    const started = startExpedition(base, 'deep_forest', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const expedition = started.save.run.expedition;
    if (!expedition) return;
    expedition.encounterIndex = 2;
    expedition.startedAt = base.updatedAt;
    expedition.completesAt = base.updatedAt + 1_000;
    persistVillageSave(started.save);

    render(<RefreshHarness />);
    vi.setSystemTime(10_000 + HOUR);
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    expect(screen.getByTestId('expedition-status')).toHaveTextContent('awaiting_confirmation');
    expect(screen.getByTestId('unlocked-realms')).not.toHaveTextContent('underworld');
  });

  it('does not report a risky expedition confirmation before its completion time', async () => {
    const base = createInitialVillageSave(104);
    const started = startExpedition(base, 'sacred_fields', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.status = 'awaiting_confirmation';
    started.save.run.expedition!.completesAt = started.save.updatedAt + HOUR;
    persistVillageSave(started.save);

    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.getByTestId('confirm-message')).toHaveTextContent('확인할 수 없습니다'));
    expect(JSON.parse(localStorage.getItem(Village_SAVE_KEY) ?? '{}').run.expedition).not.toBeNull();
  });

  it('records save creation only once under React StrictMode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);

    render(<StrictMode><TelemetryHarness /></StrictMode>);

    expect(readVillageMetricEvents().filter((metric) => metric.name === 'save_created')).toHaveLength(1);
  });

  it('records successful facility, policy, and expedition actions only after domain success', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    persistVillageSave(createInitialVillageSave(115));

    render(<TelemetryHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'start facility' }));
    fireEvent.click(screen.getByRole('button', { name: 'start facility' }));
    fireEvent.click(screen.getByRole('button', { name: 'change policy' }));
    fireEvent.click(screen.getByRole('button', { name: 'change policy' }));
    fireEvent.click(screen.getByRole('button', { name: 'start expedition' }));
    fireEvent.click(screen.getByRole('button', { name: 'start expedition' }));

    const metrics = readVillageMetricEvents();
    expect(metrics.map((metric) => metric.name)).toEqual([
      'facility_task_started',
      'policy_changed',
      'expedition_started',
    ]);
    expect(metrics.map((metric) => metric.detail)).toEqual(['temple', 'training', 'sacred_fields']);
  });

  it('records a successful story choice but not a failed choice', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const base = createInitialVillageSave(116);
    base.meta.unlockedRealms.push('deep_forest');
    setDeepForestVictory(base);
    persistVillageSave(base);

    render(<TelemetryHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'choose story' }));
    fireEvent.click(screen.getByRole('button', { name: 'choose story' }));

    const storyMetrics = readVillageMetricEvents().filter((metric) => metric.name === 'story_choice_made');
    expect(storyMetrics).toHaveLength(1);
    expect(storyMetrics[0]?.detail).toBe('protect_flame');
  });

  it('records each successful expedition result once', () => {
    const base = createInitialVillageSave(117);
    const startedAt = Date.now() - 1_000;
    setFixtureTimeline(base, startedAt);
    const started = startExpedition(base, 'sacred_fields', base.updatedAt, 'aggression', null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    started.save.run.expedition!.encounterIndex = 2;
    started.save.run.expedition!.completesAt = started.save.run.expedition!.startedAt + 1;
    persistVillageSave(started.save);

    render(<ConfirmHarness />);
    expect(readVillageMetricEvents().filter((metric) => metric.name === 'expedition_finished')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

    expect(readVillageMetricEvents().filter((metric) => metric.name === 'expedition_finished')).toHaveLength(1);
  });
});
