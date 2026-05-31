// C833: Run Statistics accumulator — tracks per-run metrics for player feedback
export interface RunStatisticsData {
  totalFights: number;
  deaths: number;
  eventsTriggered: Record<string, number>;
  peakCombo: number;
  peakLevel: number;
  goldEarned: number;
  goldLost: number;
  buffsActivated: number;
  gambitsWon: number;
  gambitsLost: number;
  gambitsAutoResolved: number;
  bossKills: number;
  eliteKills: number;
  criticalHits: number;
  overkills: number;
  merchantHeals: number;
  merchantAtkBuffs: number;
}

export function createEmptyRunStatistics(): RunStatisticsData {
  return {
    totalFights: 0,
    deaths: 0,
    eventsTriggered: {},
    peakCombo: 0,
    peakLevel: 0,
    goldEarned: 0,
    goldLost: 0,
    buffsActivated: 0,
    gambitsWon: 0,
    gambitsLost: 0,
    gambitsAutoResolved: 0,
    bossKills: 0,
    eliteKills: 0,
    criticalHits: 0,
    overkills: 0,
    merchantHeals: 0,
    merchantAtkBuffs: 0,
  };
}

export class RunStatistics {
  private data: RunStatisticsData;

  constructor(initial?: Partial<RunStatisticsData>) {
    this.data = { ...createEmptyRunStatistics(), ...initial };
  }

  recordFight(): void {
    this.data.totalFights++;
  }

  recordDeath(): void {
    this.data.deaths++;
  }

  recordEvent(eventType: string): void {
    this.data.eventsTriggered[eventType] = (this.data.eventsTriggered[eventType] ?? 0) + 1;
  }

  recordCombo(combo: number): void {
    if (combo > this.data.peakCombo) this.data.peakCombo = combo;
  }

  recordLevel(level: number): void {
    if (level > this.data.peakLevel) this.data.peakLevel = level;
  }

  recordGoldEarned(amount: number): void {
    this.data.goldEarned += amount;
  }

  recordGoldLost(amount: number): void {
    this.data.goldLost += amount;
  }

  recordBuff(): void {
    this.data.buffsActivated++;
  }

  recordGambit(won: boolean, autoResolved: boolean): void {
    if (autoResolved) this.data.gambitsAutoResolved++;
    if (won) this.data.gambitsWon++;
    else this.data.gambitsLost++;
  }

  recordBossKill(): void {
    this.data.bossKills++;
  }

  recordEliteKill(): void {
    this.data.eliteKills++;
  }

  recordCriticalHit(): void {
    this.data.criticalHits++;
  }

  recordOverkill(): void {
    this.data.overkills++;
  }

  recordMerchant(choice: 'heal' | 'atk'): void {
    if (choice === 'heal') this.data.merchantHeals++;
    else this.data.merchantAtkBuffs++;
  }

  snapshot(): RunStatisticsData {
    return { ...this.data, eventsTriggered: { ...this.data.eventsTriggered } };
  }

  reset(): void {
    this.data = createEmptyRunStatistics();
  }
}
