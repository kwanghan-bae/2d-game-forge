/**
 * AstralArchiveModal.tsx — C1136: Astral Archive Interactive Showcase UI.
 *
 * Displays the 16 endgame milestones across:
 * - Ascension Trials, Chaos Rift, Apex Trials, Abyssal Corridor, Primordial Constellations, Transmuted Relics.
 * - Allows claiming Starlight Shards for unlocked milestones.
 * - Renders real-time account-wide Archive Mastery perks.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  evaluateArchiveMastery,
  type ArchiveCategory,
} from '../systems/astralArchive';

interface Props {
  onClose: () => void;
}

type FilterCategory = 'all' | ArchiveCategory;

const CATEGORY_TABS: Array<{ id: FilterCategory; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'trials', label: '시련' },
  { id: 'chaos_rift', label: '균열' },
  { id: 'apex_trials', label: '초월' },
  { id: 'corridor', label: '회랑' },
  { id: 'primordial', label: '성좌' },
  { id: 'relics', label: '성유물' },
];

export function AstralArchiveModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  const { perks, milestoneStates } = evaluateArchiveMastery(meta);

  const filteredMilestones =
    selectedCategory === 'all'
      ? milestoneStates
      : milestoneStates.filter(m => m.def.category === selectedCategory);

  const handleClaimReward = (milestoneId: string, rewardShards: number, title: string) => {
    const currentClaimed = meta.claimedArchiveMilestones ?? [];
    if (currentClaimed.includes(milestoneId)) return;

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) + rewardShards,
        claimedArchiveMilestones: [...currentClaimed, milestoneId],
      },
    }));

    setClaimFeedback(`✨ [${title}] 전승 달성! 별빛 파편 +${rewardShards}개 수령 완료!`);
  };

  return (
    <div
      data-testid="astral-archive-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 135,
      }}
      onClick={onClose}
    >
      <div
        data-testid="astral-archive-modal"
        style={{
          width: 'min(780px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #070913 0%, #111827 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #3b82f6',
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
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📜</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                성간 아카이브 (Astral Archive & Chronicle)
              </strong>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>
                달성률: {perks.unlockedCount}/{perks.totalMilestonesCount} 달성 | 수령 완료: {perks.claimedCount}개
              </div>
            </div>
          </div>
          <button
            data-testid="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Top Account-Wide Perks Banner */}
        <div
          data-testid="archive-perks-banner"
          style={{
            padding: '12px 18px',
            background: '#090d16',
            borderBottom: '1px solid #1e293b',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          <div style={{ background: '#0f172a', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#94a3b8' }}>골드 획득량</div>
            <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>+{perks.goldBonusPercent}%</div>
          </div>
          <div style={{ background: '#0f172a', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#94a3b8' }}>경험치 획득량</div>
            <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>+{perks.expBonusPercent}%</div>
          </div>
          <div style={{ background: '#0f172a', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#94a3b8' }}>올스탯 배율</div>
            <div style={{ fontWeight: 'bold', color: '#34d399' }}>
              +{Math.round((perks.omniStatMultiplier - 1) * 100)}%
            </div>
          </div>
          <div style={{ background: '#0f172a', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: '#94a3b8' }}>치명타 피해</div>
            <div style={{ fontWeight: 'bold', color: '#f43f5e' }}>+{perks.critDmgBonusPercent}%</div>
          </div>
        </div>

        {/* Feedback Alert */}
        {claimFeedback && (
          <div
            data-testid="archive-claim-feedback"
            style={{
              margin: '8px 18px 0',
              padding: '6px 12px',
              borderRadius: 6,
              background: '#064e3b',
              border: '1px solid #059669',
              color: '#a7f3d0',
              fontSize: 12,
            }}
          >
            {claimFeedback}
          </div>
        )}

        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 18px',
            borderBottom: '1px solid #1e293b',
            overflowX: 'auto',
          }}
        >
          {CATEGORY_TABS.map(tab => {
            const isSelected = tab.id === selectedCategory;
            return (
              <button
                key={tab.id}
                data-testid={`category-tab-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: isSelected ? '1px solid #3b82f6' : '1px solid #1e293b',
                  background: isSelected ? '#1e3a8a' : '#0f172a',
                  color: isSelected ? '#fff' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Milestone Grid */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {filteredMilestones.map(({ def, unlocked, claimed }) => (
            <div
              key={def.id}
              data-testid={`milestone-card-${def.id}`}
              style={{
                borderRadius: 8,
                background: unlocked ? '#0f172a' : '#090d16',
                border: unlocked
                  ? claimed
                    ? '1px solid #334155'
                    : '1px solid #3b82f6'
                  : '1px solid #1e293b',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: unlocked ? 1 : 0.6,
                gap: 6,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{def.icon}</span>
                    <strong style={{ fontSize: 13, color: unlocked ? '#f8fafc' : '#94a3b8' }}>
                      {def.title} ({def.hanja})
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: claimed ? '#064e3b' : unlocked ? '#1e3a8a' : '#334155',
                      color: claimed ? '#a7f3d0' : unlocked ? '#93c5fd' : '#cbd5e1',
                      fontWeight: 'bold',
                    }}
                  >
                    {claimed ? '수령 완료' : unlocked ? '달성 완료' : '미달성'}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>
                  [{def.categoryNameKR}]
                </div>

                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {def.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#facc15' }}>
                  보상: 별빛 파편 +{def.rewardShards}개
                </span>

                {unlocked && !claimed && (
                  <button
                    data-testid={`claim-btn-${def.id}`}
                    onClick={() => handleClaimReward(def.id, def.rewardShards, def.title)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: 'none',
                      background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    보상 수령
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
