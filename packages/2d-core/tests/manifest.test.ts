import { describe, expect, it } from 'vitest';
import { parseGameManifest } from '../src/manifest';

describe('parseGameManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const input = {
      slug: 'inflation-rpg',
      title: '조선 인플레이션 RPG',
      assetsBasePath: '/games/inflation-rpg/assets',
    };
    const result = parseGameManifest(input);
    expect(result.slug).toBe('inflation-rpg');
    expect(result.title).toBe('조선 인플레이션 RPG');
    expect(result.assetsBasePath).toBe('/games/inflation-rpg/assets');
  });

  it('rejects slug with uppercase or spaces', () => {
    expect(() =>
      parseGameManifest({
        slug: 'Inflation RPG',
        title: 'x',
        assetsBasePath: '/a',
      }),
    ).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() =>
      parseGameManifest({
        slug: 'ok',
        title: '',
        assetsBasePath: '/a',
      }),
    ).toThrow();
  });

  it('requires assetsBasePath to start with "/"', () => {
    expect(() =>
      parseGameManifest({
        slug: 'ok',
        title: 'ok',
        assetsBasePath: 'assets',
      }),
    ).toThrow();
  });
});
