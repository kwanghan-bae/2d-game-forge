/**
 * C804/C806: DeclineStack — tracks consecutive event declines and provides
 * scaling rewards when the player finally accepts.
 *
 * Pure logic module. No side-effects.
 * C806: Linear scaling gradient — more stacks = bigger reward.
 */
import {
  DECLINE_STACK_REWARD_THRESHOLD,
  DECLINE_STACK_FORCE_THRESHOLD,
  DECLINE_STACK_MAX,
} from './constants-events';

// C806: per-stack bonus (2→×1.5, 3→×1.75, 4→×2.0, 5→×2.25, 6→×2.5)
const DECLINE_STACK_BASE_MUL = 1.0;
const DECLINE_STACK_PER_STACK = 0.25;

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

/** Call when player accepts an event. Consumes stacks and returns EXP multiplier.
 *  C806: linear scaling — each stack beyond threshold adds +0.25 */
export function consumeDeclineStack(state: DeclineStackState): number {
  if (state.stacks < DECLINE_STACK_REWARD_THRESHOLD) {
    state.stacks = 0;
    return 1;
  }
  const mul = DECLINE_STACK_BASE_MUL + state.stacks * DECLINE_STACK_PER_STACK;
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
