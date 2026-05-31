import { describe, it, expect } from 'vitest';
import { computePostVictoryExp, type PostVictoryExpParams } from '../encounter/PostVictoryExpCalculator';

const base: PostVictoryExpParams = {
  baseExpGain: 100,
  expMul: 1.0,
  declineStackActive: false,
  declineStackExpMul: 1.5,
  soulForgeStacks: 0,
  soulForgeExpPerStack: 0.03,
  mentorActive: false,
  mentorExpMul: 0.25,
  crossroadsExpActive: false,
  crossroadsExpMul: 1.25,
  earlyMomentumExpActive: false,
  earlyMomentumExpMul: 1.15,
  heroLevel: 10,
};

describe('computePostVictoryExp', () => {
  it('no bonuses → raw = base × expMul', () => {
    const r = computePostVictoryExp(base);
    expect(r.rawExp).toBe(100);
    expect(r.cappedExp).toBe(100);
  });

  it('decline stack active → applies declineStackExpMul', () => {
    const r = computePostVictoryExp({ ...base, declineStackActive: true });
    expect(r.rawExp).toBe(150); // 100 * 1.5
  });

  it('soul forge stacks → multiplicative', () => {
    const r = computePostVictoryExp({ ...base, soulForgeStacks: 5 });
    // sfm = 1 + 5*0.03 = 1.15 → floor(100*1.15) = 114 (IEEE 754)
    expect(r.rawExp).toBe(114);
  });

  it('mentor active → +25%', () => {
    const r = computePostVictoryExp({ ...base, mentorActive: true });
    expect(r.rawExp).toBe(125);
  });

  it('crossroads exp active → applies crossroadsExpMul', () => {
    const r = computePostVictoryExp({ ...base, crossroadsExpActive: true });
    expect(r.rawExp).toBe(125);
  });

  it('early momentum exp active → applies earlyMomentumExpMul', () => {
    const r = computePostVictoryExp({ ...base, earlyMomentumExpActive: true });
    expect(r.rawExp).toBe(114); // floor(100*1.15) = 114 (IEEE 754)
  });

  it('all bonuses stacked', () => {
    const r = computePostVictoryExp({
      ...base,
      declineStackActive: true,
      soulForgeStacks: 5,
      mentorActive: true,
      crossroadsExpActive: true,
      earlyMomentumExpActive: true,
    });
    // 100 * 1.0 * 1.5 * 1.15 * 1.25 * 1.25 * 1.15 ≈ 309.6 → floor = 309 (IEEE 754)
    expect(r.rawExp).toBe(309);
  });

  it('cap at heroLevel × 500', () => {
    const r = computePostVictoryExp({ ...base, baseExpGain: 100000, heroLevel: 1 });
    expect(r.cappedExp).toBe(500);
    expect(r.rawExp).toBe(100000);
  });
});
