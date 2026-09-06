/**
 * AnomalyEventModal.tsx — C1112: Spacetime Anomaly Encounter Modal UI.
 *
 * Provides an interactive UI when a spacetime distortion anomaly is detected:
 * - Displays anomaly type, description, and positive/negative modifiers.
 * - Allows player to select from 3 tactical approaches: Stabilize, Harness, Collapse.
 * - Validates starlight shards for stabilization.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ANOMALIES,
  resolveAnomalyModifiers,
  type SpacetimeAnomalyType,
  type AnomalyTactic,
  type AnomalyCombatModifiers,
} from '../systems/spacetimeAnomaly';

interface Props {
  anomalyType: SpacetimeAnomalyType;
  onSelectTactic: (tactic: AnomalyTactic, modifiers: AnomalyCombatModifiers) => void;
  onClose: () => void;
}

export function AnomalyEventModal({
  anomalyType,
  onSelectTactic,
  onClose,
}: Props) {
  const meta = useGameStore(s => s.meta);
  const shards = meta.starlightShards ?? 0;

  const anomaly = ANOMALIES[anomalyType];
  const [selectedTactic, setSelectedTactic] = useState<AnomalyTactic>('harness');

  const canStabilize = shards >= 5;
  const currentModifiers = resolveAnomalyModifiers(anomalyType, selectedTactic);

  const handleConfirm = () => {
    if (selectedTactic === 'stabilize') {
      if (!canStabilize) return;
      useGameStore.setState(s => ({
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) - 5,
        },
      }));
    }
    onSelectTactic(selectedTactic, currentModifiers);
  };

  return (
    <div
      data-testid="anomaly-event-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
      }}
      onClick={onClose}
    >
      <div
        data-testid="anomaly-event-modal"
        style={{
          width: 'min(620px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0b0f19 0%, #171026 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(139, 92, 246, 0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #3b0764',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #2e1065 0%, #4c1d95 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{anomaly.emoji}</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f5d0fe' }}>
                차원 왜곡 이상 현상 감지!
              </strong>
              <div style={{ fontSize: 11, color: '#c4b5fd' }}>
                보유 별빛 파편: {shards}개
              </div>
            </div>
          </div>
          <button
            data-testid="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Anomaly Details */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              background: '#1e1b4b',
              border: '1px solid #4338ca',
              borderRadius: 8,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#e0e7ff', marginBottom: 4 }}>
              {anomaly.nameKR} ({anomaly.hanja})
            </div>
            <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 8 }}>
              {anomaly.description}
            </div>

            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ color: '#86efac' }}>
                <strong>▲ 긍정 효과:</strong> {anomaly.positiveModifierDesc}
              </div>
              <div style={{ color: '#fca5a5' }}>
                <strong>▼ 부정 효과:</strong> {anomaly.negativeModifierDesc}
              </div>
            </div>
          </div>

          {/* Tactical Options */}
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#ddd' }}>
            전술적 대응 방침 선택:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* 1. Stabilize */}
            <button
              data-testid="tactic-stabilize-btn"
              onClick={() => setSelectedTactic('stabilize')}
              style={{
                padding: '12px 8px',
                borderRadius: 8,
                border: selectedTactic === 'stabilize' ? '2px solid #38bdf8' : '1px solid #1e293b',
                background: selectedTactic === 'stabilize' ? '#0c4a6e' : '#0f172a',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                opacity: canStabilize ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>🛡️ 시공간 안정화</span>
              <span style={{ fontSize: 11, color: '#38bdf8' }}>소모: 파편 5개</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>부정 효과 제거 & +15% 스탯</span>
            </button>

            {/* 2. Harness */}
            <button
              data-testid="tactic-harness-btn"
              onClick={() => setSelectedTactic('harness')}
              style={{
                padding: '12px 8px',
                borderRadius: 8,
                border: selectedTactic === 'harness' ? '2px solid #a855f7' : '1px solid #1e293b',
                background: selectedTactic === 'harness' ? '#581c87' : '#0f172a',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>⚡ 왜곡 수용</span>
              <span style={{ fontSize: 11, color: '#c084fc' }}>비용 없음</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>이상 현상 원형 적용</span>
            </button>

            {/* 3. Collapse */}
            <button
              data-testid="tactic-collapse-btn"
              onClick={() => setSelectedTactic('collapse')}
              style={{
                padding: '12px 8px',
                borderRadius: 8,
                border: selectedTactic === 'collapse' ? '2px solid #f43f5e' : '1px solid #1e293b',
                background: selectedTactic === 'collapse' ? '#881337' : '#0f172a',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>💥 강제 붕괴</span>
              <span style={{ fontSize: 11, color: '#fb7185' }}>고위험 극딜</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>차원 정수 100% 획득</span>
            </button>
          </div>

          {/* Modifiers Summary Preview */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: '#090d16',
              border: '1px solid #1e293b',
              fontSize: 11,
              color: '#cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>공격 배율: {currentModifiers.heroAtkMultiplier}x</div>
            <div>방어 배율: {currentModifiers.heroDefMultiplier}x</div>
            <div>보상 배율: {currentModifiers.rewardsMultiplier}x</div>
            {currentModifiers.guaranteedEssenceDrop && (
              <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>✨ 차원 정수 확정!</div>
            )}
          </div>

          {/* Confirm Button */}
          <button
            data-testid="confirm-tactic-btn"
            disabled={selectedTactic === 'stabilize' && !canStabilize}
            onClick={handleConfirm}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(90deg, #7c3aed 0%, #c026d3 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: selectedTactic === 'stabilize' && !canStabilize ? 'not-allowed' : 'pointer',
              marginTop: 6,
            }}
          >
            차원 이상 현상 돌입하기
          </button>
        </div>
      </div>
    </div>
  );
}
