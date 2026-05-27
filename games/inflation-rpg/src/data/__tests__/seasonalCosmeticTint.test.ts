// Cycle 167 — seasonalCosmeticTint token → color 매핑 unit test.

import { describe, expect, it } from 'vitest';
import { cosmeticTintToHex, cosmeticTintToNumber } from '../seasonalCosmeticTint';

describe('Cycle 167 — cosmeticTintToHex', () => {
  it('정의된 token 6 종 → null 아님 (hex string)', () => {
    expect(cosmeticTintToHex('spring-pastel')).toMatch(/^#[0-9a-f]{6}$/);
    expect(cosmeticTintToHex('aqua-deep')).toMatch(/^#[0-9a-f]{6}$/);
    expect(cosmeticTintToHex('ember-glow')).toMatch(/^#[0-9a-f]{6}$/);
    expect(cosmeticTintToHex('shadow-ink')).toMatch(/^#[0-9a-f]{6}$/);
    expect(cosmeticTintToHex('cloud-silver')).toMatch(/^#[0-9a-f]{6}$/);
    expect(cosmeticTintToHex('chaos-prism')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('unknown token → null', () => {
    expect(cosmeticTintToHex('not-a-token')).toBeNull();
    expect(cosmeticTintToHex('')).toBeNull();
  });

  it('catalog 의 알려진 매핑과 정합 (spring-pastel, aqua-deep)', () => {
    // catalog 의 cycle 129 spring-burst + cycle 149 sea-cosmetic-aqua 검증.
    expect(cosmeticTintToHex('spring-pastel')).toBe('#3a4a3a');
    expect(cosmeticTintToHex('aqua-deep')).toBe('#0d3a4a');
  });
});

describe('Cycle 167 — cosmeticTintToNumber', () => {
  it('정의된 token → number (0xRGB)', () => {
    const n = cosmeticTintToNumber('aqua-deep');
    expect(n).toBe(0x0d3a4a);
  });

  it('unknown token → null', () => {
    expect(cosmeticTintToNumber('not-a-token')).toBeNull();
  });

  it('hex / number 일관성 — 둘 다 같은 24-bit 값', () => {
    const tokens = ['spring-pastel', 'aqua-deep', 'ember-glow', 'shadow-ink', 'cloud-silver', 'chaos-prism'];
    for (const t of tokens) {
      const hex = cosmeticTintToHex(t)!;
      const num = cosmeticTintToNumber(t)!;
      expect(num).toBe(parseInt(hex.slice(1), 16));
    }
  });

  /** Cycle 196 — hex 형식 invariant: #rrggbb (lowercase, 6 char, 0-9a-f). */
  it('cycle 196 — 모든 정의된 token 의 hex 가 #rrggbb 형식 (lowercase)', () => {
    const tokens = ['spring-pastel', 'aqua-deep', 'ember-glow', 'shadow-ink', 'cloud-silver', 'chaos-prism'];
    for (const t of tokens) {
      const hex = cosmeticTintToHex(t)!;
      expect(hex, `${t} should match #rrggbb`).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex.length, `${t} should be 7 chars`).toBe(7);
    }
  });
});
