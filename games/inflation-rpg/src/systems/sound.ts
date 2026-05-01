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

export function playSfx(id: string): void {
  if (!isBrowser() || muted || sfxVolume <= 0) return;
  try {
    const pool = getSfxPool(id);
    const idle = pool.find((a) => a.paused || a.ended) ?? pool[0]!;
    idle.currentTime = 0;
    idle.volume = sfxVolume;
    idle.play().catch(() => {
      /* silent — file missing or autoplay blocked */
    });
  } catch {
    /* silent fallback */
  }
}

export function playBgm(id: string | null): void {
  if (!isBrowser()) return;
  if (id === currentBgmId) return;
  if (currentBgm) {
    currentBgm.pause();
    currentBgm = null;
  }
  currentBgmId = id;
  if (id === null) return;
  try {
    const audio = new Audio(`${SOUNDS_BASE}/bgm/${id}.ogg`);
    audio.loop = true;
    audio.volume = muted ? 0 : musicVolume;
    audio.play().catch(() => {
      /* silent */
    });
    currentBgm = audio;
  } catch {
    /* silent */
  }
}

const SCREEN_BGM: Partial<Record<Screen, string>> = {
  'main-menu': 'lobby',
  'town': 'lobby',
  'dungeon-floors': 'lobby',
  'class-select': 'lobby',
  'world-map': 'field',
  inventory: 'field',
  shop: 'field',
  quests: 'field',
  dungeon: 'battle',
  battle: 'battle',
};

export function bgmIdForScreen(screen: Screen): string | null {
  return SCREEN_BGM[screen] ?? null;
}

// Test helpers (vitest 환경에서 audio pool/state 리셋)
export function _resetSoundForTest(): void {
  currentBgm?.pause();
  currentBgm = null;
  currentBgmId = null;
  for (const key of Object.keys(sfxPools)) delete sfxPools[key];
  musicVolume = 0.5;
  sfxVolume = 0.7;
  muted = false;
}
