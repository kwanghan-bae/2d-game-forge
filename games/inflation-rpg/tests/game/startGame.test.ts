import { describe, expect, it } from 'vitest';
import type { StartGameConfig } from '../../src/startGame';

describe('StartGameConfig', () => {
  it('requires parent and assetsBasePath fields', () => {
    const config: StartGameConfig = {
      parent: 'game-container',
      assetsBasePath: '/assets',
      exposeTestHooks: false,
    };
    expect(config.parent).toBe('game-container');
    expect(config.assetsBasePath).toBe('/assets');
    expect(config.exposeTestHooks).toBe(false);
  });
});
