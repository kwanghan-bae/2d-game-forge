import type { TutorialStep } from '../types';

// V1a — legacy tutorial steps removed. V1b will define a new onboarding flow.
export const TUTORIAL_STEPS: TutorialStep[] = [];

export function getTutorialStep(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}
