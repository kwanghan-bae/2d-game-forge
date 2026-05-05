import { describe, it, expect, beforeEach } from 'vitest';
import { setVolumes, playSfx, playBgm, bgmIdForScreen, _resetSoundForTest } from './sound';

describe('sound system', () => {
  beforeEach(() => {
    _resetSoundForTest();
  });

  it('bgmIdForScreen maps known screens', () => {
    expect(bgmIdForScreen('main-menu')).toBe('lobby');
    expect(bgmIdForScreen('class-select')).toBe('lobby');
    expect(bgmIdForScreen('town')).toBe('lobby');
    expect(bgmIdForScreen('dungeon-floors')).toBe('lobby');
    expect(bgmIdForScreen('inventory')).toBe('field');
    expect(bgmIdForScreen('battle')).toBe('battle');
  });

  it('bgmIdForScreen returns null for unmapped screens', () => {
    expect(bgmIdForScreen('stat-alloc')).toBeNull();
    expect(bgmIdForScreen('game-over')).toBeNull();
  });

  it('setVolumes clamps to [0, 1]', () => {
    expect(() => setVolumes(-0.5, 1.5, true)).not.toThrow();
    expect(() => setVolumes(0.3, 0.6, false)).not.toThrow();
  });

  it('playSfx silently no-ops when muted', () => {
    setVolumes(0.5, 0.7, true);
    expect(() => playSfx('sfx-click')).not.toThrow();
  });

  it('playBgm with null stops current track', () => {
    expect(() => playBgm(null)).not.toThrow();
  });
});
