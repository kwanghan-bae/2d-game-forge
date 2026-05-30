export type ComboStreakVariant = 'idle' | 'active' | 'hot' | 'blazing' | 'break';

export interface ComboStreakDisplay {
  variant: ComboStreakVariant;
  label: string;
  glowIntensity: number; // 0-1
}

const HOT_THRESHOLD = 5;
const BLAZING_THRESHOLD = 10;

export function getComboStreakDisplay(combo: number, isBreaking = false): ComboStreakDisplay {
  if (isBreaking) {
    return { variant: 'break', label: `×${combo}`, glowIntensity: 0 };
  }
  if (combo === 0) {
    return { variant: 'idle', label: '', glowIntensity: 0 };
  }
  if (combo >= BLAZING_THRESHOLD) {
    return { variant: 'blazing', label: `×${combo}`, glowIntensity: Math.min(1, combo / 30) };
  }
  if (combo >= HOT_THRESHOLD) {
    return { variant: 'hot', label: `×${combo}`, glowIntensity: 0.5 };
  }
  return { variant: 'active', label: `×${combo}`, glowIntensity: 0.2 };
}
