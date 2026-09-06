/**
 * MythicAwakeningModal.tsx — C1094: Mythic Gear Star Awakening Modal UI.
 *
 * Provides a cosmic constellation interface for star-awakening mythic equipment:
 * - 1 ~ 5 Star progression per item (+20% stats per star).
 * - Real-time total star count & set resonance milestone activations.
 * - Resource deduction & store synchronization.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  MAX_MYTHIC_STARS,
  MYTHIC_STAR_PROGRESSION,
  computeMythicStarMultiplier,
  canAwakenMythicStar,
  awakenMythicStar,
  computeMythicSetResonance,
} from '../systems/mythicGearAwakening';
import type { EquipmentInstance } from '../types';

interface Props {
  onClose: () => void;
}

export function MythicAwakeningModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const shards = meta.starlightShards ?? 0;
  const crackStones = meta.crackStones ?? 0;
  const gold = run.goldThisRun;

  // Flatten equipped items
  const equippedList: EquipmentInstance[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ].filter(it => meta.equippedItemIds.includes(it.instanceId));

  const [selectedEquipId, setSelectedEquipId] = useState<string>(
    equippedList[0]?.instanceId ?? '',
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Total stars across all equipped items
  const totalEquippedStars = equippedList.reduce(
    (acc, it) => acc + (it.mythicStars ?? 0),
    0,
  );

  const resonance = computeMythicSetResonance(totalEquippedStars);
  const selectedEquip = equippedList.find(it => it.instanceId === selectedEquipId);
  const currentStars = selectedEquip?.mythicStars ?? 0;
  const nextCost = MYTHIC_STAR_PROGRESSION[currentStars];

  const handleAwaken = () => {
    if (!selectedEquip) return;

    const res = awakenMythicStar(currentStars, shards, crackStones, gold);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    const updateList = (list: EquipmentInstance[]) =>
      list.map(it =>
        it.instanceId === selectedEquip.instanceId ? { ...it, mythicStars: res.newStars } : it,
      );

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - res.goldSpent,
      },
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) - res.shardsSpent,
        crackStones: (s.meta.crackStones ?? 0) - res.crackStonesSpent,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: updateList(s.meta.inventory.accessories),
        },
      },
    }));

    setFeedback({ type: 'success', message: res.message });
  };

  return (
    <div
      data-testid="mythic-awakening-modal-backdrop"
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
        data-testid="mythic-awakening-modal"
        style={{
          width: 'min(660px, 96vw)',
          maxHeight: '92vh',
          background: '#090d16',
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
            background: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌌👑</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>신화 장비 성운 각성</strong>
              <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8 }}>
                총 성운: {totalEquippedStars}성
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {gold.toLocaleString()}G</span>
            <span style={{ color: '#38bdf8' }}>✨ {shards.toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 {crackStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-mythic-modal-btn"
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
          {/* Resonance Banner */}
          <div
            data-testid="resonance-banner"
            style={{
              background: '#131929',
              borderRadius: 8,
              padding: 12,
              marginBottom: 14,
              border: totalEquippedStars >= 15 ? '1px solid #fbbf24' : '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 14, color: '#38bdf8' }}>
                🌟 성운 세트 공명 (현재: 총 {totalEquippedStars}성 각성)
              </strong>
              {totalEquippedStars >= 15 && (
                <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 'bold' }}>
                  👑 15성 완전초월 달성!
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
              {resonance.activeMilestones.length === 0 ? (
                <span style={{ color: '#64748b' }}>장비에 2성 이상 각성 시 세트 공명이 활성화됩니다.</span>
              ) : (
                resonance.activeMilestones.map((m, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#1e293b',
                      padding: '3px 8px',
                      borderRadius: 4,
                      color: '#fbbf24',
                      border: '1px solid #334155',
                    }}
                  >
                    {m}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Equipped Items Horizontal Selector */}
          <strong style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
            장착 장비 선택 (각성할 장비를 클릭하세요):
          </strong>

          {equippedList.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>(장착 중인 장비가 없습니다)</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>
              {equippedList.map(item => {
                const isSelected = item.instanceId === selectedEquipId;
                const stars = item.mythicStars ?? 0;
                const starIcons = '⭐'.repeat(stars) + '☆'.repeat(MAX_MYTHIC_STARS - stars);

                return (
                  <button
                    key={item.instanceId}
                    data-testid={`mythic-item-${item.instanceId}`}
                    onClick={() => { setSelectedEquipId(item.instanceId); setFeedback(null); }}
                    style={{
                      flexShrink: 0,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                      background: isSelected ? '#1e293b' : '#131929',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minWidth: 140,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: 13 }}>{item.baseId}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      강화: +{item.enhanceLv}
                    </div>
                    <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
                      {starIcons}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Item Details & Awakening Card */}
          {selectedEquip && (
            <div
              data-testid="selected-equip-card"
              style={{
                background: '#131929',
                borderRadius: 8,
                padding: 14,
                border: '1px solid #1e293b',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 15, color: '#f8fafc' }}>
                    {selectedEquip.baseId} (+{selectedEquip.enhanceLv})
                  </strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#fbbf24' }}>
                    {'⭐'.repeat(currentStars) + '☆'.repeat(MAX_MYTHIC_STARS - currentStars)} ({currentStars}성)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold' }}>
                  기본 능력치: {(computeMythicStarMultiplier(currentStars) * 100).toFixed(0)}% (
                  +{currentStars * 20}%)
                </div>
              </div>

              {/* Next Star Preview */}
              {nextCost ? (
                <div
                  style={{
                    background: '#090d16',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#cbd5e1',
                    marginBottom: 12,
                    border: '1px solid #1e293b',
                  }}
                >
                  <div>
                    다음 각성 단계: <strong style={{ color: '#fbbf24' }}>{currentStars + 1}성 성운</strong>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    능력치 증가: +{currentStars * 20}% ➔ <strong style={{ color: '#34d399' }}>+{nextCost.statBonusPercent}%</strong>
                  </div>
                  <div style={{ marginTop: 4, color: '#94a3b8' }}>
                    요구 재화: ✨ {nextCost.costShards}개 · 🔮 {nextCost.costCrackStones}개 · 💰 {nextCost.costGold.toLocaleString()}G
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#451a03',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#fbbf24',
                    fontWeight: 'bold',
                    marginBottom: 12,
                    textAlign: 'center',
                  }}
                >
                  👑 이미 최고 성운 5성 각성을 완료하여 기본 능력치가 200%로 2배 증폭되었습니다!
                </div>
              )}

              {/* Action Button */}
              <button
                data-testid="awaken-star-btn"
                disabled={!canAwakenMythicStar(currentStars, shards, crackStones, gold)}
                onClick={handleAwaken}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: currentStars < MAX_MYTHIC_STARS ? '#2563eb' : '#334155',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 14,
                  cursor: canAwakenMythicStar(currentStars, shards, crackStones, gold) ? 'pointer' : 'not-allowed',
                }}
              >
                {currentStars < MAX_MYTHIC_STARS
                  ? `⭐ ${currentStars + 1}성 성운 각성 개시`
                  : '👑 최고 각성 완료'}
              </button>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              data-testid="mythic-feedback-banner"
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
