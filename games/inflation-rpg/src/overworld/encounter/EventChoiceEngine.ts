/**
 * C654: EventChoiceEngine — player choice state machine.
 * Manages shrine choices (gold/exp/heal) and danger zone fight/retreat decisions.
 * C691: Added Merchant, Gambler, and CursedAltar event choices for player agency.
 * Extracted from EncounterEngine to reduce coupling and improve testability.
 */

export enum ShrineChoice {
  GOLD = 0,
  EXP = 1,
  HEAL = 2,
}

export enum DangerChoice {
  NONE = -1,
  FIGHT = 0,
  RETREAT = 1,
}

export enum MerchantChoice {
  BUY = 0,
  SELL = 1,
  IGNORE = 2,
}

export enum GamblerChoice {
  BET_HIGH = 0,
  BET_LOW = 1,
  WALK_AWAY = 2,
}

export enum AltarChoice {
  SACRIFICE = 0,
  PRAY = 1,
  LEAVE = 2,
}

// C875: Proving Grounds player choice
export enum ProvingChoice {
  ACCEPT = 0,
  DECLINE = 1,
}

export class EventChoiceEngine {
  private shrineChoice: ShrineChoice | -1 = -1;
  private dangerChoice: DangerChoice = DangerChoice.NONE;
  private dangerPending = false;
  private merchantChoice: MerchantChoice = MerchantChoice.BUY;
  private merchantPending = false;
  private gamblerChoice: GamblerChoice = GamblerChoice.BET_LOW;
  private gamblerPending = false;
  private altarChoice: AltarChoice = AltarChoice.SACRIFICE;
  private altarPending = false;

  // --- Shrine ---

  hasPendingShrineChoice(): boolean {
    return this.shrineChoice >= 0;
  }

  setPendingShrineChoice(): void {
    this.shrineChoice = ShrineChoice.GOLD; // default
  }

  setShrineChoice(choice: ShrineChoice): void {
    this.shrineChoice = choice;
  }

  /** Resolve and consume the pending shrine choice. Returns the choice. */
  resolveShrineChoice(): ShrineChoice {
    const c = this.shrineChoice as ShrineChoice;
    this.shrineChoice = -1;
    return c;
  }

  // --- Danger Zone ---

  hasPendingDangerChoice(): boolean {
    return this.dangerPending;
  }

  enterDangerZone(): void {
    this.dangerPending = true;
    this.dangerChoice = DangerChoice.FIGHT; // default
  }

  setDangerChoice(retreat: boolean): void {
    this.dangerChoice = retreat ? DangerChoice.RETREAT : DangerChoice.FIGHT;
  }

  getDangerChoice(): DangerChoice {
    if (!this.dangerPending) return DangerChoice.NONE;
    return this.dangerChoice;
  }

  clearDangerChoice(): void {
    this.dangerPending = false;
    this.dangerChoice = DangerChoice.NONE;
  }

  exitDangerZone(): void {
    this.clearDangerChoice();
  }

  // --- Merchant ---

  hasPendingMerchantChoice(): boolean {
    return this.merchantPending;
  }

  triggerMerchant(): void {
    this.merchantPending = true;
    this.merchantChoice = MerchantChoice.BUY;
  }

  setMerchantChoice(choice: MerchantChoice): void {
    this.merchantChoice = choice;
  }

  resolveMerchantChoice(): MerchantChoice {
    const c = this.merchantChoice;
    this.merchantPending = false;
    this.merchantChoice = MerchantChoice.BUY;
    return c;
  }

  // --- Gambler ---

  hasPendingGamblerChoice(): boolean {
    return this.gamblerPending;
  }

  triggerGambler(): void {
    this.gamblerPending = true;
    this.gamblerChoice = GamblerChoice.BET_LOW;
  }

  setGamblerChoice(choice: GamblerChoice): void {
    this.gamblerChoice = choice;
  }

  resolveGamblerChoice(): GamblerChoice {
    const c = this.gamblerChoice;
    this.gamblerPending = false;
    this.gamblerChoice = GamblerChoice.BET_LOW;
    return c;
  }

  // --- Cursed Altar ---

  hasPendingAltarChoice(): boolean {
    return this.altarPending;
  }

  triggerAltar(): void {
    this.altarPending = true;
    this.altarChoice = AltarChoice.SACRIFICE;
  }

  setAltarChoice(choice: AltarChoice): void {
    this.altarChoice = choice;
  }

  resolveAltarChoice(): AltarChoice {
    const c = this.altarChoice;
    this.altarPending = false;
    this.altarChoice = AltarChoice.SACRIFICE;
    return c;
  }

  // --- Proving Grounds (C875) ---
  private provingPending = false;
  private provingChoice: ProvingChoice = ProvingChoice.ACCEPT;

  hasPendingProvingChoice(): boolean {
    return this.provingPending;
  }

  triggerProving(): void {
    this.provingPending = true;
    this.provingChoice = ProvingChoice.ACCEPT; // default (AI fallback)
  }

  setProvingChoice(choice: ProvingChoice): void {
    this.provingChoice = choice;
  }

  resolveProvingChoice(): ProvingChoice {
    const c = this.provingChoice;
    this.provingPending = false;
    this.provingChoice = ProvingChoice.ACCEPT;
    return c;
  }
}
