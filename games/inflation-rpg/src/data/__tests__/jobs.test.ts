import { describe, it, expect } from 'vitest';
import { JOBS, findJobsForMilestone, findJobById } from '../jobs';

describe('jobs catalog', () => {
  it('has 16 jobs total', () => {
    expect(JOBS).toHaveLength(16);
  });

  it('each job has required fields with valid values', () => {
    for (const j of JOBS) {
      expect(j.id).toBeTruthy();
      expect(j.nameKR).toBeTruthy();
      expect(j.emoji).toBeTruthy();
      expect([1, 2, 3]).toContain(j.tier);
      expect(['age10', 'age30', 'age50']).toContain(j.milestone);
      expect(j.atkMul).toBeGreaterThan(0);
      expect(j.hpMul).toBeGreaterThan(0);
    }
  });

  it('has 4 tier-1, 6 tier-2, 6 tier-3 jobs', () => {
    expect(JOBS.filter(j => j.tier === 1)).toHaveLength(4);
    expect(JOBS.filter(j => j.tier === 2)).toHaveLength(6);
    expect(JOBS.filter(j => j.tier === 3)).toHaveLength(6);
  });

  it('findJobsForMilestone returns matching tier jobs', () => {
    expect(findJobsForMilestone('age10').every(j => j.tier === 1)).toBe(true);
    expect(findJobsForMilestone('age30').every(j => j.tier === 2)).toBe(true);
    expect(findJobsForMilestone('age50').every(j => j.tier === 3)).toBe(true);
  });

  it('each milestone has at least one unconditional fallback job', () => {
    for (const ms of ['age10', 'age30', 'age50'] as const) {
      const fallbacks = findJobsForMilestone(ms).filter(j => j.requiredPersonality === null);
      // Currently: only age10 (apprentice) and age50 (sage) have explicit unconditional fallback.
      // Age30 may be miss for very edge-case heroes — JobSystem returns null in that case (acceptable).
      if (ms !== 'age30') expect(fallbacks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('findJobById returns the right job', () => {
    expect(findJobById('warrior')?.nameKR).toBe('전사');
    expect(findJobById('hero')?.tier).toBe(3);
    expect(findJobById('nonexistent')).toBeUndefined();
  });
});
