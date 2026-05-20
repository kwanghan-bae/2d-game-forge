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
});
