/**
 * Playtime tracker — counts active session time.
 * Uses performance.now() for precision. Resets on page reload (session-scoped).
 * Future: merge with meta persist for total playtime across sessions.
 */

let startTime: number | null = null;
let accumulated = 0;
let paused = false;

export function startPlaytime(): void {
  if (startTime !== null) return;
  startTime = performance.now();
  paused = false;
}

export function pausePlaytime(): void {
  if (paused || startTime === null) return;
  accumulated += performance.now() - startTime;
  startTime = null;
  paused = true;
}

export function resumePlaytime(): void {
  if (!paused) return;
  startTime = performance.now();
  paused = false;
}

export function getPlaytimeMs(): number {
  if (startTime === null) return accumulated;
  return accumulated + (performance.now() - startTime);
}

export function getPlaytimeFormatted(): string {
  const ms = getPlaytimeMs();
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function resetPlaytime(): void {
  startTime = null;
  accumulated = 0;
  paused = false;
}
