export interface ResolverFixture {
  name: string;
  monsterLevel: number;
  isBoss: boolean;
  bossType?: 'mini' | 'major' | 'sub' | 'final';
  hpMult: number;
  playerATK: number;
  crit: boolean;
  reduction: number;
}

// `bossType` is metadata for future resolver design (Task 2). All boss types
// share the same hpMult formula in current BattleScene.
export const FIXTURES: ReadonlyArray<ResolverFixture> = [
  { name: 'lv1 normal',      monsterLevel: 1,    isBoss: false, hpMult: 1.0, playerATK: 100,    crit: false, reduction: 0   },
  { name: 'lv10 normal crit',monsterLevel: 10,   isBoss: false, hpMult: 1.5, playerATK: 500,    crit: true,  reduction: 0.1 },
  { name: 'lv30 mini',       monsterLevel: 30,   isBoss: true,  bossType: 'mini',  hpMult: 2.0, playerATK: 1000, crit: false, reduction: 0.3 },
  { name: 'lv180 final',     monsterLevel: 180,  isBoss: true,  bossType: 'final', hpMult: 5.0, playerATK: 5000, crit: true,  reduction: 0.5 },
  { name: 'lv1000 deep',     monsterLevel: 1000, isBoss: false, hpMult: 1.0, playerATK: 50_000, crit: false, reduction: 0.7 },
];
