import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialV4Save } from '../save';
import { useV4Game } from '../useV4Game';
import { V4App } from '../V4App';

vi.mock('../useV4Game', () => ({ useV4Game: vi.fn() }));

function mockGame(refresh: ReturnType<typeof vi.fn>): ReturnType<typeof useV4Game> {
  const save = createInitialV4Save(1);
  return {
    save,
    storageStatus: 'valid',
    storageIssue: null,
    now: save.updatedAt,
    offlineSummary: null,
    message: null,
    activeTasks: [],
    refresh,
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

  it('refreshes immediately when the document becomes visible or the page is shown', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh));
    const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { window.dispatchEvent(new Event('pageshow')); });

    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
