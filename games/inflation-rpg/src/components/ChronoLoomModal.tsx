/**
 * ChronoLoomModal.tsx — C1148: Chrono Loom Interactive Weaver Modal UI.
 *
 * Provides the interactive UI for the Chrono Loom spending tree:
 * - Real-time Chrono Essence balance display and total weaving ranks.
 * - Active perks dashboard (Turn speed, Damage reduction, Drop duplication, Omni-stats).
 * - Interactive upgrade matrix for all 4 Spacetime Weaving Nodes.
 */

import { useGameStore } from '../store/gameStore';
import {
  ALL_CHRONO_LOOM_NODE_IDS,
  getChronoLoomNode,
  canUpgradeChronoLoomNode,
  upgradeChronoLoomNode,
  evaluateChronoLoomPerks,
  type ChronoLoomNodeId,
} from '../systems/chronoLoom';

interface Props {
  onClose: () => void;
}

export function ChronoLoomModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);

  const essence = (meta as unknown as { chronoEssence?: number }).chronoEssence ?? 0;
  const perks = evaluateChronoLoomPerks(meta);

  const handleUpgrade = (nodeId: ChronoLoomNodeId) => {
    const check = canUpgradeChronoLoomNode(meta, nodeId);
    if (!check.canUpgrade) return;

    const { newMeta } = upgradeChronoLoomNode(meta, nodeId);
    useGameStore.setState({ meta: newMeta });
  };

  return (
    <div
      data-testid="chrono-loom-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div
        data-testid="chrono-loom-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #09090b 0%, #18181b 100%)',
          border: '1px solid #14b8a6',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(20, 184, 166, 0.25)',
          overflow: 'hidden',
          color: '#e4e4e7',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #134e4a 0%, #042f2e 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🕸️</span>
            <div>
              <strong style={{ fontSize: 17, color: '#f0fdfa' }}>시공의 베틀 (Chrono Loom)</strong>
              <div style={{ fontSize: 11, color: '#99f6e4' }}>
                인과율의 실타래를 엮어 영구적인 시공 주재의 권능을 획득하십시오.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              data-testid="chrono-essence-count"
              style={{
                fontSize: 13,
                background: '#042f2e',
                border: '1px solid #14b8a6',
                padding: '4px 10px',
                borderRadius: 20,
                color: '#5eead4',
                fontWeight: 'bold',
              }}
            >
              시공 정수: {essence}개
            </div>
            <button
              data-testid="close-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#a1a1aa',
                fontSize: 20,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Perks Dashboard Banner */}
        <div
          data-testid="loom-perks-banner"
          style={{
            padding: '12px 20px',
            background: '#111827',
            borderBottom: '1px solid #1f2937',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            textAlign: 'center',
            fontSize: 11,
          }}
        >
          <div>
            <div style={{ color: '#9ca3af' }}>⚡ 턴 가속</div>
            <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.actionSpeedBonus * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#9ca3af' }}>🛡️ 피해 경감</div>
            <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: 13 }}>
              -{(perks.damageReduction * 100).toFixed(0)}%
            </div>
            {perks.fatalGuard && (
              <span style={{ fontSize: 9, color: '#facc15' }}>[즉사 방어]</span>
            )}
          </div>
          <div>
            <div style={{ color: '#9ca3af' }}>💎 전리품 복제</div>
            <div style={{ color: '#c084fc', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.duplicationChance * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#9ca3af' }}>👑 전 스탯 증폭</div>
            <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 13 }}>
              +{(perks.omniStatMultiplierBonus * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Nodes Grid */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {ALL_CHRONO_LOOM_NODE_IDS.map(nodeId => {
            const node = getChronoLoomNode(nodeId);
            const currentRank = meta.chronoLoomRanks?.[nodeId] ?? 0;
            const isMax = currentRank >= node.maxRank;
            const check = canUpgradeChronoLoomNode(meta, nodeId);

            return (
              <div
                key={node.id}
                data-testid={`loom-node-${node.id}`}
                style={{
                  background: isMax
                    ? 'linear-gradient(135deg, #042f2e 0%, #064e3b 100%)'
                    : '#18181b',
                  border: isMax ? '1px solid #10b981' : '1px solid #27272a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Node Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{node.icon}</span>
                    <strong style={{ fontSize: 14, color: '#fff' }}>
                      {node.nameKR} ({node.hanja})
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isMax ? '#059669' : '#27272a',
                      color: isMax ? '#ecfdf5' : '#a1a1aa',
                      fontWeight: 'bold',
                    }}
                  >
                    Rank {currentRank} / {node.maxRank}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    background: '#27272a',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(currentRank / node.maxRank) * 100}%`,
                      height: '100%',
                      background: isMax ? '#10b981' : '#14b8a6',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Description */}
                <div style={{ fontSize: 11, color: '#a1a1aa', flex: 1 }}>
                  {node.description}
                </div>

                {/* Upgrade Button */}
                <button
                  data-testid={`upgrade-node-${node.id}-btn`}
                  disabled={!check.canUpgrade}
                  onClick={() => handleUpgrade(node.id)}
                  style={{
                    marginTop: 4,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: isMax
                      ? '#27272a'
                      : check.canUpgrade
                      ? 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)'
                      : '#3f3f46',
                    color: isMax ? '#71717a' : check.canUpgrade ? '#fff' : '#a1a1aa',
                    fontWeight: 'bold',
                    fontSize: 12,
                    cursor: check.canUpgrade ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isMax
                    ? '✨ 최대 계위 달성'
                    : check.canUpgrade
                    ? `직조 승급 (정수 ${check.cost}개)`
                    : `정수 부족 (${check.cost}개 필요)`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
