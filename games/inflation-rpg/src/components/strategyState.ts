/** Pure run-scoped strategy state shared by the UI and combat resolver. */
let strategyState: Record<string, boolean> = {
  gambler: true,
  cursedAltar: true,
  merchant: true,
  restShrine: true,
  blacksmith: true,
};

export function getStrategyEnabled(id: string): boolean {
  return strategyState[id] ?? true;
}

export function getStrategySnapshot(): Record<string, boolean> {
  return { ...strategyState };
}

export function setStrategyEnabled(id: string, enabled: boolean): void {
  strategyState[id] = enabled;
}

export function resetStrategy(): void {
  strategyState = {
    gambler: true,
    cursedAltar: true,
    merchant: true,
    restShrine: true,
    blacksmith: true,
  };
}
