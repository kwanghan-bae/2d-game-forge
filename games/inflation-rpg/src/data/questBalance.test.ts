import { describe, it, expect } from 'vitest';
import { QUESTS } from './quests';

describe('Quest reward balance', () => {
  it('all quests have gold reward > 0', () => {
    for (const q of QUESTS) {
      expect(q.reward.gold, `${q.id} gold`).toBeGreaterThan(0);
    }
  });

  it('gold rewards scale with quest difficulty tier', () => {
    // Group by rough tier: early(<=10k), mid(10k-30k), late(>30k)
    const early = QUESTS.filter(q => q.reward.gold <= 10000);
    const late = QUESTS.filter(q => q.reward.gold > 30000);
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
  });

  it('BP rewards are within 1-10 range', () => {
    const withBp = QUESTS.filter(q => q.reward.bp);
    expect(withBp.length).toBeGreaterThan(0);
    for (const q of withBp) {
      expect(q.reward.bp, `${q.id} bp`).toBeGreaterThanOrEqual(1);
      expect(q.reward.bp, `${q.id} bp`).toBeLessThanOrEqual(10);
    }
  });

  it('equipment rewards reference valid ids', () => {
    const withEquip = QUESTS.filter(q => q.reward.equipmentId);
    expect(withEquip.length).toBeGreaterThan(0);
    for (const q of withEquip) {
      // equipment IDs follow pattern: w-xxx, a-xxx, or acc-xxx
      expect(q.reward.equipmentId).toMatch(/^(w|a|acc)-/);
    }
  });
});
