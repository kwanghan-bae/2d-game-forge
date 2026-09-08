import { describe, expect, it } from 'vitest';
import {
  chooseStoryChoice,
  getAvailableStoryChoice,
  getRealmIntroEntry,
  getRealmVictoryEntry,
  getRejuvenationStoryEntry,
  hasV4Epilogue,
} from '../story';
import { createInitialV4Save } from '../save';
import type { SagaEntry } from '../types';

const STORY_NOW = 10_000;

function withSaga(save: ReturnType<typeof createInitialV4Save>, entry: SagaEntry) {
  return {
    ...save,
    meta: { ...save.meta, sagaEntries: [entry, ...save.meta.sagaEntries] },
  };
}

describe('V4 story catalog', () => {
  it('explains each realm entrance and victory through the Joseon folklore arc', () => {
    const introFixtures = [
      ['joseon_plains', '도깨비'] as const,
      ['deep_forest', '산군'] as const,
      ['underworld', '저승'] as const,
    ];
    const victoryFixtures = [
      ['joseon_plains', '장승'] as const,
      ['deep_forest', '흑송 산군'] as const,
      ['underworld', '염라'] as const,
    ];

    for (const [realmId, keyword] of introFixtures) {
      const entry = getRealmIntroEntry(realmId, '연화', STORY_NOW);
      expect(entry).toMatchObject({
        id: `saga-realm-intro-${realmId}`,
        kind: 'expedition',
        createdAt: STORY_NOW,
      });
      expect(entry.text).toContain(keyword);
    }
    for (const [realmId, keyword] of victoryFixtures) {
      const entry = getRealmVictoryEntry(realmId, '연화', STORY_NOW);
      expect(entry).toMatchObject({
        id: `saga-realm-victory-${realmId}`,
        kind: 'expedition',
        createdAt: STORY_NOW,
      });
      expect(entry.text).toContain(keyword);
    }
  });

  it('records a deterministic rejuvenation beat without changing the save schema', () => {
    const entry = getRejuvenationStoryEntry('연화', 5, STORY_NOW);
    expect(entry).toEqual({
      id: `saga-rejuvenation-${STORY_NOW}`,
      kind: 'rejuvenation',
      createdAt: STORY_NOW,
      title: '영원의 회춘 의식',
      text: '연화의 시간이 5년 되돌아가 다시 한 번 마을의 약속을 짊어졌다.',
    });
  });
});

describe('V4 deep forest story choice', () => {
  function forestVictorySave() {
    const initial = createInitialV4Save(400);
    initial.createdAt = STORY_NOW;
    initial.updatedAt = STORY_NOW;
    initial.lastProcessedAt = STORY_NOW;
    return withSaga(initial, getRealmVictoryEntry('deep_forest', initial.run.hero.name, STORY_NOW));
  }

  it('keeps the underworld choice unavailable until the deep forest victory is recorded', () => {
    const initial = createInitialV4Save(401);
    expect(getAvailableStoryChoice(initial)).toBeNull();
    expect(chooseStoryChoice(initial, 'protect_flame', STORY_NOW)).toMatchObject({ ok: false });
  });

  it('offers exactly one choice and unlocks the underworld only after choosing it', () => {
    const source = forestVictorySave();
    const choice = getAvailableStoryChoice(source);
    expect(choice?.options.map((option) => option.id)).toEqual(['protect_flame', 'release_goblin']);
    expect(source.meta.unlockedRealms).not.toContain('underworld');

    const selected = chooseStoryChoice(source, 'protect_flame', STORY_NOW);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.save.schemaVersion).toBe(1);
    expect(selected.save.meta.unlockedRealms).toContain('underworld');
    expect(selected.save.meta.currencies.rift).toBe(1);
    expect(selected.save.meta.agents.find((agent) => agent.id === 'mudang')?.trust).toBe(35);
    expect(selected.save.meta.sagaEntries.filter((entry) => entry.id === 'saga-story-deep-forest-embers')).toHaveLength(1);
    expect(getAvailableStoryChoice(selected.save)).toBeNull();

    const repeated = chooseStoryChoice(selected.save, 'release_goblin', STORY_NOW + 1);
    expect(repeated.ok).toBe(false);
    expect(repeated.save).toBe(selected.save);
  });

  it('applies the alternate choice to the guide and materials', () => {
    const selected = chooseStoryChoice(forestVictorySave(), 'release_goblin', STORY_NOW);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.save.meta.currencies.materials).toBe(14);
    expect(selected.save.meta.agents.find((agent) => agent.id === 'guide')?.trust).toBe(35);
  });

  it('identifies the first underworld epilogue and keeps it idempotent', () => {
    const initial = createInitialV4Save(402);
    expect(hasV4Epilogue(initial)).toBe(false);
    const completed = withSaga(initial, {
      id: 'saga-epilogue-first-journey',
      kind: 'milestone',
      createdAt: STORY_NOW,
      title: '첫 사가의 끝, 영원의 시작',
      text: '저승의 문을 넘어선 영웅은 마을로 돌아와 다음 인연을 맞이했다.',
    });
    expect(hasV4Epilogue(completed)).toBe(true);
  });
});
