/**
 * AtkBreakdownLogic — computes ATK multiplier category breakdown for tooltip.
 * Pure function, no side effects. C676.
 */

export interface AtkBreakdownInput {
  flatAtk: number;
  coreMuls: number;
  conditionMuls: number;
  goldMuls: number;
  combatMuls: number;
  progressMuls: number;
  chainMuls: number;
  tradeoffMuls: number;
  systemMuls: number;
  atkCap: number;
}

export interface AtkBreakdownCategory {
  name: string;
  value: number;
  sign: 'positive' | 'negative' | 'neutral';
  label: string;
}

export interface AtkBreakdownResult {
  finalAtk: number;
  flatAtk: number;
  categories: AtkBreakdownCategory[];
  capActive: boolean;
  totalMulsRaw: number;
  totalMulsCapped: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: '기본 배율',
  condition: '상태 배율',
  gold: '골드 배율',
  combat: '전투 배율',
  progress: '진행 배율',
  chain: '연쇄 배율',
  tradeoff: '트레이드오프',
  system: '시스템 배율',
};

export function computeAtkBreakdown(input: AtkBreakdownInput): AtkBreakdownResult {
  const { flatAtk, coreMuls, conditionMuls, goldMuls, combatMuls, progressMuls, chainMuls, tradeoffMuls, systemMuls, atkCap } = input;

  const muls = [
    { name: 'core', value: coreMuls },
    { name: 'condition', value: conditionMuls },
    { name: 'gold', value: goldMuls },
    { name: 'combat', value: combatMuls },
    { name: 'progress', value: progressMuls },
    { name: 'chain', value: chainMuls },
    { name: 'tradeoff', value: tradeoffMuls },
    { name: 'system', value: systemMuls },
  ];

  const totalMulsRaw = coreMuls * conditionMuls * goldMuls * combatMuls * progressMuls * chainMuls * tradeoffMuls * systemMuls;
  const capActive = totalMulsRaw > atkCap;
  const totalMulsCapped = Math.min(atkCap, totalMulsRaw);
  const finalAtk = Math.max(1, Math.floor(flatAtk * totalMulsCapped));

  const categories: AtkBreakdownCategory[] = muls.map(m => ({
    name: m.name,
    value: m.value,
    sign: m.value > 1.001 ? 'positive' : m.value < 0.999 ? 'negative' : 'neutral',
    label: CATEGORY_LABELS[m.name] || m.name,
  }));

  return { finalAtk, flatAtk, categories, capActive, totalMulsRaw, totalMulsCapped };
}
