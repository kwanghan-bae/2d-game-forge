/**
 * Cycle 106 — Inflation Milestone tier catalog.
 *
 * 8 tier × 10^n level thresholds. lv 100 / 1k / 10k / 100k / 1M / 10M / 100M / 1G.
 * 단일 source of truth — controller (F1 emit) + VFX preset (F2 render) 양쪽이
 * 이 표를 참조. PRD §F2 의 8-tier 표 = palette/timing 정의, 본 파일이 그것을
 * structured data 로 캡슐화.
 */

export type MilestoneTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface MilestonePreset {
  readonly tier: MilestoneTier;
  readonly thresholdLv: number;
  /** CSS custom property suffix — `--color-milestone-tier-{N}` 로 wrap. raw hex 직접 사용 금지. */
  readonly cssVarName: string;
  /** central flash size (px) */
  readonly size: number;
  /** total VFX duration (ms) — self-unmount timeout */
  readonly durationMs: number;
  /** root-div translate amplitude (px). reduced-motion 시 0 으로 강제. */
  readonly shakeAmplitude: number;
  /** SoundManager sfx id (없으면 silent fallback). */
  readonly sfxId: 'milestone-small' | 'milestone-medium' | 'milestone-large' | 'milestone-mega';
}

export const MILESTONE_PRESETS: readonly MilestonePreset[] = [
  { tier: 1, thresholdLv: 100,            cssVarName: '--color-milestone-tier-1', size: 120, durationMs: 600,  shakeAmplitude: 4,  sfxId: 'milestone-small' },
  { tier: 2, thresholdLv: 1_000,          cssVarName: '--color-milestone-tier-2', size: 180, durationMs: 800,  shakeAmplitude: 6,  sfxId: 'milestone-small' },
  { tier: 3, thresholdLv: 10_000,         cssVarName: '--color-milestone-tier-3', size: 240, durationMs: 1000, shakeAmplitude: 8,  sfxId: 'milestone-medium' },
  { tier: 4, thresholdLv: 100_000,        cssVarName: '--color-milestone-tier-4', size: 320, durationMs: 1200, shakeAmplitude: 12, sfxId: 'milestone-medium' },
  { tier: 5, thresholdLv: 1_000_000,      cssVarName: '--color-milestone-tier-5', size: 400, durationMs: 1500, shakeAmplitude: 16, sfxId: 'milestone-large' },
  { tier: 6, thresholdLv: 10_000_000,     cssVarName: '--color-milestone-tier-6', size: 480, durationMs: 1800, shakeAmplitude: 20, sfxId: 'milestone-large' },
  { tier: 7, thresholdLv: 100_000_000,    cssVarName: '--color-milestone-tier-7', size: 560, durationMs: 2100, shakeAmplitude: 24, sfxId: 'milestone-mega' },
  { tier: 8, thresholdLv: 1_000_000_000,  cssVarName: '--color-milestone-tier-8', size: 640, durationMs: 2500, shakeAmplitude: 32, sfxId: 'milestone-mega' },
] as const;

/** Ascending tier thresholds — controller crossing 검출용. */
export const MILESTONE_THRESHOLDS: readonly number[] = MILESTONE_PRESETS.map((p) => p.thresholdLv);

export function presetForTier(tier: MilestoneTier): MilestonePreset {
  // tier 는 1-8 의 union 이므로 index = tier-1 안전.
  return MILESTONE_PRESETS[tier - 1]!;
}

/**
 * fromLv → toLv 사이의 모든 tier crossing 을 ascending 으로 반환.
 * crossing 조건: `fromLv < thresholdLv <= toLv`.
 * lv 가 ≤ from 의 tier 에는 도달했었다고 가정 — 재진입 방지는 ledger 가 담당.
 */
export function tiersCrossed(fromLv: number, toLv: number): readonly MilestoneTier[] {
  if (toLv <= fromLv) return [];
  const crossed: MilestoneTier[] = [];
  for (const preset of MILESTONE_PRESETS) {
    if (fromLv < preset.thresholdLv && preset.thresholdLv <= toLv) {
      crossed.push(preset.tier);
    }
  }
  return crossed;
}
