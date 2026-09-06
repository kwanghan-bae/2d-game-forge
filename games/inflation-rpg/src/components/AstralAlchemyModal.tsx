/**
 * AstralAlchemyModal.tsx — C1064: Celestial Astral Alchemy Modal UI.
 *
 * Provides Taoist Danhak cauldron UI allowing heroes to transmute stones into
 * Starlight Shards and craft 4 legendary celestial elixirs for permanent stat expansions.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ALL_ELIXIRS,
  ELIXIR_DEFINITIONS,
  MAX_ELIXIR_DOSES,
  canCraftElixir,
  craftAndConsumeElixir,
  transmuteToShards,
  computeElixirStatBonuses,
  type ElixirType,
} from '../systems/astralAlchemy';
import { getElixirIngestionQuote, getCauldronProgressQuote } from '../data/alchemyFlavor';

interface Props {
  onClose: () => void;
}

export function AstralAlchemyModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const shards = meta.starlightShards ?? 0;
  const crackStones = meta.crackStones ?? 0;
  const enhanceStones = meta.enhanceStones ?? 0;
  const gold = run.goldThisRun ?? 0;
  const doses = meta.elixirDoses ?? {};

  const [activeTab, setActiveTab] = useState<'craft' | 'transmute'>('craft');
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalBonuses = computeElixirStatBonuses(doses);

  const handleCraft = (elixirId: ElixirType) => {
    const currentDose = doses[elixirId] ?? 0;
    const res = craftAndConsumeElixir(elixirId, shards, gold, currentDose);
    if (!res.success) {
      setFeedback(`❌ ${res.message}`);
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
        elixirDoses: {
          ...(s.meta.elixirDoses ?? {}),
          [elixirId]: res.newDoseCount,
        },
      },
    }));

    const quote = getElixirIngestionQuote(elixirId, res.newDoseCount);
    setFeedback(`${res.message} — "${quote}"`);
  };

  const handleTransmute = (sourceType: 'crackStone' | 'enhanceStone', count: number) => {
    const available = sourceType === 'crackStone' ? crackStones : enhanceStones;
    if (available < count) {
      setFeedback(`❌ 재료가 부족합니다.`);
      return;
    }

    const res = transmuteToShards(sourceType, count);
    if (res.shardsGained <= 0) return;

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        crackStones:
          sourceType === 'crackStone'
            ? (s.meta.crackStones ?? 0) - res.stonesConsumed
            : s.meta.crackStones,
        enhanceStones:
          sourceType === 'enhanceStone'
            ? s.meta.enhanceStones - res.stonesConsumed
            : s.meta.enhanceStones,
        starlightShards: (s.meta.starlightShards ?? 0) + res.shardsGained,
      },
    }));

    const sourceName = sourceType === 'crackStone' ? '차원 균열석' : '강화석';
    setFeedback(
      `✨ [${sourceName} ${res.stonesConsumed}개]를 정제하여 [별빛 파편 +${res.shardsGained}개]를 추출했습니다!`,
    );
  };

  return (
    <div
      data-testid="alchemy-modal-backdrop"
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
        data-testid="alchemy-modal"
        style={{
          width: 'min(620px, 96vw)',
          maxHeight: '92vh',
          background: '#0c101c',
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
            background: '#121829',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚗️</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>천상 성광 연금술 가마</strong>
              <span style={{ fontSize: 11, color: '#38bdf8', marginLeft: 8 }}>
                ✨ 별빛 파편: {shards.toLocaleString()}개
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {gold.toLocaleString()}G</span>
            <span style={{ color: '#c084fc' }}>🔮 {crackStones}개</span>
            <span style={{ color: '#60a5fa' }}>💎 {enhanceStones}개</span>
          </div>
          <button
            data-testid="close-alchemy-btn"
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0e1422' }}>
          <button
            data-testid="tab-craft-elixir"
            onClick={() => { setActiveTab('craft'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'craft' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'craft' ? '2px solid #38bdf8' : 'none',
              color: activeTab === 'craft' ? '#38bdf8' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            천상 영약 연성 (Craft Elixirs)
          </button>
          <button
            data-testid="tab-transmute-shards"
            onClick={() => { setActiveTab('transmute'); setFeedback(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === 'transmute' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'transmute' ? '2px solid #c084fc' : 'none',
              color: activeTab === 'transmute' ? '#c084fc' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            파편 추출 / 정제 (Transmute Shards)
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            data-testid="alchemy-feedback-banner"
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
          {activeTab === 'craft' ? (
            /* Elixir Crafting Grid */
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>4대 천상 영약 연성:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                {ALL_ELIXIRS.map(elixirId => {
                  const def = ELIXIR_DEFINITIONS[elixirId];
                  const doseCount = doses[elixirId] ?? 0;
                  const isMax = doseCount >= MAX_ELIXIR_DOSES;
                  const canAfford = canCraftElixir(elixirId, shards, gold, doseCount);

                  return (
                    <div
                      key={elixirId}
                      data-testid={`elixir-card-${elixirId}`}
                      style={{
                        background: '#131929',
                        borderRadius: 8,
                        padding: 12,
                        border: isMax ? '1px solid #d97706' : '1px solid #1e293b',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 22 }}>{def.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: 13, color: '#f8fafc' }}>
                                {def.nameKR}
                              </div>
                              <div style={{ fontSize: 10, color: '#c084fc' }}>{def.hanja}</div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 'bold',
                              color: isMax ? '#fbbf24' : '#38bdf8',
                            }}
                          >
                            {isMax ? 'MAX' : `${doseCount}/${MAX_ELIXIR_DOSES}회`}
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0', lineHeight: 1.4 }}>
                          {def.description}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>
                          비용: ✨ {def.costShards}개 + 💰 {def.costGold.toLocaleString()}G
                        </div>

                        <button
                          data-testid={`craft-btn-${elixirId}`}
                          disabled={isMax || !canAfford}
                          onClick={() => handleCraft(elixirId)}
                          style={{
                            width: '100%',
                            padding: '6px 0',
                            borderRadius: 6,
                            border: 'none',
                            background: isMax ? '#334155' : canAfford ? '#0284c7' : '#1e293b',
                            color: isMax ? '#94a3b8' : canAfford ? '#fff' : '#64748b',
                            fontWeight: 'bold',
                            fontSize: 12,
                            cursor: isMax ? 'default' : canAfford ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {isMax ? '✓ 한도 달성' : canAfford ? '연성 및 복용' : '재료 부족'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Shard Transmutation Tab */
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                원석을 가마에 투입하여 별빛 파편(Starlight Shards)을 추출합니다:
              </div>

              {/* Crack Stones */}
              <div
                style={{
                  background: '#131929',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#c084fc', marginBottom: 8 }}>
                  🔮 차원 균열석 정제 (1개당 파편 10개)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    data-testid="transmute-crack-1-btn"
                    disabled={crackStones < 1}
                    onClick={() => handleTransmute('crackStone', 1)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #7e22ce',
                      background: crackStones >= 1 ? '#581c87' : '#1e1b4b',
                      color: crackStones >= 1 ? '#f3e8ff' : '#64748b',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: crackStones >= 1 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    균열석 1개 ➔ ✨ 10개
                  </button>
                  <button
                    data-testid="transmute-crack-5-btn"
                    disabled={crackStones < 5}
                    onClick={() => handleTransmute('crackStone', 5)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #7e22ce',
                      background: crackStones >= 5 ? '#581c87' : '#1e1b4b',
                      color: crackStones >= 5 ? '#f3e8ff' : '#64748b',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: crackStones >= 5 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    균열석 5개 ➔ ✨ 50개
                  </button>
                </div>
              </div>

              {/* Enhance Stones */}
              <div
                style={{
                  background: '#131929',
                  borderRadius: 8,
                  padding: 12,
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#60a5fa', marginBottom: 8 }}>
                  💎 강화석 정제 (5개당 파편 10개)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    data-testid="transmute-enhance-5-btn"
                    disabled={enhanceStones < 5}
                    onClick={() => handleTransmute('enhanceStone', 5)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #1d4ed8',
                      background: enhanceStones >= 5 ? '#1e40af' : '#172554',
                      color: enhanceStones >= 5 ? '#dbeafe' : '#64748b',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: enhanceStones >= 5 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    강화석 5개 ➔ ✨ 10개
                  </button>
                  <button
                    data-testid="transmute-enhance-25-btn"
                    disabled={enhanceStones < 25}
                    onClick={() => handleTransmute('enhanceStone', 25)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #1d4ed8',
                      background: enhanceStones >= 25 ? '#1e40af' : '#172554',
                      color: enhanceStones >= 25 ? '#dbeafe' : '#64748b',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: enhanceStones >= 25 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    강화석 25개 ➔ ✨ 50개
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aggregated Stat Bonus Panel */}
          <div
            data-testid="elixir-total-bonuses"
            style={{
              background: '#131828',
              borderRadius: 8,
              padding: 12,
              marginTop: 14,
              border: '1px solid #1f2a44',
            }}
          >
            <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold', marginBottom: 4 }}>
              ✨ 천상 영약 누적 영구 스탯 (상시 적용):
            </div>
            <div
              data-testid="cauldron-progress-quote"
              style={{ fontSize: 11, fontStyle: 'italic', color: '#cbd5e1', marginBottom: 8 }}
            >
              {getCauldronProgressQuote(totalBonuses.totalDoses)}
            </div>
            {totalBonuses.totalDoses === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                아직 복용한 영약이 없습니다. 영약을 연성하여 용사의 근원 스탯을 영구 강화하세요!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                {totalBonuses.atkPercent > 0 && <div>⚔️ 공격력: +{totalBonuses.atkPercent}%</div>}
                {totalBonuses.hpPercent > 0 && <div>❤️ 최대 체력: +{totalBonuses.hpPercent}%</div>}
                {totalBonuses.defPercent > 0 && <div>🛡️ 방어력: +{totalBonuses.defPercent}%</div>}
                {totalBonuses.spdFlat > 0 && <div>⚡ 행동속도: +{totalBonuses.spdFlat}</div>}
                {totalBonuses.critRate > 0 && (
                  <div>🎯 치명타율: +{(totalBonuses.critRate * 100).toFixed(0)}%</div>
                )}
                {totalBonuses.elementalDmgPercent > 0 && (
                  <div>🌀 속성 공명 피해: +{totalBonuses.elementalDmgPercent}%</div>
                )}
                {totalBonuses.damageReduction > 0 && (
                  <div>🛡️ 받는 피해 감소: +{(totalBonuses.damageReduction * 100).toFixed(1)}%</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
