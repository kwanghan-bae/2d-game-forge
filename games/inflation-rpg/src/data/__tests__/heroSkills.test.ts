import { describe, it, expect } from 'vitest';
import { HERO_SKILLS, findSkillsForJob, findSkillById } from '../heroSkills';
import { JOBS } from '../jobs';

describe('hero skills catalog', () => {
  it('has at least 16 skills total', () => {
    expect(HERO_SKILLS.length).toBeGreaterThanOrEqual(16);
  });

  it('each skill has valid fields', () => {
    for (const s of HERO_SKILLS) {
      expect(s.id).toBeTruthy();
      expect(s.nameKR).toBeTruthy();
      expect(s.atkMul).toBeGreaterThan(0);
      expect(s.hpMul).toBeGreaterThan(0);
      expect(s.jobIds.length).toBeGreaterThan(0);
    }
  });

  it('every job has at least one matching skill (else hero with that job can never learn)', () => {
    for (const job of JOBS) {
      const skills = findSkillsForJob(job.id);
      expect(skills.length, `job ${job.id} has no skills`).toBeGreaterThan(0);
    }
  });

  it('findSkillById returns the right skill', () => {
    expect(findSkillById('strike')?.nameKR).toBe('일격');
    expect(findSkillById('nonexistent')).toBeUndefined();
  });

  // Cycle 262: dead skill tail polish — palm_strike atkMul 1.18 → 1.25.
  // monk/grandmaster 자격 도달 시 매력 ↑. sim tail (cycle 257 = 9 occurrences) 회복 후보.
  it('palm_strike atkMul ≥ 1.25 (cycle 262 dead-tail polish)', () => {
    const s = findSkillById('palm_strike')!;
    expect(s.atkMul).toBeGreaterThanOrEqual(1.25);
  });

  // Cycle 266: dead skill tail polish — curse hpMul 0.95 → 1.00.
  // hpMul 1 미만 패널티 완화. dark_lord/assassin 자격 도달 시 부담 ↓.
  it('curse hpMul ≥ 1.00 (cycle 266 dead-tail polish, 패널티 완화)', () => {
    const s = findSkillById('curse')!;
    expect(s.hpMul).toBeGreaterThanOrEqual(1.00);
  });

  // Cycle 273: dead skill tail polish — soul_drain atkMul 1.20 → 1.25.
  // dark_lord/mage 자격 도달 시 매력 ↑. cycle 257 sim tail 7 occurrences 회복 후보.
  it('soul_drain atkMul ≥ 1.25 (cycle 273 dead-tail polish)', () => {
    const s = findSkillById('soul_drain')!;
    expect(s.atkMul).toBeGreaterThanOrEqual(1.25);
  });
});
