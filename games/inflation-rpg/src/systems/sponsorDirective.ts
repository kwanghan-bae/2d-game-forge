/**
 * C1008 — Sponsor Directive System
 * Pre-cycle choice that meaningfully shapes the entire cycle's outcomes.
 */

import type { SponsorDirective } from '../types';

export interface DirectiveEffects {
  critBonus: number;       // additive crit % bonus
  goldMul: number;         // multiplicative gold factor
  expMul: number;          // multiplicative exp factor
  jpMul: number;           // multiplicative JP factor
  dropRateBonus: number;   // additive drop rate bonus
}

const DIRECTIVE_EFFECTS: Record<SponsorDirective, DirectiveEffects> = {
  aggression: {
    critBonus: 0.15,
    goldMul: 1.0,
    expMul: 1.0,
    jpMul: 1.0,
    dropRateBonus: 0,
  },
  hoarding: {
    critBonus: 0,
    goldMul: 1.4,
    expMul: 0.8,
    jpMul: 1.0,
    dropRateBonus: 0.20,
  },
  training: {
    critBonus: 0,
    goldMul: 0.6,
    expMul: 1.3,
    jpMul: 1.5,
    dropRateBonus: 0,
  },
};

export function getDirectiveEffects(directive: SponsorDirective | null): DirectiveEffects {
  if (!directive) {
    return { critBonus: 0, goldMul: 1.0, expMul: 1.0, jpMul: 1.0, dropRateBonus: 0 };
  }
  return DIRECTIVE_EFFECTS[directive];
}

export interface DirectiveInfo {
  id: SponsorDirective;
  name: string;
  description: string;
  tradeoff: string;
}

export const DIRECTIVE_INFO: DirectiveInfo[] = [
  {
    id: 'aggression',
    name: '공격 교서',
    description: '치명타 확률 +15%',
    tradeoff: '특별 보정 없음 — 순수 공격 특화',
  },
  {
    id: 'hoarding',
    name: '축재 교서',
    description: '골드 ×1.4, 드롭률 +20%',
    tradeoff: '경험치 ×0.8 (레벨링 느림)',
  },
  {
    id: 'training',
    name: '수련 교서',
    description: '경험치 ×1.3, JP ×1.5',
    tradeoff: '골드 ×0.6 (수입 감소)',
  },
];
