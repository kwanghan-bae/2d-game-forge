/**
 * C804: DeclineStack — tracks consecutive event declines and provides
 * scaling rewards when the player finally accepts.
 *
 * Pure logic module. No side-effects.
 */
import {
  DECLINE_STACK_REWARD_THRESHOLD,
  DECLINE_STACK_FORCE_THRESHOLD,
  DECLINE_STACK_REWARD_MUL,
  DECLINE_STACK_MAX,
} from './constants-events';

export interface DeclineStackState {
  stacks: number;
}

export function createDeclineStack(): DeclineStackState {
  return { stacks: 0 };
}

/** Call when player declines an event. Returns new stack count. */
export function pushDecline(state: DeclineStackState): number {
  state.stacks = Math.min(state.stacks + 1, DECLINE_STACK_MAX);
  return state.stacks;
}

/** Call when player accepts an event. Consumes stacks and returns EXP multiplier bonus. */
export function consumeDeclineStack(state: DeclineStackState): number {
  const mul = state.stacks >= DECLINE_STACK_REWARD_THRESHOLD ? DECLINE_STACK_REWARD_MUL : 1;
  state.stacks = 0;
  return mul;
}

/** Whether the decline stack has reached the force threshold (rare event guaranteed). */
export function shouldForceRareEvent(state: DeclineStackState): boolean {
  return state.stacks >= DECLINE_STACK_FORCE_THRESHOLD;
}

/** Get current stack count. */
export function getDeclineStacks(state: DeclineStackState): number {
  return state.stacks;
}
