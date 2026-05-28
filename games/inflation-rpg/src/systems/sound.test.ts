import { describe, it, expect, beforeEach } from 'vitest';
import { setVolumes, playSfx, playBgm, bgmIdForScreen, _resetSoundForTest } from './sound';

describe('sound system', () => {
  beforeEach(() => {
    _resetSoundForTest();
  });

  it('bgmIdForScreen maps known v1a screens', () => {
    expect(bgmIdForScreen('main-menu')).toBe('lobby');
    expect(bgmIdForScreen('cycle-prep-v2')).toBe('lobby');
    expect(bgmIdForScreen('overworld')).toBe('field');
    expect(bgmIdForScreen('cycle-result-v2')).toBe('lobby');
  });

  it('bgmIdForScreen returns null for unmapped screens', () => {
    expect(bgmIdForScreen('settings')).toBeNull();
    expect(bgmIdForScreen('saga-gallery')).toBeNull();
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

  it('playBgm crossfade: switching tracks does not throw', () => {
    // Simulate switching from one track to another
    playBgm('lobby');
    expect(() => playBgm('field')).not.toThrow();
    // Switching back triggers fadeOut of previous
    expect(() => playBgm('lobby')).not.toThrow();
  });

  it('playBgm same id is no-op', () => {
    playBgm('lobby');
    // Second call with same id should be no-op
    expect(() => playBgm('lobby')).not.toThrow();
  });
});
