export interface ResolverFixture {
  name: string;
  monsterLevel: number;
  isBoss: boolean;
  bossType?: 'mini' | 'major' | 'sub' | 'final';
  hpMult: number;
  playerATK: number;
  crit: boolean;
}

export const FIXTURES: ReadonlyArray<ResolverFixture> = [
  { name: 'lv1 normal',      monsterLevel: 1,    isBoss: false, hpMult: 1.0, playerATK: 100,    crit: false },
  { name: 'lv10 normal crit',monsterLevel: 10,   isBoss: false, hpMult: 1.5, playerATK: 500,    crit: true  },
  { name: 'lv30 mini',       monsterLevel: 30,   isBoss: true,  bossType: 'mini',  hpMult: 2.0, playerATK: 1000, crit: false },
  { name: 'lv180 final',     monsterLevel: 180,  isBoss: true,  bossType: 'final', hpMult: 5.0, playerATK: 5000, crit: true  },
  { name: 'lv1000 deep',     monsterLevel: 1000, isBoss: false, hpMult: 1.0, playerATK: 50_000, crit: false },
];
