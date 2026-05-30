/**
 * C654: EventChoiceEngine — player choice state machine.
 * Manages shrine choices (gold/exp/heal) and danger zone fight/retreat decisions.
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

export class EventChoiceEngine {
  private shrineChoice: ShrineChoice | -1 = -1;
  private dangerChoice: DangerChoice = DangerChoice.NONE;
  private dangerPending = false;

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
}
