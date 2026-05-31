/**
 * C882: ChoiceHistory — tracks player choices during a run.
 * Used to compute consequence payoffs in late-game events (C883+).
 * Pure data structure, no side effects.
 */

export type ChoiceCategory = 'aggressive' | 'defensive' | 'greedy';

export interface ChoiceRecord {
  fight: number;
  event: string;
  choice: string;
  category: ChoiceCategory;
}

export class ChoiceHistory {
  private records: ChoiceRecord[] = [];

  record(fight: number, event: string, choice: string, category: ChoiceCategory): void {
    this.records.push({ fight, event, choice, category });
  }

  /** Count choices by category */
  countByCategory(category: ChoiceCategory): number {
    return this.records.filter(r => r.category === category).length;
  }

  /** Get dominant playstyle based on choices */
  getDominantStyle(): ChoiceCategory | 'balanced' {
    const agg = this.countByCategory('aggressive');
    const def = this.countByCategory('defensive');
    const gre = this.countByCategory('greedy');
    const max = Math.max(agg, def, gre);
    if (max === 0) return 'balanced';
    if (agg === max && agg > def && agg > gre) return 'aggressive';
    if (def === max && def > agg && def > gre) return 'defensive';
    if (gre === max && gre > agg && gre > def) return 'greedy';
    return 'balanced';
  }

  /** Total choices made */
  get totalChoices(): number {
    return this.records.length;
  }

  /** Get all records (readonly) */
  getRecords(): readonly ChoiceRecord[] {
    return this.records;
  }

  /** Reset for new run */
  reset(): void {
    this.records = [];
  }
}

/** Classify a choice into a category */
export function classifyChoice(event: string, choice: string): ChoiceCategory {
  // Proving: accept=aggressive, decline=defensive
  if (event === 'proving') return choice === 'accept' ? 'aggressive' : 'defensive';
  // Mercenary: accept=defensive (shield), decline=greedy (save gold)
  if (event === 'mercenary') return choice === 'accept' ? 'defensive' : 'greedy';
  // Crossroads: atk=aggressive, exp=greedy (investment), gold=greedy
  if (event === 'crossroads') {
    if (choice === 'atk') return 'aggressive';
    return 'greedy';
  }
  // Merchant: heal=defensive, atk=aggressive, gamble=greedy
  if (event === 'merchant') {
    if (choice === 'heal') return 'defensive';
    if (choice === 'atk') return 'aggressive';
    return 'greedy';
  }
  // C890: Last Stand: accept=aggressive, decline=defensive
  if (event === 'last_stand') return choice === 'accept' ? 'aggressive' : 'defensive';
  // C911: First Trial: heal=defensive, atk=aggressive
  if (event === 'first_trial') return choice === 'heal' ? 'defensive' : choice === 'exp' ? 'balanced' : 'aggressive';
  return 'defensive';
}
