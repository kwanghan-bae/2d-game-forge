/**
 * ChronoRebirthModal.tsx — C1142: Chrono-Rift Warp & Singularity Rebirth Interactive UI.
 *
 * Provides the interactive UI for prestige reincarnation:
 * - Displays player's qualified Rebirth Tier and perks (Starting Lv, Gold, Drop Rate, Chrono Essence).
 * - Shows comparison of all 4 Rebirth Tiers with Archive Mastery requirements.
 * - Safely executes Chrono Rebirth, resetting current run with amplified initial advantages.
 */

import { useState } from 'react';
import { useGameStore, INITIAL_RUN } from '../store/gameStore';
import {
  CHRONO_REBIRTH_TIERS,
  checkChronoRebirthEligibility,
  executeChronoRebirth,
  type ChronoRebirthSummary,
} from '../systems/chronoRebirth';
import { getChronoRebirthLore } from '../data/chronoRebirthLore';
import { evaluateArchiveMastery } from '../systems/astralArchive';

interface Props {
  onClose: () => void;
}

export function ChronoRebirthModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const [rebirthSummary, setRebirthSummary] = useState<ChronoRebirthSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const eligibility = checkChronoRebirthEligibility(meta);
  const { perks } = evaluateArchiveMastery(meta);

  const totalRebirths = (meta as unknown as { totalRebirths?: number }).totalRebirths ?? 0;
  const chronoEssence = (meta as unknown as { chronoEssence?: number }).chronoEssence ?? 0;

  const handleExecuteRebirth = () => {
    if (!eligibility.eligible || !confirmed) return;

    const result = executeChronoRebirth(meta, INITIAL_RUN);

    useGameStore.setState({
      meta: result.newMeta,
      run: result.newRun,
    });

    setRebirthSummary(result.summary);
  };

  return (
    <div
      data-testid="chrono-rebirth-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 140,
      }}
      onClick={onClose}
    >
      <div
        data-testid="chrono-rebirth-modal"
        style={{
          width: 'min(720px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0b0716 0%, #170d2c 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #d946ef',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.9)',
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
            background: 'linear-gradient(90deg, #2e1065 0%, #701a75 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⌛</span>
            <div>
              <strong style={{ fontSize: 16, color: '#fae8ff' }}>
                시공 도약 & 특이점 환생 (Chrono Rebirth)
              </strong>
              <div style={{ fontSize: 11, color: '#f0abfc', marginTop: 2 }}>
                누적 환생: {totalRebirths}회 | 시공 정수: {chronoEssence}개 | 아카이브 마스터리: {perks.masteryRank}/16
              </div>
            </div>
          </div>
          <button
            data-testid="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#f5d0fe',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active Qualified Tier Showcase */}
          {eligibility.eligible && eligibility.tier && !rebirthSummary && (
            <div
              data-testid="qualified-tier-card"
              style={{
                borderRadius: 8,
                background: 'linear-gradient(135deg, #2e1065 0%, #4a044e 100%)',
                border: '1px solid #d946ef',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{eligibility.tier.icon}</span>
                  <div>
                    <strong style={{ fontSize: 16, color: '#fff' }}>
                      현재 도약 가능 티어: {eligibility.tier.nameKR} ({eligibility.tier.hanja})
                    </strong>
                    <div style={{ fontSize: 11, color: '#f5d0fe' }}>{eligibility.tier.description}</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: '#86198f',
                    color: '#fdf4ff',
                    fontWeight: 'bold',
                  }}
                >
                  자격 충족
                </span>
              </div>

              {/* Perks Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '10px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: '#d8b4fe' }}>시작 레벨</div>
                  <div style={{ fontWeight: 'bold', color: '#6ee7b7' }}>Lv. {eligibility.tier.startingLevel}</div>
                </div>
                <div>
                  <div style={{ color: '#d8b4fe' }}>시작 금고</div>
                  <div style={{ fontWeight: 'bold', color: '#facc15' }}>
                    {(eligibility.tier.startingGold / 1_000_000).toLocaleString()}M G
                  </div>
                </div>
                <div>
                  <div style={{ color: '#d8b4fe' }}>드랍률 배율</div>
                  <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>{eligibility.tier.dropRateMultiplier}x</div>
                </div>
                <div>
                  <div style={{ color: '#d8b4fe' }}>시공 정수 지급</div>
                  <div style={{ fontWeight: 'bold', color: '#f43f5e' }}>+{eligibility.tier.chronoEssenceReward}개</div>
                </div>
              </div>
            </div>
          )}

          {/* Ineligible Alert */}
          {!eligibility.eligible && (
            <div
              data-testid="ineligible-alert"
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: '#450a0a',
                border: '1px solid #dc2626',
                color: '#fca5a5',
                fontSize: 12,
              }}
            >
              ⚠️ {eligibility.reason}
            </div>
          )}

          {/* All 4 Rebirth Tiers Comparison List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e9d5ff' }}>
              전체 시공 도약 티어 계위 (All Rebirth Tiers)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {CHRONO_REBIRTH_TIERS.map(t => {
                const isCurrent = eligibility.tier?.id === t.id;
                const isUnlocked = perks.masteryRank >= t.minMasteryRank;
                const tLore = getChronoRebirthLore(t.id);

                return (
                  <div
                    key={t.id}
                    data-testid={`rebirth-tier-item-${t.id}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: isCurrent ? '#3b0764' : '#0f0a1c',
                      border: isCurrent ? '1px solid #d946ef' : '1px solid #2e1065',
                      opacity: isUnlocked ? 1 : 0.6,
                      fontSize: 11,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: isUnlocked ? '#fdf4ff' : '#a855f7' }}>
                        {t.icon} {t.nameKR}
                      </span>
                      <span style={{ fontSize: 10, color: isUnlocked ? '#86efac' : '#f87171' }}>
                        {isUnlocked ? '해금' : `마스터리 ${t.minMasteryRank}필요`}
                      </span>
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      Lv. {t.startingLevel} 시작 | {(t.startingGold / 1_000_000).toLocaleString()}M G | {t.dropRateMultiplier}x 드랍 | 정수 +{t.chronoEssenceReward}개
                    </div>
                    <div style={{ fontSize: 10, color: '#c084fc', fontStyle: 'italic', marginTop: 2 }}>
                      "{tLore.weaverIncantation}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rebirth Confirmation & Execution */}
          {eligibility.eligible && !rebirthSummary && (
            <div
              style={{
                marginTop: 6,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#150d28',
                border: '1px solid #4a044e',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#fdf4ff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  data-testid="rebirth-confirm-checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                />
                <span>현재 런의 레벨과 골드가 초기화되며 환생 특전(Lv.{eligibility.tier?.startingLevel}, {(eligibility.tier?.startingGold ?? 0) / 1_000_000}M G)으로 새 여정을 시작합니다.</span>
              </label>

              <button
                data-testid="execute-rebirth-btn"
                disabled={!confirmed}
                onClick={handleExecuteRebirth}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: confirmed
                    ? 'linear-gradient(90deg, #a21caf 0%, #c026d3 100%)'
                    : '#334155',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: confirmed ? 'pointer' : 'not-allowed',
                  boxShadow: confirmed ? '0 4px 16px rgba(217, 70, 239, 0.4)' : 'none',
                }}
              >
                ⌛ {eligibility.tier?.nameKR} 실행
              </button>
            </div>
          )}

          {/* Post-Rebirth Success Card */}
          {rebirthSummary && (
            <div
              data-testid="rebirth-success-card"
              style={{
                padding: '16px 18px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                border: '1px solid #10b981',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 20 }}>🎉 환생 대성공!</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#a7f3d0' }}>
                [{rebirthSummary.tier.nameKR}]으로 새로운 시공간에 재림하였습니다!
              </div>
              <div style={{ fontSize: 12, color: '#d1fae5' }}>
                시작 레벨: Lv. {rebirthSummary.startingLevel} | 시작 골드: {rebirthSummary.startingGold.toLocaleString()}G | 시공 정수 +{rebirthSummary.chronoEssenceGained}개 획득!
              </div>
              <div
                data-testid="rebirth-epilogue"
                style={{ fontSize: 11, color: '#6ee7b7', fontStyle: 'italic', marginTop: 4 }}
              >
                "{getChronoRebirthLore(rebirthSummary.tier.id).rebirthEpilogue}"
              </div>
              <button
                data-testid="rebirth-done-btn"
                onClick={onClose}
                style={{
                  marginTop: 8,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#10b981',
                  color: '#064e3b',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                새로운 모험 시작
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
