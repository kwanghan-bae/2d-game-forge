import { describe, it, expectTypeOf } from 'vitest';
import type { ForgeGameInstance, StartGameFn } from '../src/game-instance';

describe('ForgeGameInstance', () => {
  it('accepts minimal destroy shape', () => {
    const fake: ForgeGameInstance = { destroy: () => {} };
    expectTypeOf(fake).toEqualTypeOf<ForgeGameInstance>();
  });

  it('destroy accepts optional removeCanvas', () => {
    const fake: ForgeGameInstance = {
      destroy: (removeCanvas?: boolean) => {
        void removeCanvas;
      },
    };
    fake.destroy(true);
    fake.destroy();
  });
});

describe('StartGameFn', () => {
  it('returns a ForgeGameInstance given any config', () => {
    type Fn = StartGameFn<{ parent: string }>;
    const fn: Fn = () => ({ destroy: () => {} });
    const result = fn({ parent: 'x' });
    expectTypeOf(result).toExtend<ForgeGameInstance>();
  });
});
