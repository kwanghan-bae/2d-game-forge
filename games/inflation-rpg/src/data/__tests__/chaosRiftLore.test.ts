/**
 * chaosRiftLore.test.ts — C1083: Chaos Rift Abyss Narrative Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  CHAOS_RIFT_ORIGIN_MYTH,
  RIFT_MILESTONES,
  getRiftMilestoneLore,
  getRiftDepthTitle,
  getGuardianDeathCry,
  formatRiftSagaEntry,
} from '../chaosRiftLore';

describe('C1083 [narrative]: Chaos Rift Narrative & Milestone Lore', () => {
  it('defines evocative origin myth and milestone depths', () => {
    expect(CHAOS_RIFT_ORIGIN_MYTH.title).toContain('Origin of the Chaos Rift');
    expect(CHAOS_RIFT_ORIGIN_MYTH.text.length).toBeGreaterThan(30);

    expect(RIFT_MILESTONES[10]).toBeDefined();
    expect(RIFT_MILESTONES[20]).toBeDefined();
    expect(RIFT_MILESTONES[30]).toBeDefined();
    expect(RIFT_MILESTONES[50]).toBeDefined();
    expect(RIFT_MILESTONES[100]).toBeDefined();
  });

  it('retrieves milestone lore and guardian death cries accurately', () => {
    const m10 = getRiftMilestoneLore(10);
    expect(m10?.depthTitle).toBe('균열의 탐색자');
    expect(m10?.guardianDeathCry).toContain('차원의 문턱');

    const m50 = getRiftMilestoneLore(50);
    expect(m50?.depthTitle).toBe('무극의 초월자');
    expect(m50?.guardianDeathCry).toContain('금단의 성역');

    // Generic fallback for non-milestone depth
    const genericCry = getGuardianDeathCry(7);
    expect(genericCry).toContain('심도 7층의 수호자');
  });

  it('maps depth levels to appropriate honorific titles', () => {
    expect(getRiftDepthTitle(0)).toBe('미답의 방랑자');
    expect(getRiftDepthTitle(5)).toBe('균열의 입문자');
    expect(getRiftDepthTitle(15)).toBe('균열의 탐색자');
    expect(getRiftDepthTitle(25)).toBe('차원 절단자');
    expect(getRiftDepthTitle(35)).toBe('심연의 지배자');
    expect(getRiftDepthTitle(75)).toBe('무극의 초월자');
    expect(getRiftDepthTitle(100)).toBe('영원의 파멸자');
  });

  it('formats epic saga chronicle entries for the Hall of Sagas', () => {
    const entry = formatRiftSagaEntry(30);
    expect(entry).toBe(
      '무한 혼돈의 균열 심도 30층을 돌파하여 [심연의 지배자]의 위업을 달성하였다.',
    );
  });
});
