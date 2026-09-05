import { describe, it, expect } from 'vitest';
import {
  getQuestLocationHint,
  isQuestNearCompletion,
  getQuestInsightHint,
} from './questInsight';
import { QUESTS } from '../data/quests';
import type { Quest } from '../types';

describe('questInsight — C1018', () => {
  const killQuest = QUESTS.find(q => q.type === 'kill_count')!;
  const bossQuest = QUESTS.find(q => q.type === 'boss_defeat')!;

  describe('getQuestLocationHint', () => {
    it('locates dungeon for monster kill quest', () => {
      const hint = getQuestLocationHint(killQuest);
      expect(hint).toContain('던전');
    });

    it('locates dungeon for boss defeat quest', () => {
      const hint = getQuestLocationHint(bossQuest);
      expect(hint).toContain('던전');
    });

    it('falls back to region for unknown targets', () => {
      const customQuest: Quest = {
        id: 'q-test',
        regionId: 'plains',
        nameKR: '테스트',
        description: '테스트 퀘스트',
        type: 'kill_count',
        target: { count: 10 },
        reward: {},
      };
      expect(getQuestLocationHint(customQuest)).toBe('평야 지역');
    });
  });

  describe('isQuestNearCompletion', () => {
    it('returns false for 0 progress', () => {
      expect(isQuestNearCompletion(killQuest, 0)).toBe(false);
    });

    it('returns false for below 75% progress', () => {
      expect(isQuestNearCompletion(killQuest, Math.floor(killQuest.target.count * 0.74))).toBe(false);
    });

    it('returns true for 75%+ progress', () => {
      expect(isQuestNearCompletion(killQuest, Math.ceil(killQuest.target.count * 0.75))).toBe(true);
      expect(isQuestNearCompletion(killQuest, killQuest.target.count - 1)).toBe(true);
    });

    it('returns false when already 100% complete', () => {
      expect(isQuestNearCompletion(killQuest, killQuest.target.count)).toBe(false);
    });
  });

  describe('getQuestInsightHint', () => {
    it('generates recommended hint when progress is 0', () => {
      const hint = getQuestInsightHint(killQuest, 0);
      expect(hint).toContain('[추천]');
      expect(hint).toContain(`남은 수: ${killQuest.target.count}`);
    });

    it('generates in-progress hint with remaining count', () => {
      const hint = getQuestInsightHint(killQuest, Math.floor(killQuest.target.count * 0.5));
      expect(hint).toContain('[진행 중]');
      expect(hint).toContain(`남은 수: ${Math.ceil(killQuest.target.count * 0.5)}`);
    });

    it('generates near-completion hint when >= 75%', () => {
      const hint = getQuestInsightHint(killQuest, Math.ceil(killQuest.target.count * 0.8));
      expect(hint).toContain('[완료 임박]');
    });
  });
});
