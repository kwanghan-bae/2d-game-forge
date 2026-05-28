/**
 * SoundManager — 단순 HTMLAudioElement wrapper.
 * 사운드 파일 누락 시 silent fallback (warn 로그). Phaser 외부에서도 재생 가능.
 */

import type { Screen } from '../types';

export const SOUNDS_BASE = '/sounds';

let currentBgm: HTMLAudioElement | null = null;
let currentBgmId: string | null = null;
let musicVolume = 0.5;
let sfxVolume = 0.7;
let muted = false;

const SFX_POOL_SIZE = 4;
const sfxPools: Record<string, HTMLAudioElement[]> = {};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function getSfxPool(id: string): HTMLAudioElement[] {
  if (!sfxPools[id]) {
    sfxPools[id] = Array.from({ length: SFX_POOL_SIZE }, () => {
      const a = new Audio(`${SOUNDS_BASE}/sfx/${id}.ogg`);
      a.preload = 'auto';
      return a;
    });
  }
  return sfxPools[id]!;
}

export function setVolumes(music: number, sfx: number, isMuted: boolean): void {
  musicVolume = Math.max(0, Math.min(1, music));
  sfxVolume = Math.max(0, Math.min(1, sfx));
  muted = isMuted;
  if (currentBgm) {
    currentBgm.volume = muted ? 0 : musicVolume;
  }
}

export function playSfx(id: string, playbackRate = 1): void {
  if (!isBrowser() || muted || sfxVolume <= 0) return;
  try {
    const pool = getSfxPool(id);
    const idle = pool.find((a) => a.paused || a.ended) ?? pool[0]!;
    idle.currentTime = 0;
    idle.volume = sfxVolume;
    idle.playbackRate = Math.max(0.5, Math.min(2, playbackRate));
    idle.play().catch(() => {
      /* silent — file missing or autoplay blocked */
    });
  } catch {
    /* silent fallback */
  }
}

const CROSSFADE_MS = 500;
let fadeOutTimer: ReturnType<typeof setInterval> | null = null;

function fadeOutAndStop(audio: HTMLAudioElement, durationMs: number): void {
  const steps = 10;
  const interval = durationMs / steps;
  const startVol = audio.volume;
  let step = 0;
  if (fadeOutTimer) clearInterval(fadeOutTimer);
  fadeOutTimer = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      if (fadeOutTimer) clearInterval(fadeOutTimer);
      fadeOutTimer = null;
      audio.pause();
    }
  }, interval);
}

export function playBgm(id: string | null): void {
  if (!isBrowser()) return;
  if (id === currentBgmId) return;
  if (currentBgm) {
    fadeOutAndStop(currentBgm, CROSSFADE_MS);
    currentBgm = null;
  }
  currentBgmId = id;
  if (id === null) return;
  try {
    const audio = new Audio(`${SOUNDS_BASE}/bgm/${id}.ogg`);
    audio.loop = true;
    // Fade in
    audio.volume = 0;
    audio.play().catch(() => {
      /* silent */
    });
    const steps = 10;
    const interval = CROSSFADE_MS / steps;
    const targetVol = muted ? 0 : musicVolume;
    let step = 0;
    const fadeIn = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, targetVol * (step / steps));
      if (step >= steps) clearInterval(fadeIn);
    }, interval);
    currentBgm = audio;
  } catch {
    /* silent */
  }
}

const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'cycle-prep-v2': 'lobby',
  'overworld': 'field',
  'cycle-result-v2': 'lobby',
};

export function bgmIdForScreen(screen: Screen): string | null {
  return SCREEN_BGM[screen] ?? null;
}

// Test helpers (vitest 환경에서 audio pool/state 리셋)
export function _resetSoundForTest(): void {
  if (fadeOutTimer) { clearInterval(fadeOutTimer); fadeOutTimer = null; }
  currentBgm?.pause();
  currentBgm = null;
  currentBgmId = null;
  for (const key of Object.keys(sfxPools)) delete sfxPools[key];
  musicVolume = 0.5;
  sfxVolume = 0.7;
  muted = false;
}
