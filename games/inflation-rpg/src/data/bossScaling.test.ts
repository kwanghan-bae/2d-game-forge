import { describe, it, expect } from 'vitest';
import { BOSSES } from './bosses';

describe('Boss HP/ATK scaling balance', () => {
  const normalBosses = BOSSES.filter(b => !b.isHardMode);
  const hardBosses = BOSSES.filter(b => b.isHardMode);

  it('higher bpReward tier has higher average hpMult', () => {
    const tiers = new Map<number, number[]>();
    for (const b of normalBosses) {
      if (!tiers.has(b.bpReward)) tiers.set(b.bpReward, []);
      tiers.get(b.bpReward)!.push(b.hpMult);
    }
    const sorted = [...tiers.entries()].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i++) {
      const prevAvg = sorted[i-1]![1].reduce((a, b) => a + b, 0) / sorted[i-1]![1].length;
      const currAvg = sorted[i]![1].reduce((a, b) => a + b, 0) / sorted[i]![1].length;
      expect(currAvg, `tier ${sorted[i]![0]} avg`).toBeGreaterThanOrEqual(prevAvg);
    }
  });

  it('hard bosses have higher hpMult than normal counterparts', () => {
    for (const hb of hardBosses) {
      const normalCounterpart = normalBosses.find(nb => nb.areaId === hb.areaId);
      if (normalCounterpart) {
        expect(hb.hpMult).toBeGreaterThanOrEqual(normalCounterpart.hpMult);
      }
    }
  });

  it('hpMult to atkMult ratio stays within 3:1 to 10:1 range', () => {
    for (const boss of BOSSES) {
      const ratio = boss.hpMult / boss.atkMult;
      expect(ratio, `${boss.id} ratio ${ratio}`).toBeGreaterThanOrEqual(3);
      expect(ratio, `${boss.id} ratio ${ratio}`).toBeLessThanOrEqual(10);
    }
  });

  it('max hpMult gap between adjacent normal bosses ≤ 20', () => {
    const sorted = [...normalBosses].sort((a, b) => a.hpMult - b.hpMult);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]!.hpMult - sorted[i - 1]!.hpMult;
      expect(gap, `gap between ${sorted[i-1]!.id} and ${sorted[i]!.id}`).toBeLessThanOrEqual(20);
    }
  });

  it('all bosses have valid bpReward (2-8)', () => {
    for (const boss of BOSSES) {
      expect(boss.bpReward).toBeGreaterThanOrEqual(2);
      expect(boss.bpReward).toBeLessThanOrEqual(8);
    }
  });
});
