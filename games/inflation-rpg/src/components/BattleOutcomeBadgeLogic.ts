/**
 * BattleOutcomeBadgeLogic — pure logic for determining battle outcome badge.
 * No React dependency, fully testable.
 */

export interface BattleOutcomeInput {
  turnCount: number;
  didCrit: boolean;
  wasCloseCall: boolean;
}

export interface BattleOutcomeResult {
  icon: string;
  label: string;
  variant: 'quick' | 'endurance' | 'critical' | 'close' | 'normal';
}

export function getBattleOutcome(input: BattleOutcomeInput): BattleOutcomeResult {
  if (input.wasCloseCall) {
    return { icon: '😰', label: 'Close Call', variant: 'close' };
  }
  if (input.turnCount <= 2) {
    return { icon: '⚡', label: 'Quick Victory', variant: 'quick' };
  }
  if (input.didCrit) {
    return { icon: '💥', label: 'Critical Finish', variant: 'critical' };
  }
  if (input.turnCount >= 10) {
    return { icon: '🛡️', label: 'Endurance Battle', variant: 'endurance' };
  }
  return { icon: '⚔️', label: 'Victory', variant: 'normal' };
}
