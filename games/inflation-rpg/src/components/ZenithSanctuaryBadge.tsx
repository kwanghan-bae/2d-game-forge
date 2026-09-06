/**
 * ZenithSanctuaryBadge.tsx — C1109: Apex Zenith Sanctuary Honor Badge UI.
 *
 * Renders the hero's highest Apex Trial Sanctuary title and permanent blessing indicators.
 */

import React from 'react';
import {
  computeSanctuaryBlessings,
  getHighestSanctuaryTitle,
} from '../systems/apexZenithSanctuary';

interface Props {
  clearedTiers?: number[];
  size?: 'sm' | 'md' | 'lg';
  hideZero?: boolean;
}

const TIER_STYLES: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'rgba(71, 85, 105, 0.15)', border: '#475569', text: '#94a3b8' },
  1: { bg: 'rgba(249, 115, 22, 0.18)', border: '#ea580c', text: '#fdba74' },
  2: { bg: 'rgba(168, 85, 247, 0.18)', border: '#9333ea', text: '#d8b4fe' },
  3: { bg: 'rgba(251, 191, 36, 0.22)', border: '#d97706', text: '#fde047' },
};

export function ZenithSanctuaryBadge({
  clearedTiers = [],
  size = 'md',
  hideZero = false,
}: Props) {
  const blessings = computeSanctuaryBlessings(clearedTiers);
  const count = blessings.clearedTiersCount;

  if (hideZero && count <= 0) {
    return null;
  }

  const title = getHighestSanctuaryTitle(clearedTiers);
  const styles = TIER_STYLES[count] ?? TIER_STYLES[0];

  const sizeConfig = {
    sm: { fontSize: 10, padding: '1px 6px', gap: 4 },
    md: { fontSize: 11, padding: '2px 8px', gap: 5 },
    lg: { fontSize: 13, padding: '4px 10px', gap: 6 },
  }[size];

  const tooltip = [
    `[무극 전승 성소 축복: ${count}/3단계]`,
    `전 능력치: +${Math.round((blessings.omniStatMultiplier - 1) * 100)}%`,
    `피해 경감: +${Math.round(blessings.damageReduction * 100)}%`,
    `치명 피해: +${Math.round(blessings.critDmgBonus * 100)}%`,
    blessings.finalDmgMultiplier > 1 ? '최종 피해: +10%' : '',
    blessings.defPierceBonus > 0 ? '방어 관통: +10%' : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      data-testid="zenith-sanctuary-badge"
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 6,
        padding: sizeConfig.padding,
        fontSize: sizeConfig.fontSize,
        color: styles.text,
        fontWeight: 'bold',
        cursor: 'help',
        userSelect: 'none',
      }}
    >
      <span>{title ? title.badge : '🏛️'}</span>
      <span>{title ? title.nameKR : '시련 미개척'}</span>
      <span style={{ opacity: 0.8, fontSize: sizeConfig.fontSize - 1 }}>
        [{count}/3]
      </span>
    </div>
  );
}
