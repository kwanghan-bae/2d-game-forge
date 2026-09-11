import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  root: {
    render: vi.fn(),
    unmount: vi.fn(),
  },
  legacyStore: { id: 'legacy-store' },
  cycleStore: { id: 'cycle-store' },
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => mocks.root),
}));
vi.mock('./App', () => ({ App: () => null }));
vi.mock('./v4/V4App', () => ({ V4App: () => null }));
vi.mock('./store/gameStore', () => ({ useGameStore: mocks.legacyStore }));
vi.mock('./overworld/cycleSliceV2', () => ({ useCycleStoreV2: mocks.cycleStore }));

import { StartGame } from './startGame';
import { StartLegacyGame } from './startLegacyGame';

const config = {
  parent: 'game-container',
  assetsBasePath: '/assets',
  exposeTestHooks: true,
};

function testWindow(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

describe('game entrypoint lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container"></div>';
    mocks.root.render.mockClear();
    mocks.root.unmount.mockClear();
    delete testWindow().gameConfig;
    delete testWindow().__inflation_rpg_game_config_owner__;
    delete testWindow().__zustand_inflation_rpg_store__;
    delete testWindow().__cycle_store_v2__;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears legacy test hooks when a legacy game instance is destroyed', () => {
    const instance = StartLegacyGame(config);

    expect(testWindow().gameConfig).toBe(config);
    expect(testWindow().__zustand_inflation_rpg_store__).toBe(mocks.legacyStore);
    expect(testWindow().__cycle_store_v2__).toBe(mocks.cycleStore);

    instance.destroy();

    expect(mocks.root.unmount).toHaveBeenCalledTimes(1);
    expect(testWindow().gameConfig).toBeUndefined();
    expect(testWindow().__zustand_inflation_rpg_store__).toBeUndefined();
    expect(testWindow().__cycle_store_v2__).toBeUndefined();
  });

  it('clears the V4 test config when the V4 game instance is destroyed', () => {
    const instance = StartGame(config);

    expect(testWindow().gameConfig).toBe(config);
    instance.destroy();

    expect(mocks.root.unmount).toHaveBeenCalledTimes(1);
    expect(testWindow().gameConfig).toBeUndefined();
  });

  it('does not let a late legacy destroy clear a newer V4 hook owner', () => {
    const legacy = StartLegacyGame(config);
    const v4Config = { ...config };
    const v4 = StartGame(v4Config);

    expect(testWindow().gameConfig).toBe(v4Config);
    expect(testWindow().__zustand_inflation_rpg_store__).toBeUndefined();
    expect(testWindow().__cycle_store_v2__).toBeUndefined();

    legacy.destroy();
    expect(testWindow().gameConfig).toBe(v4Config);

    v4.destroy();
    expect(testWindow().gameConfig).toBeUndefined();
  });

  it('keeps V4 hooks owned correctly when a route reuses the same config object', () => {
    const legacy = StartLegacyGame(config);
    const v4 = StartGame(config);

    expect(testWindow().gameConfig).toBe(config);
    expect(testWindow().__zustand_inflation_rpg_store__).toBeUndefined();
    expect(testWindow().__cycle_store_v2__).toBeUndefined();

    legacy.destroy();

    expect(testWindow().gameConfig).toBe(config);
    v4.destroy();
    expect(testWindow().gameConfig).toBeUndefined();
  });
});
