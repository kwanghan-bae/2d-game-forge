import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startPlaytime, pausePlaytime, resumePlaytime, getPlaytimeMs, getPlaytimeFormatted, resetPlaytime } from './playtimeTracker';

describe('Playtime tracker', () => {
  beforeEach(() => {
    resetPlaytime();
  });

  it('starts at 0', () => {
    expect(getPlaytimeMs()).toBe(0);
  });

  it('accumulates time after start', async () => {
    startPlaytime();
    await new Promise(r => setTimeout(r, 50));
    expect(getPlaytimeMs()).toBeGreaterThan(30);
  });

  it('pauses and resumes correctly', async () => {
    startPlaytime();
    await new Promise(r => setTimeout(r, 50));
    pausePlaytime();
    const t1 = getPlaytimeMs();
    await new Promise(r => setTimeout(r, 50));
    expect(getPlaytimeMs()).toBe(t1); // no change while paused
    resumePlaytime();
    await new Promise(r => setTimeout(r, 50));
    expect(getPlaytimeMs()).toBeGreaterThan(t1);
  });

  it('formats time correctly', () => {
    // Test formatting logic directly
    expect(getPlaytimeFormatted()).toBe('0s');
  });
});
