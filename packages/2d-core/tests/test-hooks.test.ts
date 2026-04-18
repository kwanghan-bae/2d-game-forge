import { describe, expect, it, beforeEach } from 'vitest';
import { exposeTestHooks } from '../src/test-hooks';

describe('exposeTestHooks', () => {
  beforeEach(() => {
    for (const key of ['gameInstance', 'currentScene', 'customKey', 'extraA']) {
      delete (window as unknown as Record<string, unknown>)[key];
    }
  });

  it('attaches well-known slots to window', () => {
    const fakeInstance = { destroy: () => {} };
    exposeTestHooks({ gameInstance: fakeInstance });
    expect(
      (window as unknown as { gameInstance: unknown }).gameInstance,
    ).toBe(fakeInstance);
  });

  it('attaches custom slots too', () => {
    exposeTestHooks({ customKey: 42 });
    expect(
      (window as unknown as { customKey: number }).customKey,
    ).toBe(42);
  });

  it('skips undefined values', () => {
    exposeTestHooks({ gameInstance: undefined, currentScene: 'scene' });
    expect('gameInstance' in window).toBe(false);
    expect(
      (window as unknown as { currentScene: string }).currentScene,
    ).toBe('scene');
  });

  it('merges across multiple calls', () => {
    exposeTestHooks({ gameInstance: { destroy: () => {} } });
    exposeTestHooks({ extraA: 'a' });
    expect('gameInstance' in window).toBe(true);
    expect((window as unknown as { extraA: string }).extraA).toBe('a');
  });
});
