// packages/2d-core/tests/theme-bridge.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readForgeToken, resolveForgeTheme } from '../src/theme-bridge';

const ALL_TOKENS: Record<string, string> = {
  '--forge-bg-base': '#0f0f14',
  '--forge-bg-panel': '#1a1a24',
  '--forge-bg-card': '#1e1e2e',
  '--forge-border': '#2a2a38',
  '--forge-accent': '#f0c060',
  '--forge-accent-dim': '#2a2410',
  '--forge-text-primary': '#e8e0d0',
  '--forge-text-secondary': '#c8b88a',
  '--forge-text-muted': '#666666',
  '--forge-stat-hp': '#60e060',
  '--forge-stat-atk': '#e09060',
  '--forge-stat-def': '#60a0e0',
  '--forge-stat-agi': '#c060e0',
  '--forge-stat-luc': '#e0c060',
  '--forge-stat-bp': '#60c0f0',
  '--forge-danger': '#e05050',
};

describe('theme-bridge', () => {
  beforeEach(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(ALL_TOKENS)) {
      root.style.setProperty(name, value);
    }
  });

  describe('readForgeToken', () => {
    it('converts #RRGGBB hex to 0xRRGGBB number', () => {
      expect(readForgeToken('--forge-bg-base')).toBe(0x0f0f14);
      expect(readForgeToken('--forge-accent')).toBe(0xf0c060);
      expect(readForgeToken('--forge-danger')).toBe(0xe05050);
    });

    it('handles stat color tokens', () => {
      expect(readForgeToken('--forge-stat-hp')).toBe(0x60e060);
      expect(readForgeToken('--forge-stat-atk')).toBe(0xe09060);
      expect(readForgeToken('--forge-stat-def')).toBe(0x60a0e0);
    });
  });

  describe('resolveForgeTheme', () => {
    it('returns object with all ForgeThemeBridge fields', () => {
      const theme = resolveForgeTheme();
      expect(theme.bg).toBe(0x0f0f14);
      expect(theme.panel).toBe(0x1a1a24);
      expect(theme.card).toBe(0x1e1e2e);
      expect(theme.border).toBe(0x2a2a38);
      expect(theme.accent).toBe(0xf0c060);
      expect(theme.text).toBe(0xe8e0d0);
      expect(theme.hp).toBe(0x60e060);
      expect(theme.atk).toBe(0xe09060);
      expect(theme.def).toBe(0x60a0e0);
      expect(theme.agi).toBe(0xc060e0);
      expect(theme.luc).toBe(0xe0c060);
      expect(theme.bp).toBe(0x60c0f0);
      expect(theme.danger).toBe(0xe05050);
    });

    it('produces numeric values suitable for Phaser fillColor', () => {
      const theme = resolveForgeTheme();
      for (const value of Object.values(theme)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffff);
      }
    });
  });
});
