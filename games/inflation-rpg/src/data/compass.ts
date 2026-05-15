import type { CompassId, CompassEntry } from '../types';

export const COMPASS_ITEMS: Record<CompassId, CompassEntry> = {
  plains_first:    { id: 'plains_first',     dungeonId: 'plains',     tier: 1, emoji: '🧭', nameKR: '평야 나침반 1차',   descriptionKR: '평야 던전 추첨 가중치 ×3' },
  plains_second:   { id: 'plains_second',    dungeonId: 'plains',     tier: 2, emoji: '🗺️', nameKR: '평야 나침반 2차',   descriptionKR: '평야 던전 자유 선택' },
  forest_first:    { id: 'forest_first',     dungeonId: 'forest',     tier: 1, emoji: '🧭', nameKR: '깊은숲 나침반 1차', descriptionKR: '깊은숲 던전 추첨 가중치 ×3' },
  forest_second:   { id: 'forest_second',    dungeonId: 'forest',     tier: 2, emoji: '🗺️', nameKR: '깊은숲 나침반 2차', descriptionKR: '깊은숲 던전 자유 선택' },
  mountains_first: { id: 'mountains_first',  dungeonId: 'mountains',  tier: 1, emoji: '🧭', nameKR: '산악 나침반 1차',   descriptionKR: '산악 던전 추첨 가중치 ×3' },
  mountains_second:{ id: 'mountains_second', dungeonId: 'mountains',  tier: 2, emoji: '🗺️', nameKR: '산악 나침반 2차',   descriptionKR: '산악 던전 자유 선택' },
  omni:            { id: 'omni',             dungeonId: null,         tier: 0, emoji: '🌌', nameKR: '범우주 나침반',    descriptionKR: '모든 던전 자유 선택' },
};

export const ALL_COMPASS_IDS: ReadonlyArray<CompassId> = Object.keys(COMPASS_ITEMS) as CompassId[];

export const EMPTY_COMPASS_OWNED: Record<CompassId, boolean> = {
  plains_first: false,    plains_second: false,
  forest_first: false,    forest_second: false,
  mountains_first: false, mountains_second: false,
  omni: false,
};

export function getCompassByDungeon(dungeonId: string, tier: 1 | 2): CompassId {
  return `${dungeonId}_${tier === 1 ? 'first' : 'second'}` as CompassId;
}
