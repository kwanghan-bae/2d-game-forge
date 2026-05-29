import { describe, it, expect } from 'vitest';
import {
  getOverkillMessage,
  getDangerZoneMessage,
  getCloseCallMessage,
  getCriticalHitMessage,
  getComboMessage,
} from '../battleFlavorText';

describe('battleFlavorText — C130', () => {
  it('getOverkillMessage returns non-empty string for any seed', () => {
    for (let i = 0; i < 10; i++) {
      const msg = getOverkillMessage(i);
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('getDangerZoneMessage cycles through pool', () => {
    const msg0 = getDangerZoneMessage(0);
    const msg1 = getDangerZoneMessage(1);
    expect(msg0).not.toBe(msg1);
  });

  it('getCloseCallMessage returns valid message', () => {
    expect(getCloseCallMessage(7).length).toBeGreaterThan(0);
  });

  it('getCriticalHitMessage returns valid message', () => {
    expect(getCriticalHitMessage(0).length).toBeGreaterThan(0);
  });

  it('getComboMessage returns null below threshold 5', () => {
    expect(getComboMessage(3)).toBeNull();
    expect(getComboMessage(4)).toBeNull();
  });

  it('getComboMessage returns message at threshold 5+', () => {
    expect(getComboMessage(5)).toBe('연타 개시!');
    expect(getComboMessage(10)).toBe('멈출 수 없는 기세!');
    expect(getComboMessage(20)).toBe('전설의 연격!');
  });
});
