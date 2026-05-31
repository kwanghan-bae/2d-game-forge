// C833: Run Statistics accumulator — tracks per-run metrics for player feedback
export interface RunHighlight {
  key: string;
  value: number;
  priority: number;
}

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
  gambitGoldNet: number; // C839: gold gained minus gold from gambit bets
  gambitHpCost: number; // C839: total HP lost from gambit failures
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
    gambitGoldNet: 0,
    gambitHpCost: 0,
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

  recordGambitOutcome(goldDelta: number, hpCost: number): void {
    this.data.gambitGoldNet += goldDelta;
    this.data.gambitHpCost += hpCost;
  }

  // C842: Pick top-3 highlights from run stats for player summary
  computeHighlights(): RunHighlight[] {
    const candidates: RunHighlight[] = [];
    const d = this.data;
    if (d.peakCombo >= 10) candidates.push({ key: 'peak_combo', value: d.peakCombo, priority: d.peakCombo });
    if (d.bossKills >= 1) candidates.push({ key: 'boss_kills', value: d.bossKills, priority: d.bossKills * 10 });
    if (d.eliteKills >= 3) candidates.push({ key: 'elite_kills', value: d.eliteKills, priority: d.eliteKills * 3 });
    if (d.criticalHits >= 5) candidates.push({ key: 'critical_hits', value: d.criticalHits, priority: d.criticalHits });
    if (d.overkills >= 3) candidates.push({ key: 'overkills', value: d.overkills, priority: d.overkills * 2 });
    if (d.goldEarned >= 100) candidates.push({ key: 'gold_earned', value: d.goldEarned, priority: Math.floor(d.goldEarned / 50) });
    if (d.gambitGoldNet > 0) candidates.push({ key: 'gambit_profit', value: d.gambitGoldNet, priority: Math.floor(d.gambitGoldNet / 10) });
    if (d.gambitsWon >= 2) candidates.push({ key: 'gambits_won', value: d.gambitsWon, priority: d.gambitsWon * 5 });
    if (d.deaths === 0 && d.totalFights >= 20) candidates.push({ key: 'deathless', value: d.totalFights, priority: d.totalFights });
    if (d.peakLevel >= 5) candidates.push({ key: 'peak_level', value: d.peakLevel, priority: d.peakLevel * 2 });
    const eventCount = Object.values(d.eventsTriggered).reduce((a, b) => a + b, 0);
    if (eventCount >= 5) candidates.push({ key: 'events_total', value: eventCount, priority: eventCount });
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates.slice(0, 3);
  }

  snapshot(): RunStatisticsData {
    return { ...this.data, eventsTriggered: { ...this.data.eventsTriggered } };
  }

  reset(): void {
    this.data = createEmptyRunStatistics();
  }
}
