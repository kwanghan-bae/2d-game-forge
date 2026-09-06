/**
 * PrimordialConstellationBadge.tsx — C1133: Primordial Constellation Resonance HUD Badge.
 *
 * Displays active Primordial Resonance Tier, awakened rank counter,
 * and quick-glance omni-stat and barrier buffs in the endgame hub.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { computePrimordialResonance } from '../systems/primordialResonance';

export function PrimordialConstellationBadge() {
  const primordialRanks = useGameStore(s => s.meta.primordialRanks ?? {});
  const resonance = computePrimordialResonance(primordialRanks);
  const [showTooltip, setShowTooltip] = useState(false);

  if (resonance.totalRanks === 0) {
    return null;
  }

  const getTierColor = () => {
    switch (resonance.tier) {
      case 'sovereign_singularity':
        return { bg: '#4c0519', border: '#f43f5e', text: '#fecdd3', icon: '👑' };
      case 'primordial_zenith':
        return { bg: '#3b0764', border: '#a855f7', text: '#f5d0fe', icon: '🌌' };
      case 'cosmic_alignment':
        return { bg: '#1e1b4b', border: '#818cf8', text: '#e0e7ff', icon: '⚡' };
      case 'genesis_spark':
      default:
        return { bg: '#064e3b', border: '#10b981', text: '#d1fae5', icon: '🌱' };
    }
  };

  const styleConfig = getTierColor();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="primordial-constellation-badge"
        onClick={() => setShowTooltip(v => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          background: styleConfig.bg,
          border: `1px solid ${styleConfig.border}`,
          color: styleConfig.text,
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{styleConfig.icon}</span>
        <span>{resonance.tierNameKR}</span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
          }}
        >
          [{resonance.totalRanks}/18]
        </span>
      </button>

      {/* Tooltip Card */}
      {showTooltip && (
        <div
          data-testid="primordial-badge-tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 140,
            width: 250,
            background: '#090918',
            border: `1px solid ${styleConfig.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11,
            color: '#e2e8f0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 'bold', color: styleConfig.text, marginBottom: 4 }}>
            {styleConfig.icon} {resonance.tierNameKR}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 6 }}>
            원초적 태초 성좌 {resonance.totalRanks}랭크 공명 활성화
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div>• 올스탯 배율: +{Math.round((resonance.omniStatMultiplier - 1) * 100)}%</div>
            {resonance.bonusDefPierce > 0 && (
              <div>• 공명 방어 관통: +{Math.round(resonance.bonusDefPierce * 100)}%</div>
            )}
            {resonance.bonusFinalDmgMultiplier > 1.0 && (
              <div>
                • 최종 피해 증폭: +{Math.round((resonance.bonusFinalDmgMultiplier - 1) * 100)}%
              </div>
            )}
            {resonance.bonuses.barrierTurns > 0 && (
              <div style={{ color: '#facc15' }}>
                • 전투 개시 절대 성막: {resonance.bonuses.barrierTurns}턴
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
