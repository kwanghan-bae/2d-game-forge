import {
  RELIC_UPGRADE_BONUS,
  RELIC_PRESTIGE_RETENTION,
  HOURGLASS_DURATION_MUL,
} from './constants-events';

export const RELIC_IDS = {
  EMBER_CROWN: 0,
  MISER_POUCH: 1,
  PHOENIX_FEATHER: 2,
  HOURGLASS: 3,
  BLOOD_PACT: 4,
  SCHOLAR_LENS: 5,
} as const;

const RELIC_NAMES = ['Ember Crown', "Miser's Pouch", 'Phoenix Feather', 'Hourglass', 'Blood Pact', "Scholar's Lens"];

export interface RelicState {
  relics: number[];
  relicLevels: number[];
  imprintedRelic: number;
  imprintedRelicLevel: number;
}

export class RelicEffectResolver {
  private relics: number[];
  private relicLevels: number[];
  private imprintedRelic: number;
  private imprintedRelicLevel: number;

  constructor(state: RelicState) {
    this.relics = [...state.relics];
    this.relicLevels = [...state.relicLevels];
    this.imprintedRelic = state.imprintedRelic;
    this.imprintedRelicLevel = state.imprintedRelicLevel;
  }

  hasRelic(id: number): boolean {
    return this.relics.includes(id) || this.imprintedRelic === id;
  }

  getRelicPower(id: number): number {
    const idx = this.relics.indexOf(id);
    if (idx >= 0) {
      const level = this.relicLevels[idx] ?? 1;
      return level * (1 + (level > 1 ? RELIC_UPGRADE_BONUS : 0));
    }
    if (this.imprintedRelic === id) return RELIC_PRESTIGE_RETENTION * this.imprintedRelicLevel;
    return 0;
  }

  getRelicsDisplay(): { id: number; level: number; name: string }[] {
    return this.relics.map((id, i) => ({ id, level: this.relicLevels[i] || 1, name: RELIC_NAMES[id] || 'Unknown' }));
  }

  getImprintedRelicDisplay(): { id: number; name: string } | null {
    if (this.imprintedRelic < 0) return null;
    return { id: this.imprintedRelic, name: RELIC_NAMES[this.imprintedRelic] || 'Unknown' };
  }

  hourglassDurationMul(): number {
    return this.hasRelic(RELIC_IDS.HOURGLASS) ? HOURGLASS_DURATION_MUL : 1;
  }

  dropRelic(id: number): boolean {
    if (this.relics.length >= 3) return false;
    if (this.relics.includes(id)) return false;
    this.relics.push(id);
    this.relicLevels.push(1);
    return true;
  }

  upgradeRelic(idx: number): void {
    if (idx < 0 || idx >= this.relicLevels.length) return;
    this.relicLevels[idx] = Math.min((this.relicLevels[idx] || 1) + 1, 5);
  }

  consumePhoenixFeather(): boolean {
    const idx = this.relics.indexOf(RELIC_IDS.PHOENIX_FEATHER);
    if (idx < 0) return false;
    this.relics.splice(idx, 1);
    this.relicLevels.splice(idx, 1);
    return true;
  }

  prestigeImprint(): void {
    if (this.relics.length === 0) return;
    let bestIdx = 0;
    for (let i = 1; i < this.relics.length; i++) {
      if ((this.relicLevels[i] || 1) > (this.relicLevels[bestIdx] || 1)) bestIdx = i;
    }
    this.imprintedRelic = this.relics[bestIdx];
    this.imprintedRelicLevel = this.relicLevels[bestIdx] || 1;
    this.relics = [];
    this.relicLevels = [];
  }

  get count(): number { return this.relics.length; }

  snapshot(): RelicState {
    return {
      relics: [...this.relics],
      relicLevels: [...this.relicLevels],
      imprintedRelic: this.imprintedRelic,
      imprintedRelicLevel: this.imprintedRelicLevel,
    };
  }
}
