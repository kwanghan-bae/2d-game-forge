import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { createInitialV4Save } from '../save';
import * as monetization from '../monetization';
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
    const handle: monetization.NativeV4MonetizationHandle = {
      adapter: new monetization.V4MonetizationAdapter(null, null),
      initialize,
      restorePurchases: vi.fn(async () => true),
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
    } finally {
      createNative.mockRestore();
      if (previousCapacitor) windowWithCapacitor.Capacitor = previousCapacitor;
      else delete windowWithCapacitor.Capacitor;
    }
  });
});
