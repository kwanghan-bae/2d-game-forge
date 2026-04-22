export interface ForgeCSSTokens {
  '--forge-bg-base': string;
  '--forge-bg-panel': string;
  '--forge-bg-card': string;
  '--forge-border': string;
  '--forge-accent': string;
  '--forge-accent-dim': string;
  '--forge-text-primary': string;
  '--forge-text-secondary': string;
  '--forge-text-muted': string;
  '--forge-stat-hp': string;
  '--forge-stat-atk': string;
  '--forge-stat-def': string;
  '--forge-stat-agi': string;
  '--forge-stat-luc': string;
  '--forge-stat-bp': string;
  '--forge-danger': string;
}

export type ForgeStatToken = 'hp' | 'atk' | 'def' | 'agi' | 'luc' | 'bp';

export interface ForgeButtonProps {
  variant?: 'primary' | 'secondary' | 'disabled';
}

export interface ForgePanelProps {
  variant?: 'inset' | 'elevated';
}

export interface ForgeGaugeProps {
  value: number;
  stat?: ForgeStatToken;
  label?: string;
}

export interface ForgeInventoryGridProps {
  columns?: 2 | 3 | 4;
}
