/**
 * PetSanctuaryModal.tsx — C1052: Pet Sanctuary & Divine Beast Companion UI.
 *
 * Allows players to view their 4 eastern guardian beasts, feed them to increase
 * bond level, and designate their active companion to project powerful combat auras.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ALL_PET_IDS,
  PET_DEFINITIONS,
  MAX_PET_LEVEL,
  FOOD_DEFINITIONS,
  canFeedPet,
  feedPet,
  computePetAura,
  createInitialPets,
  type PetType,
  type FoodType,
} from '../systems/petSystem';
import { ElementalBadge } from './ElementalBadge';

interface Props {
  onClose: () => void;
}

export function PetSanctuaryModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const pets = meta.pets ?? createInitialPets();
  const activePetId = meta.activePetId ?? 'white_tiger';

  const [selectedId, setSelectedId] = useState<PetType>(activePetId ?? 'white_tiger');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedPet = pets[selectedId];
  const selectedDef = PET_DEFINITIONS[selectedId];
  const selectedAura = computePetAura(selectedPet);

  const handleSetActive = (petId: PetType) => {
    const target = pets[petId];
    if (!target || !target.unlocked) return;

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        activePetId: petId,
      },
    }));
    setFeedback(`🌟 [${PET_DEFINITIONS[petId].nameKR}]이(가) 동행 영수로 지정되었습니다!`);
  };

  const handleFeed = (foodType: FoodType) => {
    if (!selectedPet || !selectedPet.unlocked) return;

    const availableGold = run.goldThisRun;
    const availableStones = meta.enhanceStones;

    const res = feedPet(selectedPet, foodType, availableGold, availableStones);
    if (!res.success) {
      setFeedback(`❌ ${res.message}`);
      return;
    }

    const updatedPets = {
      ...pets,
      [selectedId]: res.newPet,
    };

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - res.goldSpent,
      },
      meta: {
        ...s.meta,
        enhanceStones: s.meta.enhanceStones - res.stonesSpent,
        pets: updatedPets,
      },
    }));

    setFeedback(res.message);
  };

  return (
    <div
      data-testid="pet-sanctuary-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
      }}
      onClick={onClose}
    >
      <div
        data-testid="pet-sanctuary-modal"
        style={{
          width: 'min(560px, 96vw)',
          maxHeight: '92vh',
          background: '#131822',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
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
            background: '#192030',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🐾</span>
            <strong style={{ fontSize: 16, color: '#f8fafc' }}>영수 성소 (신수 동행)</strong>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#fbbf24' }}>💰 {run.goldThisRun.toLocaleString()} G</span>
            <span style={{ color: '#60a5fa' }}>💎 {meta.enhanceStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-pets-btn"
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
            data-testid="pet-feedback-banner"
            style={{
              padding: '8px 16px',
              background: '#064e3b',
              color: '#34d399',
              fontSize: 13,
              textAlign: 'center',
              borderBottom: '1px solid #047857',
            }}
          >
            {feedback}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* Pet Selection Grid */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>영수 목록:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
            {ALL_PET_IDS.map(id => {
              const def = PET_DEFINITIONS[id];
              const pet = pets[id];
              const isSelected = selectedId === id;
              const isActive = activePetId === id;

              return (
                <button
                  key={id}
                  data-testid={`pet-card-${id}`}
                  onClick={() => { setSelectedId(id); setFeedback(null); }}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: isSelected ? '#1e293b' : '#161e2e',
                    border: isSelected
                      ? '2px solid #38bdf8'
                      : isActive
                      ? '1px solid #10b981'
                      : '1px solid #2e384d',
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: pet.unlocked ? 1 : 0.6,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 22 }}>{def.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 13, color: pet.unlocked ? '#f1f5f9' : '#64748b' }}>
                          {def.nameKR}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {pet.unlocked ? `친밀도 Lv.${pet.level}` : '🔒 봉인됨'}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span
                        data-testid="active-companion-badge"
                        style={{
                          fontSize: 10,
                          background: '#064e3b',
                          color: '#34d399',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 'bold',
                        }}
                      >
                        동행 중
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Pet Detail Card */}
          <div
            data-testid="selected-pet-detail"
            style={{
              background: '#192233',
              borderRadius: 10,
              padding: 14,
              border: '1px solid #2d3748',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 36 }}>{selectedDef.emoji}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#f8fafc' }}>
                      {selectedDef.nameKR}
                    </span>
                    <ElementalBadge element={selectedDef.element} size="sm" />
                  </div>
                  <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 2 }}>{selectedDef.roleKR}</div>
                </div>
              </div>

              {selectedPet.unlocked && (
                <button
                  data-testid="set-active-companion-btn"
                  disabled={activePetId === selectedId}
                  onClick={() => handleSetActive(selectedId)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: activePetId === selectedId ? '#334155' : '#059669',
                    color: activePetId === selectedId ? '#94a3b8' : '#fff',
                    fontWeight: 'bold',
                    fontSize: 12,
                    cursor: activePetId === selectedId ? 'default' : 'pointer',
                  }}
                >
                  {activePetId === selectedId ? '✓ 동행 중' : '동행 영수 지정'}
                </button>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
              {selectedDef.description}
            </div>

            {!selectedPet.unlocked ? (
              <div
                data-testid="locked-pet-message"
                style={{
                  padding: 12,
                  background: '#1e293b',
                  borderRadius: 6,
                  color: '#f87171',
                  textAlign: 'center',
                  fontSize: 13,
                }}
              >
                🔒 승천의 시련 {selectedDef.unlockFloorRequired}층을 돌파하면 신수의 봉인이 해제됩니다.
              </div>
            ) : (
              <>
                {/* Level & EXP Progress */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                      친밀도: Lv.{selectedPet.level} {selectedPet.level >= MAX_PET_LEVEL ? '(최대)' : ''}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      {selectedPet.level >= MAX_PET_LEVEL
                        ? 'MAX'
                        : `${selectedPet.bondExp} / ${selectedPet.bondExpToNext} EXP`}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 8,
                      background: '#334155',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          selectedPet.level >= MAX_PET_LEVEL
                            ? 100
                            : Math.min(100, (selectedPet.bondExp / (selectedPet.bondExpToNext || 1)) * 100)
                        }%`,
                        height: '100%',
                        background: '#38bdf8',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Aura Stats Panel */}
                <div
                  style={{
                    background: '#131b2b',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 14,
                    border: '1px solid #1f2d45',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold', marginBottom: 6 }}>
                    ✨ 신수의 가호 (동행 시 발동 오라):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                    {selectedAura.atkPercent > 0 && <div>⚔️ 공격력: +{selectedAura.atkPercent}%</div>}
                    {selectedAura.critDmgPercent > 0 && <div>💥 치명타 피해: +{selectedAura.critDmgPercent}%</div>}
                    {selectedAura.spdPercent > 0 && <div>⚡ 행동속도: +{selectedAura.spdPercent}%</div>}
                    {selectedAura.elementalDmgPercent > 0 && <div>🌀 속성 피해: +{selectedAura.elementalDmgPercent}%</div>}
                    {selectedAura.hpPercent > 0 && <div>❤️ 최대 체력: +{selectedAura.hpPercent}%</div>}
                    {selectedAura.hpRegenPercent > 0 && <div>🌿 턴당 재생: +{selectedAura.hpRegenPercent}%</div>}
                    {selectedAura.defPercent > 0 && <div>🛡️ 방어력: +{selectedAura.defPercent}%</div>}
                    {selectedAura.damageReduction > 0 && (
                      <div>🛡️ 받는 피해 감소: +{(selectedAura.damageReduction * 100).toFixed(1)}%</div>
                    )}
                  </div>
                </div>

                {/* Feeding Controls */}
                {selectedPet.level < MAX_PET_LEVEL ? (
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>먹이 주기 (친밀도 육성):</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        data-testid="feed-snack-btn"
                        disabled={!canFeedPet('snack', run.goldThisRun, meta.enhanceStones)}
                        onClick={() => handleFeed('snack')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #475569',
                          background: canFeedPet('snack', run.goldThisRun, meta.enhanceStones)
                            ? '#1e293b'
                            : '#0f172a',
                          color: canFeedPet('snack', run.goldThisRun, meta.enhanceStones) ? '#f1f5f9' : '#64748b',
                          cursor: canFeedPet('snack', run.goldThisRun, meta.enhanceStones) ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          fontSize: 12,
                        }}
                      >
                        <div>🥩 영수 영양식 (+25 EXP)</div>
                        <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>💰 500 G</div>
                      </button>

                      <button
                        data-testid="feed-essence-btn"
                        disabled={!canFeedPet('essence', run.goldThisRun, meta.enhanceStones)}
                        onClick={() => handleFeed('essence')}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #4338ca',
                          background: canFeedPet('essence', run.goldThisRun, meta.enhanceStones)
                            ? '#312e81'
                            : '#0f172a',
                          color: canFeedPet('essence', run.goldThisRun, meta.enhanceStones) ? '#e0e7ff' : '#64748b',
                          cursor: canFeedPet('essence', run.goldThisRun, meta.enhanceStones) ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          fontSize: 12,
                        }}
                      >
                        <div>🧪 신수의 영약 (+100 EXP)</div>
                        <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>💰 2,500 G + 💎 2개</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#fbbf24', fontWeight: 'bold', fontSize: 13 }}>
                    🌟 신수와의 유대가 극의에 도달했습니다! (Lv.10 MAX)
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
