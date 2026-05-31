import { describe, it, expect } from 'vitest';
import { PermanentRewardTracker } from '../encounter/PermanentRewardTracker';

describe('PermanentRewardTracker', () => {
  it('stat shard stacks', () => {
    const t = new PermanentRewardTracker();
    t.grantStatShard(3);
    t.grantStatShard(3);
    expect(t.statShardAtk).toBe(6);
  });

  it('enemy morph ticks down and deactivates', () => {
    const t = new PermanentRewardTracker();
    t.grantEnemyMorph(3, 0.20);
    expect(t.enemyMorphActive).toBe(true);
    expect(t.enemyMorphDrRate).toBe(0.20);
    t.tickEnemyMorph();
    t.tickEnemyMorph();
    expect(t.enemyMorphRemaining).toBe(1);
    t.tickEnemyMorph();
    expect(t.enemyMorphActive).toBe(false);
    expect(t.enemyMorphDrRate).toBe(0);
  });

  it('snapshot and restore', () => {
    const t = new PermanentRewardTracker();
    t.grantStatShard(5);
    t.grantEnemyMorph(2, 0.15);
    const snap = t.snapshot();
    const t2 = new PermanentRewardTracker();
    t2.restore(snap);
    expect(t2.statShardAtk).toBe(5);
    expect(t2.enemyMorphRemaining).toBe(2);
    expect(t2.enemyMorphDrRate).toBe(0.15);
  });

  it('reset clears all', () => {
    const t = new PermanentRewardTracker();
    t.grantStatShard(10);
    t.grantEnemyMorph(5, 0.25);
    t.reset();
    expect(t.statShardAtk).toBe(0);
    expect(t.enemyMorphActive).toBe(false);
  });
});
