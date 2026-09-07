import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { createInitialV4Save } from '../save';
import * as monetization from '../monetization';
import * as sound from '../../systems/sound';
import { useV4Game } from '../useV4Game';
import { V4App } from '../V4App';
import type { OfflineSummary } from '../types';

vi.mock('../useV4Game', () => ({ useV4Game: vi.fn() }));

function mockGame(
  refresh: ReturnType<typeof vi.fn>,
  settleOffline: ReturnType<typeof vi.fn>,
  storageStatus: 'valid' | 'unavailable' = 'valid',
  policy: string = 'aggression',
  overrides: Partial<ReturnType<typeof useV4Game>> = {},
): ReturnType<typeof useV4Game> {
  const save = createInitialV4Save(1);
  save.run.policy = policy as typeof save.run.policy;
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
    ...overrides,
  } as unknown as ReturnType<typeof useV4Game>;
}

describe('V4 app resume handling', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('clears global legacy audio when the V4 root enters and leaves', () => {
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline));
    const playBgm = vi.spyOn(sound, 'playBgm');
    const stopAmbient = vi.spyOn(sound, 'stopAmbient');

    const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    expect(playBgm).toHaveBeenCalledWith(null);
    expect(stopAmbient).toHaveBeenCalledTimes(1);
    unmount();
    expect(playBgm).toHaveBeenCalledTimes(2);
    expect(stopAmbient).toHaveBeenCalledTimes(2);
  });

  it('does not let an older V4 cleanup stop a newer root audio owner', () => {
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline));
    const playBgm = vi.spyOn(sound, 'playBgm');
    const stopAmbient = vi.spyOn(sound, 'stopAmbient');

    const older = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
    const newer = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
    const playCallsAfterNewerMount = playBgm.mock.calls.length;
    const ambientCallsAfterNewerMount = stopAmbient.mock.calls.length;

    older.unmount();

    expect(playBgm).toHaveBeenCalledTimes(playCallsAfterNewerMount);
    expect(stopAmbient).toHaveBeenCalledTimes(ambientCallsAfterNewerMount);

    newer.unmount();

    expect(playBgm).toHaveBeenCalledTimes(playCallsAfterNewerMount + 1);
    expect(stopAmbient).toHaveBeenCalledTimes(ambientCallsAfterNewerMount + 1);
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

  it('marks the active primary navigation item for assistive technology', () => {
    const refresh = vi.fn();
    const settleOffline = vi.fn();
    vi.mocked(useV4Game).mockReturnValue(mockGame(refresh, settleOffline));

    render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    const navigation = screen.getByRole('navigation', { name: '주요 메뉴' });
    const town = within(navigation).getByRole('button', { name: /마을/ });
    const hero = within(navigation).getByRole('button', { name: /영웅/ });
    expect(town).toHaveAttribute('aria-current', 'page');
    expect(hero).not.toHaveAttribute('aria-current');

    fireEvent.click(hero);

    expect(hero).toHaveAttribute('aria-current', 'page');
    expect(town).not.toHaveAttribute('aria-current');
  });

  it('keeps the header readable when a runtime policy value is unknown', () => {
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn(), 'valid', 'constructor'));

    render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    expect(screen.getByTestId('v4-app')).toHaveTextContent('정책 확인 필요');
  });

  it('normalizes malformed resource values before rendering the header', () => {
    const game = mockGame(vi.fn(), vi.fn());
    game.save.meta.currencies.spirit = Number.NaN;
    game.save.meta.currencies.gold = Number.POSITIVE_INFINITY;
    game.save.meta.currencies.materials = -25;
    vi.mocked(useV4Game).mockReturnValue(game);

    render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    const resources = screen.getByLabelText('보유 재화');
    expect(resources.textContent).toContain('신력0');
    expect(resources.textContent).toContain('금화0');
    expect(resources.textContent).toContain('재료0');
    expect(resources).not.toHaveTextContent('NaN');
    expect(resources).not.toHaveTextContent('∞');
    expect(resources).not.toHaveTextContent('-25');
  });

  it('normalizes malformed settings before updating the sound state', () => {
    const game = mockGame(vi.fn(), vi.fn());
    game.save.meta.settings = { music: Number.NaN, sfx: Number.POSITIVE_INFINITY, muted: 'yes' as never };
    vi.mocked(useV4Game).mockReturnValue(game);
    const setVolumes = vi.spyOn(sound, 'setVolumes');

    try {
      render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

      expect(setVolumes).toHaveBeenCalledWith(0, 0, false);
    } finally {
      setVolumes.mockRestore();
    }
  });

  it('keeps the offline result modal focus above the town heading', () => {
    const offlineSummary: OfflineSummary = {
      processedSeconds: 3_600,
      efficiency: 0.7,
      completedTaskIds: [],
      completedExpedition: false,
      resourcesGained: { gold: 55 },
      equipmentGained: [],
      equipmentUpgraded: [],
      wasClamped: false,
      clockAnomaly: null,
      notes: [],
    };
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn(), 'valid', 'aggression', { offlineSummary }));

    render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);

    expect(screen.getByRole('button', { name: '마을 확인' })).toHaveFocus();
  });

  it('keeps the local-first game playable when native platform detection throws', () => {
    const windowWithCapacitor = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const previousCapacitor = windowWithCapacitor.Capacitor;
    windowWithCapacitor.Capacitor = {
      isNativePlatform: () => { throw new Error('native bridge unavailable'); },
    };
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn()));

    try {
      render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
      expect(screen.getByTestId('v4-town-hub')).toBeInTheDocument();
    } finally {
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });

  it('does not initialize a native monetization handle after the app unmounts', async () => {
    const windowWithCapacitor = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const previousCapacitor = windowWithCapacitor.Capacitor;
    const createNative = vi.spyOn(monetization, 'createNativeV4Monetization');
    let resolveHandle!: (handle: monetization.NativeV4MonetizationHandle) => void;
    const pendingHandle = new Promise<monetization.NativeV4MonetizationHandle>((resolve) => { resolveHandle = resolve; });
    const initialize = vi.fn(async () => true);
    const handle: monetization.NativeV4MonetizationHandle = {
      adapter: new monetization.V4MonetizationAdapter(null, null),
      initialize,
      restorePurchases: vi.fn(async () => true),
    };
    windowWithCapacitor.Capacitor = { isNativePlatform: () => true };
    createNative.mockReturnValue(pendingHandle);
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn()));

    try {
      const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
      unmount();
      await act(async () => { resolveHandle(handle); await pendingHandle; });
      expect(initialize).not.toHaveBeenCalled();
    } finally {
      createNative.mockRestore();
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });

  it('starts native monetization bootstrap only once under React StrictMode', async () => {
    const windowWithCapacitor = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const previousCapacitor = windowWithCapacitor.Capacitor;
    const createNative = vi.spyOn(monetization, 'createNativeV4Monetization');
    const initialize = vi.fn(async () => true);
    const dispose = vi.fn(async () => {});
    const handle: monetization.NativeV4MonetizationHandle = {
      adapter: new monetization.V4MonetizationAdapter(null, null),
      initialize,
      restorePurchases: vi.fn(async () => true),
      dispose,
    };
    windowWithCapacitor.Capacitor = { isNativePlatform: () => true };
    createNative.mockResolvedValue(handle);
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn()));

    try {
      render(
        <StrictMode>
          <V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />
        </StrictMode>,
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(createNative).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(dispose).not.toHaveBeenCalled();
    } finally {
      createNative.mockRestore();
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });

  it('disposes a native handle that resolves after the monetization source is replaced', async () => {
    const windowWithCapacitor = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const previousCapacitor = windowWithCapacitor.Capacitor;
    const createNative = vi.spyOn(monetization, 'createNativeV4Monetization');
    let resolveHandle!: (handle: monetization.NativeV4MonetizationHandle) => void;
    const pendingHandle = new Promise<monetization.NativeV4MonetizationHandle>((resolve) => { resolveHandle = resolve; });
    const dispose = vi.fn(async () => {});
    const handle: monetization.NativeV4MonetizationHandle = {
      adapter: new monetization.V4MonetizationAdapter(null, null),
      initialize: vi.fn(async () => true),
      restorePurchases: vi.fn(async () => true),
      dispose,
    };
    const replacement = new monetization.V4MonetizationAdapter(null, null);
    windowWithCapacitor.Capacitor = { isNativePlatform: () => true };
    createNative.mockReturnValue(pendingHandle);
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn()));

    try {
      const { rerender, unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
      rerender(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false, v4Monetization: replacement }} />);
      await act(async () => {
        resolveHandle(handle);
        await pendingHandle;
        await Promise.resolve();
      });

      expect(dispose).toHaveBeenCalledOnce();
      unmount();
      await act(async () => { await Promise.resolve(); });
      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      createNative.mockRestore();
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });

  it('disposes native monetization when the V4 root unmounts', async () => {
    const windowWithCapacitor = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const previousCapacitor = windowWithCapacitor.Capacitor;
    const createNative = vi.spyOn(monetization, 'createNativeV4Monetization');
    const dispose = vi.fn(async () => {});
    const handle: monetization.NativeV4MonetizationHandle = {
      adapter: new monetization.V4MonetizationAdapter(null, null),
      initialize: vi.fn(async () => true),
      restorePurchases: vi.fn(async () => true),
      dispose,
    };
    windowWithCapacitor.Capacitor = { isNativePlatform: () => true };
    createNative.mockResolvedValue(handle);
    vi.mocked(useV4Game).mockReturnValue(mockGame(vi.fn(), vi.fn()));

    try {
      const { unmount } = render(<V4App config={{ parent: 'game-container', assetsBasePath: '/assets', exposeTestHooks: false }} />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      unmount();
      await act(async () => { await Promise.resolve(); });

      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      createNative.mockRestore();
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });
});
