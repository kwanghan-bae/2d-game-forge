import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  root: {
    render: vi.fn(),
    unmount: vi.fn(),
  },
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => mocks.root),
}));
vi.mock('./village/VillageApp', () => ({ VillageApp: () => null }));

import { StartGame } from './startGame';

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
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears the current game test config when the instance is destroyed', () => {
    const instance = StartGame(config);

    expect(testWindow().gameConfig).toBe(config);
    instance.destroy();

    expect(mocks.root.unmount).toHaveBeenCalledTimes(1);
    expect(testWindow().gameConfig).toBeUndefined();
  });

  it('keeps the latest current game owner when an older instance is destroyed late', () => {
    const older = StartGame(config);
    const newerConfig = { ...config };
    const newer = StartGame(newerConfig);

    expect(testWindow().gameConfig).toBe(newerConfig);

    older.destroy();
    expect(testWindow().gameConfig).toBe(newerConfig);

    newer.destroy();
    expect(testWindow().gameConfig).toBeUndefined();
  });
});
