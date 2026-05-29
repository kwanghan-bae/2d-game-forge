import { describe, it, expect, beforeEach } from 'vitest';
import { playAmbient, stopAmbient, _resetSoundForTest } from './sound';

describe('ambient sound', () => {
  beforeEach(() => {
    _resetSoundForTest();
  });

  it('playAmbient and stopAmbient do not throw in non-browser env', () => {
    // In vitest (jsdom), Audio is stubbed but won't actually play.
    // Just verify no runtime errors.
    expect(() => playAmbient('base')).not.toThrow();
    expect(() => playAmbient('sea')).not.toThrow();
    expect(() => playAmbient('unknown_realm')).not.toThrow();
    expect(() => stopAmbient()).not.toThrow();
  });

  it('stopAmbient is idempotent', () => {
    expect(() => {
      stopAmbient();
      stopAmbient();
    }).not.toThrow();
  });
});
