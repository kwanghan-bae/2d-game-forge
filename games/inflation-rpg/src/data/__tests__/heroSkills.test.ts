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

  // Cycle 307: mage skill cluster polish 가드 (cycle 304 fireball + cycle 306 icebolt).
  it('mage skill cluster (fireball + icebolt) atkMul ≥ 1.20', () => {
    expect(findSkillById('fireball')!.atkMul).toBeGreaterThanOrEqual(1.20);
    expect(findSkillById('icebolt')!.atkMul).toBeGreaterThanOrEqual(1.20);
  });

  // Cycle 312: warrior skill cluster (strike polish cycle 309).
  it('strike atkMul ≥ 1.15 (cycle 309 polish)', () => {
    expect(findSkillById('strike')!.atkMul).toBeGreaterThanOrEqual(1.15);
  });

  // Cycle 315: cleave polish 가드 (cycle 313).
  it('cleave atkMul ≥ 1.12 (cycle 313 polish)', () => {
    expect(findSkillById('cleave')!.atkMul).toBeGreaterThanOrEqual(1.12);
  });

  // Cycle 322: full warrior cluster invariant (strike + cleave + shield_wall hpMul).
  it('warrior cluster: strike + cleave atkMul + shield_wall hpMul', () => {
    expect(findSkillById('strike')!.atkMul).toBeGreaterThanOrEqual(1.15);
    expect(findSkillById('cleave')!.atkMul).toBeGreaterThanOrEqual(1.12);
    expect(findSkillById('shield_wall')!.hpMul).toBeGreaterThan(1.0);
  });

  // Cycle 325: rogue cluster invariant (shadow_step polish cycle 324).
  it('shadow_step atkMul ≥ 1.18 (cycle 324)', () => {
    expect(findSkillById('shadow_step')!.atkMul).toBeGreaterThanOrEqual(1.18);
  });

  // Cycle 329: backstab polish (cycle 328).
  it('backstab atkMul ≥ 1.25 (cycle 328)', () => {
    expect(findSkillById('backstab')!.atkMul).toBeGreaterThanOrEqual(1.25);
  });

  // Cycle 333: poison polish (cycle 332).
  it('poison atkMul ≥ 1.15 + hpMul ≥ 1.00 (cycle 332)', () => {
    const s = findSkillById('poison')!;
    expect(s.atkMul).toBeGreaterThanOrEqual(1.15);
    expect(s.hpMul).toBeGreaterThanOrEqual(1.00);
  });

  // Cycle 337: multishot polish (cycle 335).
  it('multishot atkMul ≥ 1.20 (cycle 335)', () => {
    expect(findSkillById('multishot')!.atkMul).toBeGreaterThanOrEqual(1.20);
  });

  // Cycle 339: aim polish (cycle 338).
  it('aim atkMul ≥ 1.22 + hpMul ≥ 1.00 (cycle 338)', () => {
    const s = findSkillById('aim')!;
    expect(s.atkMul).toBeGreaterThanOrEqual(1.22);
    expect(s.hpMul).toBeGreaterThanOrEqual(1.00);
  });

  // Cycle 343: wind_walk polish (cycle 342).
  it('wind_walk atkMul ≥ 1.12 (cycle 342)', () => {
    expect(findSkillById('wind_walk')!.atkMul).toBeGreaterThanOrEqual(1.12);
  });
});
