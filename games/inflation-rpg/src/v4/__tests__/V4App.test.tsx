import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { useV4Game } from '../useV4Game';
import { V4App } from '../V4App';

vi.mock('../useV4Game', () => ({ useV4Game: vi.fn() }));

function mockGame(
  refresh: ReturnType<typeof vi.fn>,
  settleOffline: ReturnType<typeof vi.fn>,
  storageStatus: 'valid' | 'unavailable' = 'valid',
): ReturnType<typeof useV4Game> {
  const save = createInitialV4Save(1);
  return {
    save,
    storageStatus,
    storageIssue: null,
    now: save.updatedAt,
    offlineSummary: null,
    message: null,
    activeTasks: [],
    refresh,
    settleOffline,
    changePolicy: vi.fn(),
    updateSettings: vi.fn(),
    startTask: vi.fn(),
    cancelTask: vi.fn(),
    restSupportAgent: vi.fn(),
    rejuvenate: vi.fn(),
    monetizationAvailable: false,
    adFree: false,
    adsToday: 0,
    offlineRewardDoubled: false,
    doubleOfflineReward: vi.fn(),
    instantTask: vi.fn(),
    addInterventionCharge: vi.fn(),
    intervene: vi.fn(),
    buyAdFree: vi.fn(),
    startRun: vi.fn(),
    confirmRun: vi.fn(),
    confirmUnlock: vi.fn(),
    upgrade: vi.fn(),
    importLegacyHero: vi.fn(),
    startFreshSave: vi.fn(),
    closeOffline: vi.fn(),
    closeMessage: vi.fn(),
  } as unknown as ReturnType<typeof useV4Game>;
}

describe('V4 app resume handling', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('settles offline progress when the document becomes visible or the page is shown', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline));
    const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { window.dispatchEvent(new Event('pageshow')); });

    expect(settleOffline).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();
    unmount();
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    expect(settleOffline).toHaveBeenCalledTimes(2);
  });

  it('does not settle while the document is hidden', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline));
    const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    act(() => { vi.advanceTimersByTime(2_000); });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { window.dispatchEvent(new Event('pageshow')); });

    expect(settleOffline).not.toHaveBeenCalled();
    unmount();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('keeps the game playable but warns when device storage is unavailable', () => {
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline, 'unavailable'));

    render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    expect(screen.getByTestId('v4-storage-warning')).toHaveTextContent('진행이 보존되지 않을 수 있습니다');
    expect(screen.getByTestId('v4-town-hub')).toBeInTheDocument();
  });
});
