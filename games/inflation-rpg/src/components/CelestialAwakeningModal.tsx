/**
 * CelestialAwakeningModal.tsx — C1076: Nine-Star Celestial Awakening Modal UI.
 *
 * Visualizes the 9-Star Celestial Realm (구속천계경지) ascension tree,
 * allowing heroes to channel Starlight Shards and Crack Stones to break through
 * mortality and attain the ultimate "Zenith Beyond Heavens" (천외천) divinity.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  AWAKENING_TIERS,
  MAX_AWAKENING_TIER,
  canAwakenNextTier,
  attemptAwakenNextTier,
  computeCumulativeAwakeningStats,
} from '../systems/celestialAwakening';

interface Props {
  onClose: () => void;
}

export function CelestialAwakeningModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const currentTier = meta.awakeningTier ?? 0;
  const shards = meta.starlightShards ?? 0;
  const crackStones = meta.crackStones ?? 0;

  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(
    Math.min(MAX_AWAKENING_TIER - 1, currentTier),
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedTier = AWAKENING_TIERS[selectedTierIndex];
  const cumulative = computeCumulativeAwakeningStats(currentTier);
  const isMaxTier = currentTier >= MAX_AWAKENING_TIER;
  const canBreakthrough = canAwakenNextTier(currentTier, shards, crackStones);

  const handleBreakthrough = () => {
    const res = attemptAwakenNextTier(currentTier, shards, crackStones);
    if (!res.success) {
      setFeedback(`❌ ${res.message}`);
      return;
    }

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        awakeningTier: res.newTier,
        starlightShards: (s.meta.starlightShards ?? 0) - res.shardsSpent,
        crackStones: (s.meta.crackStones ?? 0) - res.crackStonesSpent,
      },
    }));

    setFeedback(res.message);
    setSelectedTierIndex(Math.min(MAX_AWAKENING_TIER - 1, res.newTier));
  };

  return (
    <div
      data-testid="awakening-modal-backdrop"
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
        data-testid="awakening-modal"
        style={{
          width: 'min(660px, 96vw)',
          maxHeight: '92vh',
          background: '#090d16',
          color: '#eee',
          borderRadius: 14,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 50px rgba(0,0,0,0.8)',
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
            background: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🌌👑</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                9성 천상 초월 각성 (Celestial Awakening)
              </strong>
              <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8 }}>
                현재 경지: {cumulative.title} ({currentTier}/{MAX_AWAKENING_TIER}성)
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: '#38bdf8' }}>✨ 파편 {shards.toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 균열석 {crackStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-awakening-btn"
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

        {/* Feedback Banner */}
        {feedback && (
          <div
            data-testid="awakening-feedback-banner"
            style={{
              padding: '8px 16px',
              background: '#042f2e',
              color: '#2dd4bf',
              fontSize: 13,
              textAlign: 'center',
              borderBottom: '1px solid #0f766e',
            }}
          >
            {feedback}
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* 9-Star Tier Strip */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            천계 9단계 초월 승천 경로:
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {AWAKENING_TIERS.map((t, idx) => {
              const isAwakened = currentTier >= t.tier;
              const isCurrentTarget = currentTier + 1 === t.tier;
              const isSelected = selectedTierIndex === idx;

              return (
                <button
                  key={t.tier}
                  data-testid={`tier-node-${t.tier}`}
                  onClick={() => setSelectedTierIndex(idx)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    textAlign: 'center',
                    border: isSelected
                      ? `2px solid ${t.color}`
                      : isAwakened
                      ? '1px solid #059669'
                      : isCurrentTarget
                      ? '1px solid #eab308'
                      : '1px solid #1e293b',
                    background: isSelected
                      ? '#1e293b'
                      : isAwakened
                      ? '#064e3b'
                      : isCurrentTarget
                      ? '#422006'
                      : '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>
                    {isAwakened ? '⭐' : isCurrentTarget ? '⚡' : '🔒'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: isAwakened ? '#34d399' : isCurrentTarget ? '#fbbf24' : '#64748b',
                    }}
                  >
                    {t.tier}성
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Tier Detail Card */}
          {selectedTier && (
            <div
              data-testid="selected-tier-card"
              style={{
                background: '#111827',
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
                border: `1px solid ${selectedTier.color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{selectedTier.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 15, color: selectedTier.color }}>
                      {selectedTier.nameKR} ({selectedTier.hanja})
                    </div>
                    <div style={{ fontSize: 12, color: '#fbbf24' }}>
                      칭호: 「{selectedTier.title}」
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: currentTier >= selectedTier.tier ? '#34d399' : '#94a3b8',
                  }}
                >
                  {currentTier >= selectedTier.tier ? '✓ 각성 완료' : '미달성'}
                </span>
              </div>

              <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 10 }}>
                {selectedTier.description}
              </div>

              <div
                style={{
                  background: '#090d16',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#38bdf8' }}>
                  돌파 필요 재료: ✨ {selectedTier.costShards}개 + 🔮 {selectedTier.costCrackStones}개
                </div>
                <div style={{ color: '#a855f7', fontWeight: 'bold' }}>
                  {selectedTier.bonuses.finalDmgMultiplier &&
                    `최종 피해 ×${selectedTier.bonuses.finalDmgMultiplier}배! `}
                  {selectedTier.bonuses.atkPercent && `공격력 +${selectedTier.bonuses.atkPercent}% `}
                  {selectedTier.bonuses.hpPercent && `체력 +${selectedTier.bonuses.hpPercent}% `}
                  {selectedTier.bonuses.defPercent && `방어력 +${selectedTier.bonuses.defPercent}% `}
                  {selectedTier.bonuses.damageReduction &&
                    `피해감소 +${(selectedTier.bonuses.damageReduction * 100).toFixed(1)}% `}
                </div>
              </div>
            </div>
          )}

          {/* Cumulative Stats Panel */}
          <div
            data-testid="awakening-cumulative-stats"
            style={{
              background: '#0f172a',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
              ✨ 초월 각성 누적 영구 스탯 (상시 발동):
            </div>
            {currentTier === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                아직 초월 각성을 진행하지 않았습니다. 첫 각성을 단행하여 천계의 문을 여세요!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                {cumulative.finalDmgMultiplier > 1.0 && (
                  <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                    👑 최종 피해량: ×{cumulative.finalDmgMultiplier}배 증폭!
                  </div>
                )}
                {cumulative.atkPercent > 0 && <div>⚔️ 총 공격력: +{cumulative.atkPercent}%</div>}
                {cumulative.hpPercent > 0 && <div>❤️ 총 최대 체력: +{cumulative.hpPercent}%</div>}
                {cumulative.defPercent > 0 && <div>🛡️ 총 방어력: +{cumulative.defPercent}%</div>}
                {cumulative.damageReduction > 0 && (
                  <div>🛡️ 총 피해 감소: +{(cumulative.damageReduction * 100).toFixed(1)}%</div>
                )}
                {cumulative.elementalDmgPercent > 0 && (
                  <div>🌀 속성 공명 피해: +{cumulative.elementalDmgPercent}%</div>
                )}
                {cumulative.critRate > 0 && (
                  <div>🎯 치명타율: +{(cumulative.critRate * 100).toFixed(0)}%</div>
                )}
                {cumulative.critDmg > 0 && (
                  <div>💥 치명타 피해: +{(cumulative.critDmg * 100).toFixed(0)}%</div>
                )}
                {cumulative.spdFlat > 0 && <div>⚡ 행동속도: +{cumulative.spdFlat}</div>}
              </div>
            )}
          </div>

          {/* Breakthrough Action Button */}
          <button
            data-testid="awaken-breakthrough-btn"
            disabled={isMaxTier || !canBreakthrough}
            onClick={handleBreakthrough}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 8,
              border: 'none',
              background: isMaxTier
                ? '#334155'
                : canBreakthrough
                ? '#d97706'
                : '#1e293b',
              color: isMaxTier ? '#94a3b8' : canBreakthrough ? '#fff' : '#64748b',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: isMaxTier ? 'default' : canBreakthrough ? 'pointer' : 'not-allowed',
              boxShadow: canBreakthrough ? '0 4px 14px rgba(217, 119, 6, 0.4)' : 'none',
            }}
          >
            {isMaxTier
              ? '✓ 최고 경지(천외천) 도달 완료'
              : canBreakthrough
              ? `⚡ ${currentTier + 1}성경 돌파 단행 (✨ ${AWAKENING_TIERS[currentTier].costShards}개 + 🔮 ${AWAKENING_TIERS[currentTier].costCrackStones}개)`
              : '재료 부족 (별빛 파편 또는 차원 균열석)'}
          </button>
        </div>
      </div>
    </div>
  );
}
