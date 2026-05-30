export interface ExpBreakdownEntry {
  name: string;
  value: number;
}

export interface ExpBreakdownDisplay {
  category: string;
  percent: number;
  label: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: '🔥 Core',
  combo: '⚡ Combo',
  combat: '⚔️ Combat',
  progress: '📈 Progress',
  danger: '💀 Danger',
  prestige: '👑 Prestige',
  misc: '✨ Misc',
};

const DISPLAY_THRESHOLD = 20; // only show if top contributor adds ≥20%

export function getExpBreakdownDisplay(breakdown: ExpBreakdownEntry[]): ExpBreakdownDisplay | null {
  if (breakdown.length === 0) return null;

  const top = breakdown[0];
  const bonusPercent = Math.round((top.value - 1) * 100);

  if (bonusPercent < DISPLAY_THRESHOLD) return null;

  const categoryLabel = CATEGORY_LABELS[top.name] ?? top.name;
  return {
    category: top.name,
    percent: bonusPercent,
    label: `${categoryLabel} +${bonusPercent}%`,
  };
}
