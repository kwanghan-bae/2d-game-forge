/**
 * C939: Tracks permanent (run-lifetime) non-buff rewards.
 * Unlike duration buffs that tick down, these persist until run end.
 * Examples: Stat Shards (+ATK), Enemy Morph (weakened enemies for N fights).
 */

export interface PermanentRewards {
  statShardAtk: number;
  enemyMorphRemaining: number; // fights remaining with weakened enemies
  enemyMorphDrRate: number;    // damage reduction rate applied to enemies during morph
}

const INITIAL: PermanentRewards = {
  statShardAtk: 0,
  enemyMorphRemaining: 0,
  enemyMorphDrRate: 0,
};

export class PermanentRewardTracker {
  private state: PermanentRewards = { ...INITIAL };

  grantStatShard(flatAtk: number): void {
    this.state.statShardAtk += flatAtk;
  }

  grantEnemyMorph(duration: number, drRate: number): void {
    this.state.enemyMorphRemaining = duration;
    this.state.enemyMorphDrRate = drRate;
  }

  tickEnemyMorph(): void {
    if (this.state.enemyMorphRemaining > 0) {
      this.state.enemyMorphRemaining--;
      if (this.state.enemyMorphRemaining === 0) {
        this.state.enemyMorphDrRate = 0;
      }
    }
  }

  get statShardAtk(): number { return this.state.statShardAtk; }
  get enemyMorphActive(): boolean { return this.state.enemyMorphRemaining > 0; }
  get enemyMorphDrRate(): number { return this.state.enemyMorphDrRate; }
  get enemyMorphRemaining(): number { return this.state.enemyMorphRemaining; }

  snapshot(): PermanentRewards { return { ...this.state }; }

  restore(s: Partial<PermanentRewards>): void {
    if (s.statShardAtk !== undefined) this.state.statShardAtk = s.statShardAtk;
    if (s.enemyMorphRemaining !== undefined) this.state.enemyMorphRemaining = s.enemyMorphRemaining;
    if (s.enemyMorphDrRate !== undefined) this.state.enemyMorphDrRate = s.enemyMorphDrRate;
  }

  reset(): void {
    this.state = { ...INITIAL };
  }
}
