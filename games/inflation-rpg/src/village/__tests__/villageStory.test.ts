import { describe, expect, it } from 'vitest';
import {
  chooseStoryChoice,
  getAvailableStoryChoice,
  getRealmIntroEntry,
  getRealmVictoryEntry,
  getRejuvenationStoryEntry,
  hasVillageEpilogue,
} from '../story';
import { createInitialVillageSave } from '../save';
import { Village_MAX_SAGA_ENTRIES } from '../types';
import type { ExpeditionResult, SagaEntry } from '../types';

const STORY_NOW = 10_000;

function withSaga(save: ReturnType<typeof createInitialVillageSave>, entry: SagaEntry) {
  return {
    ...save,
    meta: { ...save.meta, sagaEntries: [entry, ...save.meta.sagaEntries] },
  };
}

describe('Village story catalog', () => {
  it('explains each realm entrance and victory through the Joseon folklore arc', () => {
    const introFixtures = [
      ['sacred_fields', '도깨비'] as const,
      ['deep_forest', '산군'] as const,
      ['underworld', '저승'] as const,
    ];
    const victoryFixtures = [
      ['sacred_fields', '장승'] as const,
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

  it.each(['sacred_fields', 'deep_forest', 'underworld'] as const)(
    'uses the provided hero name in the %s entrance and victory text',
    (realmId) => {
      expect(getRealmIntroEntry(realmId, '무진', STORY_NOW).text).toContain('무진');
      expect(getRealmVictoryEntry(realmId, '무진', STORY_NOW).text).toContain('무진');
      expect(getRealmIntroEntry(realmId, '무진', STORY_NOW).text).not.toContain('연화');
      expect(getRealmVictoryEntry(realmId, '무진', STORY_NOW).text).not.toContain('연화');
    },
  );
});

describe('Village deep forest story choice', () => {
  function deepForestVictoryResult(): ExpeditionResult {
    return {
      id: 'expedition-result-deep-forest',
      realmId: 'deep_forest',
      outcome: 'victory',
      completedAt: STORY_NOW,
      reward: { materials: 1 },
      heroPower: 100,
      recommendedPower: 90,
      turns: 3,
      totalDamageDealt: 120,
      totalDamageTaken: 20,
      heroRemainingHp: 80,
      weaknessKR: '없음',
      recommendedFacilityId: 'training',
      recommendedEquipmentId: null,
      retryAfterSeconds: 0,
      successChance: 0.9,
      encountersCleared: 3,
      totalEncounterCount: 3,
    };
  }

  function forestVictorySave() {
    const initial = createInitialVillageSave(400);
    initial.createdAt = STORY_NOW;
    initial.updatedAt = STORY_NOW;
    initial.lastProcessedAt = STORY_NOW;
    initial.meta.unlockedRealms.push('deep_forest');
    initial.run.lastExpeditionResult = deepForestVictoryResult();
    return withSaga(initial, getRealmVictoryEntry('deep_forest', initial.run.hero.name, STORY_NOW));
  }

  it('keeps the underworld choice unavailable until the deep forest victory is recorded', () => {
    const initial = createInitialVillageSave(401);
    expect(getAvailableStoryChoice(initial)).toBeNull();
    expect(chooseStoryChoice(initial, 'protect_flame', STORY_NOW)).toMatchObject({ ok: false });
  });

  it('does not trust a saga marker without the durable deep forest victory result', () => {
    const initial = createInitialVillageSave(403);
    const forgedLog = withSaga(initial, getRealmVictoryEntry('deep_forest', initial.run.hero.name, STORY_NOW));

    expect(getAvailableStoryChoice(forgedLog)).toBeNull();
    expect(chooseStoryChoice(forgedLog, 'protect_flame', STORY_NOW)).toMatchObject({ ok: false });
  });

  it('rejects a durable victory result when the deep forest was never unlocked', () => {
    const inconsistent = createInitialVillageSave(404);
    inconsistent.run.lastExpeditionResult = deepForestVictoryResult();

    expect(getAvailableStoryChoice(inconsistent)).toBeNull();
    expect(chooseStoryChoice(inconsistent, 'protect_flame', STORY_NOW)).toMatchObject({ ok: false });
  });

  it('keeps the choice available after the victory saga entry is evicted and preserves the saga cap', () => {
    const source = forestVictorySave();
    source.meta.sagaEntries = Array.from({ length: Village_MAX_SAGA_ENTRIES }, (_, index) => ({
      id: `old-saga-${index}`,
      kind: 'facility' as const,
      createdAt: STORY_NOW - index - 1,
      title: `오래된 기록 ${index}`,
      text: '사가 상한 회귀 테스트',
    }));
    const mudang = source.meta.agents.find((agent) => agent.id === 'mudang');
    if (!mudang) throw new Error('mudang fixture missing');
    mudang.trust = 49;

    expect(getAvailableStoryChoice(source)?.id).toBe('deep_forest_embers');
    const selected = chooseStoryChoice(source, 'protect_flame', STORY_NOW);

    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.save.meta.sagaEntries).toHaveLength(Village_MAX_SAGA_ENTRIES);
    expect(selected.save.meta.sagaEntries.some((entry) => entry.id === 'saga-story-deep-forest-embers')).toBe(true);
    expect(selected.save.meta.sagaEntries.some((entry) => entry.id === 'saga-agent-trust-mudang-50')).toBe(true);
  });

  it('rejects a choice timestamp that cannot be persisted safely', () => {
    const source = forestVictorySave();
    const selected = chooseStoryChoice(source, 'protect_flame', Number.MAX_SAFE_INTEGER + 1);

    expect(selected).toMatchObject({ ok: false });
    expect(selected.save).toBe(source);
    expect(source.meta.unlockedRealms).not.toContain('underworld');
  });

  it('offers exactly one choice and unlocks the underworld only after choosing it', () => {
    const source = forestVictorySave();
    const choice = getAvailableStoryChoice(source);
    expect(choice?.options.map((option) => option.id)).toEqual(['protect_flame', 'release_goblin']);
    expect(source.meta.unlockedRealms).not.toContain('underworld');

    const selected = chooseStoryChoice(source, 'protect_flame', STORY_NOW);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.save.schemaVersion).toBe(2);
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

  it.each([
    ['protect_flame', 'mudang', 'saga-agent-trust-mudang-50'] as const,
    ['release_goblin', 'guide', 'saga-agent-trust-guide-50'] as const,
  ])('records one trust milestone when %s crosses trust 50', (choice, agentId, milestoneId) => {
    const source = forestVictorySave();
    const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
    if (!agent) throw new Error(`${agentId} fixture missing`);
    agent.trust = 49;
    agent.level = 1;

    const selected = chooseStoryChoice(source, choice, STORY_NOW);

    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.save.meta.agents.find((candidate) => candidate.id === agentId)).toMatchObject({
      trust: 54,
      level: 2,
    });
    expect(selected.save.meta.sagaEntries.filter((entry) => entry.id === milestoneId)).toHaveLength(1);
  });

  it.each([
    ['protect_flame', 'rift', Number.NaN] as const,
    ['protect_flame', 'rift', 1.5] as const,
    ['release_goblin', 'materials', Number.POSITIVE_INFINITY] as const,
    ['release_goblin', 'materials', Number.MAX_SAFE_INTEGER + 1] as const,
  ])('fails closed before cloning when %s targets an invalid %s balance', (choice, currency, invalidValue) => {
    const source = forestVictorySave();
    source.meta.currencies[currency] = invalidValue;

    const result = chooseStoryChoice(source, choice, STORY_NOW);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(source);
    expect(source.meta.unlockedRealms).not.toContain('underworld');
    expect(source.meta.sagaEntries.some((entry) => entry.id === 'saga-story-deep-forest-embers')).toBe(false);
    if (Number.isNaN(invalidValue)) expect(Number.isNaN(source.meta.currencies[currency])).toBe(true);
  });

  it.each([
    ['protect_flame', 'mudang', 'trust', Number.NaN] as const,
    ['protect_flame', 'mudang', 'level', 1.5] as const,
    ['protect_flame', 'mudang', 'fatigue', Number.POSITIVE_INFINITY] as const,
    ['release_goblin', 'guide', 'trust', -1] as const,
    ['release_goblin', 'guide', 'level', 4] as const,
    ['release_goblin', 'guide', 'fatigue', 101] as const,
  ])('fails closed for %s when the target %s has invalid %s', (choice, agentId, field, invalidValue) => {
    const source = forestVictorySave();
    const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
    if (!agent) throw new Error(`${agentId} fixture missing`);
    agent[field] = invalidValue;

    const result = chooseStoryChoice(source, choice, STORY_NOW);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(source);
    expect(source.meta.unlockedRealms).not.toContain('underworld');
  });

  it.each([
    ['protect_flame', 'mudang'] as const,
    ['release_goblin', 'guide'] as const,
  ])('fails closed for %s when the target %s metadata is not canonical', (choice, agentId) => {
    const source = forestVictorySave();
    const agent = source.meta.agents.find((candidate) => candidate.id === agentId);
    if (!agent) throw new Error(`${agentId} fixture missing`);
    agent.nameKR = '변조된 이름';

    const result = chooseStoryChoice(source, choice, STORY_NOW);

    expect(result.ok).toBe(false);
    expect(result.save).toBe(source);
    expect(source.meta.unlockedRealms).not.toContain('underworld');
  });

  it('identifies the first underworld epilogue and keeps it idempotent', () => {
    const initial = createInitialVillageSave(402);
    expect(hasVillageEpilogue(initial)).toBe(false);
    const completed = withSaga(initial, {
      id: 'saga-epilogue-first-journey',
      kind: 'milestone',
      createdAt: STORY_NOW,
      title: '첫 사가의 끝, 영원의 시작',
      text: '저승의 문을 넘어선 영웅은 마을로 돌아와 다음 인연을 맞이했다.',
    });
    expect(hasVillageEpilogue(completed)).toBe(true);
  });
});
