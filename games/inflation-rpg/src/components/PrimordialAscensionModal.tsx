/**
 * PrimordialAscensionModal.tsx — C1129: Primordial Ascension Interactive UI.
 *
 * Provides the interactive UI for the 4 Primordial Constellations:
 * - 태초의 창생 (primordial_genesis): Max HP%, Final Dmg%, Max Level
 * - 태초의 멸각 (primordial_annihilation): DEF Pierce%, Elemental Affinity%
 * - 태초의 영겁 (primordial_eternity): Damage Reduction%, Healing Efficacy%
 * - 태초의 특이점 (primordial_singularity): DEF-to-ATK conversion%, Battle-start Barrier turns
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  PRIMORDIAL_NODES,
  type PrimordialNodeId,
  checkPrimordialUpgrade,
  executePrimordialUpgrade,
  computeCumulativePrimordialBonuses,
  getPrimordialTotalRanks,
} from '../systems/primordialAscension';

interface Props {
  onClose: () => void;
}

const ALL_NODE_IDS: PrimordialNodeId[] = [
  'primordial_genesis',
  'primordial_annihilation',
  'primordial_eternity',
  'primordial_singularity',
];

export function PrimordialAscensionModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const primordialRanks = meta.primordialRanks ?? {};
  const dimensionalEssence = meta.dimensionalEssence ?? 0;
  const starlightShards = meta.starlightShards ?? 0;
  const clearedSectors = meta.corridorSectorsCleared ?? [];

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const totalRanks = getPrimordialTotalRanks(primordialRanks);
  const bonuses = computeCumulativePrimordialBonuses(primordialRanks);

  const handleUpgrade = (nodeId: PrimordialNodeId) => {
    const result = executePrimordialUpgrade(
      nodeId,
      primordialRanks,
      dimensionalEssence,
      starlightShards,
      clearedSectors
    );

    if (!result.success) {
      setFeedbackMessage(result.error ?? '업그레이드에 실패하였습니다.');
      return;
    }

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        dimensionalEssence: result.remainingEssence,
        starlightShards: result.remainingShards,
        primordialRanks: result.newRanks,
      },
    }));

    const def = PRIMORDIAL_NODES[nodeId];
    setFeedbackMessage(`✨ [${def.nameKR}] 랭크 ${result.newRanks[nodeId]} 각성 완료!`);
  };

  return (
    <div
      data-testid="primordial-ascension-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 130,
      }}
      onClick={onClose}
    >
      <div
        data-testid="primordial-ascension-modal"
        style={{
          width: 'min(760px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #090918 0%, #16122d 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #a855f7',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #2e1065',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1b4b 0%, #3b0764 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌱</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f5f3ff' }}>
                원초적 태초 승천 (Primordial Ascension)
              </strong>
              <div style={{ fontSize: 11, color: '#d8b4fe', marginTop: 2 }}>
                각성 랭크 총합: {totalRanks}랭크 | 차원 정수: {dimensionalEssence}개 | 별빛 파편: {starlightShards.toLocaleString()}개
              </div>
            </div>
          </div>
          <button
            data-testid="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#c084fc',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Top Cumulative Summary Banner */}
        <div
          data-testid="primordial-summary-banner"
          style={{
            padding: '12px 18px',
            background: '#0d0d21',
            borderBottom: '1px solid #2e1065',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          <div style={{ background: '#191535', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#a78bfa' }}>생명력 / 최종 피해</div>
            <div style={{ fontWeight: 'bold', color: '#34d399' }}>
              +{Math.round((bonuses.hpMultiplier - 1) * 100)}% / +{Math.round((bonuses.finalDmgMultiplier - 1) * 100)}%
            </div>
          </div>
          <div style={{ background: '#191535', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#a78bfa' }}>방어 관통 / 속성 친화</div>
            <div style={{ fontWeight: 'bold', color: '#f43f5e' }}>
              +{Math.round(bonuses.defPierceBonus * 100)}% / +{Math.round(bonuses.elementalAffinityBonus * 100)}%
            </div>
          </div>
          <div style={{ background: '#191535', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#a78bfa' }}>피해 감소 / 회복 효율</div>
            <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>
              +{Math.round(bonuses.damageReductionBonus * 100)}% / +{Math.round(bonuses.healingEfficacyBonus * 100)}%
            </div>
          </div>
          <div style={{ background: '#191535', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#a78bfa' }}>방어-공격 전이 / 성막</div>
            <div style={{ fontWeight: 'bold', color: '#facc15' }}>
              +{Math.round(bonuses.defToAtkRatio * 100)}% / {bonuses.barrierTurns}턴
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div
            data-testid="feedback-message"
            style={{
              margin: '8px 18px 0',
              padding: '6px 12px',
              borderRadius: 6,
              background: '#3b0764',
              border: '1px solid #7e22ce',
              color: '#f5d0fe',
              fontSize: 12,
            }}
          >
            {feedbackMessage}
          </div>
        )}

        {/* 4 Primordial Nodes Grid */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {ALL_NODE_IDS.map(nodeId => {
            const def = PRIMORDIAL_NODES[nodeId];
            const currentRank = primordialRanks[nodeId] ?? 0;
            const isMax = currentRank >= def.maxRank;
            const nextRank = currentRank + 1;
            const cost = !isMax ? def.cost(nextRank) : null;
            const check = checkPrimordialUpgrade(
              nodeId,
              primordialRanks,
              dimensionalEssence,
              starlightShards,
              clearedSectors
            );

            return (
              <div
                key={nodeId}
                data-testid={`primordial-node-card-${nodeId}`}
                style={{
                  borderRadius: 8,
                  background: currentRank > 0 ? '#13112b' : '#0c0b1d',
                  border: currentRank > 0 ? '1px solid #7c3aed' : '1px solid #2d264e',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{def.icon}</span>
                      <strong style={{ fontSize: 14, color: '#faf5ff' }}>
                        {def.nameKR} ({def.hanja})
                      </strong>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isMax ? '#064e3b' : '#2e1065',
                        color: isMax ? '#6ee7b7' : '#d8b4fe',
                        fontWeight: 'bold',
                      }}
                    >
                      {isMax ? 'MAX RANK' : `${currentRank} / ${def.maxRank} 랭크`}
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: '#c4b5fd', margin: '6px 0 0', lineHeight: 1.4 }}>
                    {def.description}
                  </p>

                  {/* Rank Bonus Details */}
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      padding: '6px 8px',
                      borderRadius: 4,
                      background: '#090817',
                      color: '#a5b4fc',
                    }}
                  >
                    {nodeId === 'primordial_genesis' && (
                      <div>랭크당 생명력 +10%, 최종 피해 +5%, 한계 레벨 +100</div>
                    )}
                    {nodeId === 'primordial_annihilation' && (
                      <div>랭크당 방어 관통 +12%, 속성 친화 +8%</div>
                    )}
                    {nodeId === 'primordial_eternity' && (
                      <div>랭크당 피해 감소 +3%, 회복 효율 +10%</div>
                    )}
                    {nodeId === 'primordial_singularity' && (
                      <div>랭크당 방어→공격 전이 +10%, 전투 개시 성막 +1턴</div>
                    )}
                  </div>
                </div>

                {/* Upgrade Button / Status */}
                <div>
                  {!isMax && cost && (
                    <div style={{ fontSize: 10, color: '#facc15', marginBottom: 6 }}>
                      강화 비용: 정수 {cost.essence}개 | 별빛 파편 {cost.shards.toLocaleString()}개
                    </div>
                  )}

                  {!check.canUpgrade && !isMax && (
                    <div style={{ fontSize: 10, color: '#f87171', marginBottom: 6 }}>
                      ⚠️ {check.reason}
                    </div>
                  )}

                  <button
                    data-testid={`upgrade-btn-${nodeId}`}
                    disabled={!check.canUpgrade || isMax}
                    onClick={() => handleUpgrade(nodeId)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: isMax
                        ? '#064e3b'
                        : check.canUpgrade
                        ? 'linear-gradient(90deg, #6d28d9 0%, #9333ea 100%)'
                        : '#334155',
                      color: isMax ? '#a7f3d0' : '#fff',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: check.canUpgrade && !isMax ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isMax ? '👑 성좌 극의 도달' : `각성 (Rank ${nextRank})`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
