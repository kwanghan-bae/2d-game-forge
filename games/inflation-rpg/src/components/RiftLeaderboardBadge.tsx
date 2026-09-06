/**
 * RiftLeaderboardBadge.tsx — C1085: Endless Chaos Rift Honor & Depth Leaderboard Badge.
 *
 * Renders the hero's highest rift expedition achievement badge and honorific title.
 */

import React from 'react';
import {
  computeRiftHonorRating,
  type RiftHistoricalRecord,
} from '../systems/riftRecordStorage';

interface Props {
  highestDepth?: number;
  record?: RiftHistoricalRecord;
  size?: 'sm' | 'md' | 'lg';
  hideZero?: boolean;
}

const GRADE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  ZENITH: { bg: 'rgba(251, 191, 36, 0.18)', border: '#fbbf24', text: '#fde047' },
  SSS: { bg: 'rgba(236, 72, 153, 0.18)', border: '#ec4899', text: '#f472b6' },
  SS: { bg: 'rgba(6, 182, 212, 0.18)', border: '#06b6d4', text: '#67e8f9' },
  S: { bg: 'rgba(249, 115, 22, 0.18)', border: '#f97316', text: '#fdba74' },
  A: { bg: 'rgba(139, 92, 246, 0.18)', border: '#8b5cf6', text: '#c4b5fd' },
  B: { bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981', text: '#6ee7b7' },
  C: { bg: 'rgba(100, 116, 139, 0.18)', border: '#64748b', text: '#cbd5e1' },
  D: { bg: 'rgba(71, 85, 105, 0.15)', border: '#475569', text: '#94a3b8' },
};

export function RiftLeaderboardBadge({
  highestDepth = 0,
  record,
  size = 'md',
  hideZero = false,
}: Props) {
  if (hideZero && highestDepth <= 0 && (!record || record.highestDepth <= 0)) {
    return null;
  }

  const effectiveRecord: RiftHistoricalRecord = record ?? {
    highestDepth,
    totalGuardiansDefeated: highestDepth,
    totalShardsHarvested: 0,
    totalCrackStonesHarvested: 0,
    totalGoldHarvested: 0,
    expeditionsCount: highestDepth > 0 ? 1 : 0,
  };

  const rating = computeRiftHonorRating(effectiveRecord);
  const styles = GRADE_STYLES[rating.grade] ?? GRADE_STYLES.D;

  const sizeConfig = {
    sm: { fontSize: 10, padding: '1px 5px', gap: 3 },
    md: { fontSize: 11, padding: '2px 8px', gap: 5 },
    lg: { fontSize: 13, padding: '4px 10px', gap: 6 },
  }[size];

  return (
    <div
      data-testid="rift-leaderboard-badge"
      data-grade={rating.grade}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        fontSize: sizeConfig.fontSize,
        padding: sizeConfig.padding,
        borderRadius: 6,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        fontWeight: 'bold',
        letterSpacing: '0.02em',
      }}
      title={`무한 혼돈의 균열 최고 심도: ${effectiveRecord.highestDepth}층 (명예 점수: ${rating.score.toLocaleString()}점)`}
    >
      <span>{rating.badge}</span>
      <span>[심도 {effectiveRecord.highestDepth}층]</span>
      <span style={{ opacity: 0.9 }}>{rating.title}</span>
    </div>
  );
}
