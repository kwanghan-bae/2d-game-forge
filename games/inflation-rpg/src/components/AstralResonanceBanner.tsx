/**
 * AstralResonanceBanner.tsx — C1121: Astral Resonance Matrix Indicator Banner UI.
 *
 * Renders real-time Astral Harmony status and bonus breakdowns derived from equipped cosmic affixes.
 */

import React from 'react';
import {
  computeAstralResonance,
  type AstralResonanceState,
} from '../systems/astralResonanceMatrix';
import { COSMIC_AFFIXES } from '../systems/cosmicInfusion';
import type { EquipmentInstance } from '../types';

interface Props {
  equippedInstances: EquipmentInstance[];
  hideInactive?: boolean;
}

const TIER_STYLES: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: '#0f172a', border: '#334155', text: '#94a3b8' },
  1: { bg: 'linear-gradient(90deg, #1e1b4b 0%, #311042 100%)', border: '#a855f7', text: '#d8b4fe' },
  2: { bg: 'linear-gradient(90deg, #3b0764 0%, #4c0519 100%)', border: '#f59e0b', text: '#fde047' },
};

export function AstralResonanceBanner({
  equippedInstances,
  hideInactive = false,
}: Props) {
  const resonance = computeAstralResonance(equippedInstances);

  if (hideInactive && resonance.harmonyTier === 0) {
    return null;
  }

  const styles = TIER_STYLES[resonance.harmonyTier] ?? TIER_STYLES[0];

  return (
    <div
      data-testid="astral-resonance-banner"
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        color: styles.text,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{resonance.badge}</span>
          <span style={{ fontWeight: 'bold', fontSize: 13 }}>{resonance.tierNameKR}</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>({resonance.hanja})</span>
        </div>
        <div style={{ fontSize: 11, color: '#e2e8f0' }}>
          서로 다른 접사: {resonance.distinctAffixes.length}/3개
        </div>
      </div>

      {/* Active Affixes Badges */}
      {resonance.distinctAffixes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {resonance.distinctAffixes.map(type => {
            const def = COSMIC_AFFIXES[type];
            return (
              <span
                key={type}
                data-testid={`active-affix-${type}`}
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#f8fafc',
                }}
              >
                {def.emoji} {def.nameKR}
              </span>
            );
          })}
        </div>
      )}

      {/* Harmony Effect Perks */}
      {resonance.harmonyTier > 0 && (
        <div style={{ fontSize: 11, color: '#fef08a', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>올스탯 +{Math.round((resonance.omniStatMultiplier - 1) * 100)}%</span>
          <span>관통 +{Math.round(resonance.defPierceBonus * 100)}%</span>
          {resonance.finalDmgMultiplier > 1 && (
            <span>최종 피해 +{Math.round((resonance.finalDmgMultiplier - 1) * 100)}%</span>
          )}
          {resonance.dimensionalEvasionChance > 0 && (
            <span>차원 회피 +{Math.round(resonance.dimensionalEvasionChance * 100)}%</span>
          )}
        </div>
      )}
    </div>
  );
}
