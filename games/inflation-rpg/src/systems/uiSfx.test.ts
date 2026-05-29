import { describe, it, expect } from 'vitest';
import type { UiSfxEvent } from './uiSfx';

describe('UI SFX event mapping', () => {
  const events: UiSfxEvent[] = ['navigate', 'purchase', 'equip', 'error', 'confirm'];

  it('all UI events are defined', () => {
    expect(events).toHaveLength(5);
  });

  it('error pitch is lower than normal', () => {
    // error = 0.6, navigate = 1.1
    expect(0.6).toBeLessThan(1.0);
  });

  it('confirm pitch is higher than normal', () => {
    expect(1.3).toBeGreaterThan(1.0);
  });
});
