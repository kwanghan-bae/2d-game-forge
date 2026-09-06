/**
 * RelicTransmutationModal.tsx — C1100: Celestial Relic Transmutation Modal UI.
 *
 * Provides an interface to transmute the 4 Celestial Star Relics into their apex forms:
 * - Real-time apex skill preview and status indicator.
 * - Resource validation and instant store synchronization.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  TRANSMUTED_RELICS,
  BASE_TO_TRANSMUTED,
  canTransmuteRelic,
  transmuteRelic,
  type TransmutedRelicType,
} from '../systems/celestialRelicTransmutation';
import type { CelestialRelicType } from '../types';

interface Props {
  onClose: () => void;
}

const ALL_BASE_RELICS: CelestialRelicType[] = [
  'polaris_eye',
  'sirius_fang',
  'vega_veil',
  'antares_heart',
];

export function RelicTransmutationModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const shards = meta.starlightShards ?? 0;
  const crackStones = meta.crackStones ?? 0;
  const gold = run.goldThisRun;

  const transmutedList: TransmutedRelicType[] = meta.transmutedRelics ?? [];
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTransmute = (baseType: CelestialRelicType) => {
    const res = transmuteRelic(baseType, shards, crackStones, gold);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - res.goldSpent,
      },
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) - res.shardsSpent,
        crackStones: (s.meta.crackStones ?? 0) - res.crackStonesSpent,
        transmutedRelics: [...(s.meta.transmutedRelics ?? []), res.transmutedType],
      },
    }));

    setFeedback({ type: 'success', message: res.message });
  };

  return (
    <div
      data-testid="relic-transmutation-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
      onClick={onClose}
    >
      <div
        data-testid="relic-transmutation-modal"
        style={{
          width: 'min(660px, 96vw)',
          maxHeight: '92vh',
          background: '#0a0e1a',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#111827',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔮✨</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>성유물 초월 진화</strong>
              <span style={{ fontSize: 11, color: '#a855f7', marginLeft: 8 }}>
                진화 완료: {transmutedList.length}/4
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {gold.toLocaleString()}G</span>
            <span style={{ color: '#38bdf8' }}>✨ {shards.toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 {crackStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-transmute-modal-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            {ALL_BASE_RELICS.map(baseType => {
              const transType = BASE_TO_TRANSMUTED[baseType];
              const def = TRANSMUTED_RELICS[transType];
              const isTransmuted = transmutedList.includes(transType);
              const canCraft = canTransmuteRelic(baseType, shards, crackStones, gold);

              return (
                <div
                  key={baseType}
                  data-testid={`transmute-card-${baseType}`}
                  style={{
                    background: isTransmuted ? '#131929' : '#0d111c',
                    borderRadius: 8,
                    padding: 14,
                    border: `1px solid ${isTransmuted ? def.color : '#1e293b'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{def.emoji}</span>
                      <div>
                        <strong style={{ fontSize: 15, color: def.color }}>
                          {def.nameKR} ({def.hanja})
                        </strong>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{def.description}</div>
                      </div>
                    </div>
                    {isTransmuted && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: '#34d399',
                          background: '#064e3b',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid #059669',
                        }}
                      >
                        ✓ 초월 완료
                      </span>
                    )}
                  </div>

                  {/* Apex Skill Info */}
                  <div
                    style={{
                      background: '#090d16',
                      padding: 8,
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#cbd5e1',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                      ⚡ 고유 각성기 [{def.apexSkillName}]:
                    </span>{' '}
                    <span>{def.apexSkillDescription}</span>
                  </div>

                  {/* Action Button */}
                  {!isTransmuted ? (
                    <button
                      data-testid={`transmute-btn-${baseType}`}
                      disabled={!canCraft}
                      onClick={() => handleTransmute(baseType)}
                      style={{
                        padding: '10px 0',
                        borderRadius: 6,
                        border: 'none',
                        background: canCraft ? '#7c3aed' : '#334155',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: 13,
                        cursor: canCraft ? 'pointer' : 'not-allowed',
                      }}
                    >
                      🔮 초월 진화 개시 (✨ {def.costShards} / 🔮 {def.costCrackStones} / 💰{' '}
                      {def.costGold.toLocaleString()}G)
                    </button>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#34d399',
                        textAlign: 'center',
                        fontWeight: 'bold',
                      }}
                    >
                      👑 완전초월 활성화됨
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              data-testid="transmute-feedback-banner"
              style={{
                padding: 10,
                borderRadius: 6,
                background: feedback.type === 'success' ? '#064e3b' : '#450a0a',
                border: feedback.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
                color: '#fff',
                fontSize: 12,
              }}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
