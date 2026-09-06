/**
 * ZodiacConstellationModal.tsx — C1058: 12 Eastern Zodiac Constellations Modal UI.
 *
 * Visualizes the 12 celestial guardian constellations, allows heroes to awaken them
 * using Dimensional Crack Stones (차원 균열석), and displays global resonant bonuses.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ALL_ZODIAC_SIGNS,
  ZODIAC_DEFINITIONS,
  canUnlockZodiacNode,
  unlockZodiacNode,
  computeZodiacResonance,
  type ZodiacSign,
} from '../systems/zodiacSystem';
import { getZodiacAwakeningQuote } from '../data/zodiacFlavor';
import { computeZodiacPetResonanceBonus } from '../systems/zodiacPetResonance';

interface Props {
  onClose: () => void;
}

export function ZodiacConstellationModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const crackStones = meta.crackStones ?? 0;
  const unlockedSigns = meta.zodiacUnlocked ?? [];

  const [selectedSign, setSelectedSign] = useState<ZodiacSign>('rat');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedDef = ZODIAC_DEFINITIONS[selectedSign];
  const isUnlocked = unlockedSigns.includes(selectedSign);
  const canUnlock = canUnlockZodiacNode(selectedSign, crackStones, unlockedSigns);
  const totalResonance = computeZodiacResonance(unlockedSigns);
  const petSynergy = computeZodiacPetResonanceBonus(meta.activePetId ?? null, unlockedSigns);

  const handleUnlock = () => {
    const res = unlockZodiacNode(selectedSign, crackStones, unlockedSigns);
    if (!res.success) {
      setFeedback(`❌ ${res.message}`);
      return;
    }

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        crackStones: (s.meta.crackStones ?? 0) - res.stonesSpent,
        zodiacUnlocked: res.newUnlocked,
      },
    }));

    const quote = getZodiacAwakeningQuote(selectedSign);
    setFeedback(`${res.message} "${quote}"`);
  };

  return (
    <div
      data-testid="zodiac-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
      onClick={onClose}
    >
      <div
        data-testid="zodiac-modal"
        style={{
          width: 'min(620px, 96vw)',
          maxHeight: '92vh',
          background: '#0d111d',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
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
            background: '#131929',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌌</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>십이지신 천상 성좌도</strong>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                각성 진행도: {unlockedSigns.length}/12
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#c084fc' }}>🔮 균열석 {crackStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-zodiac-btn"
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
            data-testid="zodiac-feedback-banner"
            style={{
              padding: '8px 16px',
              background: '#311042',
              color: '#d8b4fe',
              fontSize: 13,
              textAlign: 'center',
              borderBottom: '1px solid #581c87',
            }}
          >
            {feedback}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* Constellations Grid */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>수호 성좌 선택:</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {ALL_ZODIAC_SIGNS.map(sign => {
              const def = ZODIAC_DEFINITIONS[sign];
              const unlocked = unlockedSigns.includes(sign);
              const isSelected = selectedSign === sign;

              return (
                <button
                  key={sign}
                  data-testid={`zodiac-node-${sign}`}
                  onClick={() => { setSelectedSign(sign); setFeedback(null); }}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: isSelected
                      ? '#1e293b'
                      : unlocked
                      ? '#151b2c'
                      : '#0f1422',
                    border: isSelected
                      ? '2px solid #a855f7'
                      : unlocked
                      ? '1px solid #7e22ce'
                      : '1px solid #1e293b',
                    cursor: 'pointer',
                    textAlign: 'center',
                    opacity: unlocked ? 1 : 0.65,
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{def.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: unlocked ? '#f1f5f9' : '#94a3b8' }}>
                    {def.animalKR} <span style={{ fontSize: 10, color: '#c084fc' }}>({def.hanja})</span>
                  </div>
                  <div style={{ fontSize: 10, color: unlocked ? '#fbbf24' : '#64748b', marginTop: 2 }}>
                    {unlocked ? '★ 각성됨' : `🔮 ${def.costCrackStones}`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Node Details */}
          <div
            data-testid="selected-zodiac-detail"
            style={{
              background: '#13182b',
              borderRadius: 10,
              padding: 14,
              border: '1px solid #2e384d',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 32 }}>{selectedDef.emoji}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f8fafc' }}>
                    {selectedDef.nameKR}
                  </div>
                  <div style={{ fontSize: 11, color: '#c084fc' }}>
                    천상 십이지신 수호성 · 한자: {selectedDef.hanja}
                  </div>
                </div>
              </div>

              <button
                data-testid="unlock-zodiac-btn"
                disabled={isUnlocked || !canUnlock}
                onClick={handleUnlock}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: isUnlocked ? '#334155' : canUnlock ? '#9333ea' : '#1e1b4b',
                  color: isUnlocked ? '#94a3b8' : canUnlock ? '#fff' : '#64748b',
                  fontWeight: 'bold',
                  fontSize: 12,
                  cursor: isUnlocked ? 'default' : canUnlock ? 'pointer' : 'not-allowed',
                }}
              >
                {isUnlocked ? '✓ 각성 완료' : `성좌 각성 (🔮 ${selectedDef.costCrackStones}개)`}
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, marginBottom: 10 }}>
              {selectedDef.description}
            </div>

            {/* Specific Stat Bonus */}
            <div
              style={{
                background: '#0b0e1b',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                color: '#38bdf8',
              }}
            >
              <strong>성좌 부여 효과:</strong>{' '}
              {selectedDef.bonuses.atkPercent && <span>공격력 +{selectedDef.bonuses.atkPercent}% </span>}
              {selectedDef.bonuses.defPercent && <span>방어력 +{selectedDef.bonuses.defPercent}% </span>}
              {selectedDef.bonuses.hpPercent && <span>최대 체력 +{selectedDef.bonuses.hpPercent}% </span>}
              {selectedDef.bonuses.spdPercent && <span>행동속도 +{selectedDef.bonuses.spdPercent}% </span>}
              {selectedDef.bonuses.critRate && <span>치명타율 +{(selectedDef.bonuses.critRate * 100).toFixed(0)}% </span>}
              {selectedDef.bonuses.critDmgPercent && <span>치명타 피해 +{selectedDef.bonuses.critDmgPercent}% </span>}
              {selectedDef.bonuses.elementalDmgPercent && <span>속성 피해 +{selectedDef.bonuses.elementalDmgPercent}% </span>}
              {selectedDef.bonuses.expBonusPercent && <span>경험치 획득 +{selectedDef.bonuses.expBonusPercent}% </span>}
              {selectedDef.bonuses.goldBonusPercent && <span>골드 획득 +{selectedDef.bonuses.goldBonusPercent}% </span>}
              {selectedDef.bonuses.damageReduction && (
                <span>받는 피해 감소 +{(selectedDef.bonuses.damageReduction * 100).toFixed(0)}% </span>
              )}
            </div>
          </div>

          {/* Zodiac - Pet Cross-System Resonance */}
          {petSynergy.activeResonances.length > 0 && (
            <div
              data-testid="zodiac-pet-synergy-banner"
              style={{
                background: '#451a03',
                border: '1px solid #d97706',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 14,
                color: '#fef3c7',
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: 4 }}>
                🌟 영수-성좌 융합 공명 발동!
              </div>
              {petSynergy.activeResonances.map(r => (
                <div key={r.id}>
                  {r.emoji} <strong>{r.nameKR}</strong>: {r.description}
                </div>
              ))}
            </div>
          )}

          {/* Aggregate Resonance Summary */}
          <div
            data-testid="zodiac-total-resonance"
            style={{
              background: '#151b2c',
              borderRadius: 8,
              padding: 12,
              border: '1px solid #232f48',
            }}
          >
            <div style={{ fontSize: 12, color: '#d8b4fe', fontWeight: 'bold', marginBottom: 6 }}>
              ✨ 십이지신 총 공명 효과 (상시 적용):
            </div>
            {totalResonance.unlockedCount === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                아직 각성된 성좌가 없습니다. 차원 균열석으로 성좌를 각성시키세요!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                {totalResonance.atkPercent > 0 && <div>⚔️ 총 공격력: +{totalResonance.atkPercent}%</div>}
                {totalResonance.defPercent > 0 && <div>🛡️ 총 방어력: +{totalResonance.defPercent}%</div>}
                {totalResonance.hpPercent > 0 && <div>❤️ 총 최대 체력: +{totalResonance.hpPercent}%</div>}
                {totalResonance.spdPercent > 0 && <div>⚡ 총 행동속도: +{totalResonance.spdPercent}%</div>}
                {totalResonance.critRate > 0 && (
                  <div>🎯 치명타 확률: +{(totalResonance.critRate * 100).toFixed(0)}%</div>
                )}
                {totalResonance.critDmgPercent > 0 && <div>💥 치명타 피해: +{totalResonance.critDmgPercent}%</div>}
                {totalResonance.elementalDmgPercent > 0 && (
                  <div>🌀 속성 피해: +{totalResonance.elementalDmgPercent}%</div>
                )}
                {totalResonance.expBonusPercent > 0 && <div>📖 경험치 보너스: +{totalResonance.expBonusPercent}%</div>}
                {totalResonance.goldBonusPercent > 0 && <div>💰 골드 보너스: +{totalResonance.goldBonusPercent}%</div>}
                {totalResonance.damageReduction > 0 && (
                  <div>🛡️ 받는 피해 감소: +{(totalResonance.damageReduction * 100).toFixed(0)}%</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
