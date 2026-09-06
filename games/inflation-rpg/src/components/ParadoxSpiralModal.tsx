/**
 * ParadoxSpiralModal.tsx — C1166: Paradox Spiral Interactive Tower Modal UI.
 *
 * Interactive endless tower climb modal:
 * - Floor ladder with milestone recognition (every 10 floors).
 * - Active Paradox Anomaly badges with live tooltips.
 * - Procedural guardian showcase and turn-based battle simulation.
 * - Turn logs, victory rewards, and highest floor progression.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import {
  checkParadoxEligibility,
  generateParadoxGuardian,
  resolveParadoxFloorCombat,
  PARADOX_ANOMALIES,
  type ParadoxCombatResult,
} from '../systems/paradoxSpiral';
import { getEquippedInstances } from '../systems/equipment';
import { getEffectiveElement } from '../systems/enchantSystem';
import { aggregateReforgeBonus } from '../systems/reforgeSystem';
import { HeroEntity } from '../hero/HeroEntity';

interface Props {
  onClose: () => void;
}

export function ParadoxSpiralModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero() ?? HeroEntity.create({ seed: 42, heroHpMax: 10_000_000, heroAtkBase: 50_000_000, heroDefBase: 5_000_000 });

  const eqInst = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const equippedWeapon = eqInst.find(i => i.baseId.startsWith('w-'));
  const heroWeaponElement = equippedWeapon ? getEffectiveElement(equippedWeapon) : 'neutral';
  const reforgeBonus = aggregateReforgeBonus(eqInst);

  const highestFloor = meta.paradoxHighestFloor ?? 0;
  const eligibility = checkParadoxEligibility(meta);

  const [selectedFloor, setSelectedFloor] = useState<number>(
    Math.max(1, Math.min(highestFloor + 1, 100))
  );
  const [battleResult, setBattleResult] = useState<ParadoxCombatResult | null>(null);

  const guardian = generateParadoxGuardian(selectedFloor);

  const handleChallenge = () => {
    if (!hero || !eligibility.eligible) return;

    const result = resolveParadoxFloorCombat(
      hero,
      heroWeaponElement,
      reforgeBonus.armorDrBonus,
      meta,
      selectedFloor
    );

    setBattleResult(result);

    if (result.won && result.rewards) {
      const newHighest = Math.max(highestFloor, result.floor);
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + (result.rewards?.goldReward ?? 0),
        },
        meta: {
          ...s.meta,
          paradoxHighestFloor: newHighest,
        },
      }));
    }
  };

  return (
    <div
      data-testid="paradox-spiral-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        data-testid="paradox-spiral-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #050510 0%, #100624 100%)',
          border: '1px solid #6366f1',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
          overflow: 'hidden',
          color: '#e0e7ff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #312e81',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌀</span>
            <div>
              <strong style={{ fontSize: 17, color: '#e0e7ff' }}>
                시공 역설 나선 (The Paradox Spiral)
              </strong>
              <div style={{ fontSize: 11, color: '#a5b4fc' }}>
                사건의 지평선 너머, 시공의 법칙이 붕괴된 무한의 나선 층계를 등반하십시오.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              data-testid="paradox-highest-floor"
              style={{
                fontSize: 12,
                background: '#3730a3',
                border: '1px solid #818cf8',
                padding: '4px 10px',
                borderRadius: 20,
                color: '#e0e7ff',
                fontWeight: 'bold',
              }}
            >
              최고 돌파: Floor {highestFloor}
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
        </div>

        {/* Ineligible Alert */}
        {!eligibility.eligible && (
          <div
            data-testid="ineligible-alert"
            style={{
              padding: '12px 20px',
              background: '#450a0a',
              borderBottom: '1px solid #dc2626',
              color: '#fca5a5',
              fontSize: 12,
            }}
          >
            ⚠️ {eligibility.reason}
          </div>
        )}

        {/* Floor Stepper & Guardian Details */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Floor Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#18182b',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #2e285a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                data-testid="prev-floor-btn"
                disabled={selectedFloor <= 1}
                onClick={() => setSelectedFloor(f => Math.max(1, f - 1))}
                style={{
                  background: selectedFloor <= 1 ? '#27272a' : '#4338ca',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  color: selectedFloor <= 1 ? '#71717a' : '#fff',
                  cursor: selectedFloor <= 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ◀ 이전 층
              </button>
              <div
                data-testid="selected-floor-display"
                style={{ fontSize: 16, fontWeight: 'bold', color: '#c7d2fe', minWidth: 90, textAlign: 'center' }}
              >
                Floor {selectedFloor}
              </div>
              <button
                data-testid="next-floor-btn"
                disabled={selectedFloor > highestFloor + 1}
                onClick={() => setSelectedFloor(f => f + 1)}
                style={{
                  background: selectedFloor > highestFloor + 1 ? '#27272a' : '#4338ca',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  color: selectedFloor > highestFloor + 1 ? '#71717a' : '#fff',
                  cursor: selectedFloor > highestFloor + 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                다음 층 ▶
              </button>
            </div>

            {guardian.isMilestoneFloor && (
              <span
                data-testid="milestone-badge"
                style={{
                  background: '#f59e0b',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                ⭐ 마일스톤 보스층
              </span>
            )}
          </div>

          {/* Guardian Card */}
          <div
            data-testid="guardian-card"
            style={{
              background: '#131127',
              border: guardian.isMilestoneFloor ? '1px solid #a855f7' : '1px solid #2e285a',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16, color: '#fff' }}>{guardian.nameKR}</strong>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    background: '#312e81',
                    padding: '2px 6px',
                    borderRadius: 4,
                    color: '#c7d2fe',
                  }}
                >
                  속성: {guardian.element.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#a5b4fc' }}>
                체력: {(guardian.maxHp / 100_000_000).toFixed(2)}억 HP
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, textAlign: 'center', background: '#0a081a', padding: '8px 12px', borderRadius: 6 }}>
              <div>
                <div style={{ color: '#94a3b8' }}>공격력</div>
                <div style={{ color: '#f87171', fontWeight: 'bold' }}>{(guardian.atk / 10_000).toFixed(0)}만</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>방어력</div>
                <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{guardian.def.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>예상 난이도</div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>Tier {Math.ceil(selectedFloor / 10)}</div>
              </div>
            </div>

            {/* Active Anomalies List */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#c7d2fe', marginBottom: 6 }}>
                🌀 역설 변칙 현상 ({guardian.anomalies.length}개):
              </div>
              {guardian.anomalies.length === 0 ? (
                <div style={{ fontSize: 11, color: '#71717a' }}>활성화된 변칙 없음 (기본 물리 법칙 적용)</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {guardian.anomalies.map(anoId => {
                    const ano = PARADOX_ANOMALIES[anoId];
                    return (
                      <div
                        key={anoId}
                        data-testid={`anomaly-badge-${anoId}`}
                        style={{
                          background: '#1e1b4b',
                          border: '1px solid #4338ca',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{ano.icon}</span>
                        <strong style={{ color: '#fca5a5' }}>{ano.nameKR} ({ano.hanja}):</strong>
                        <span style={{ color: '#c7d2fe' }}>{ano.description}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Challenge Button */}
          {eligibility.eligible && (
            <button
              data-testid="challenge-floor-btn"
              onClick={handleChallenge}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              }}
            >
              ⚔️ Floor {selectedFloor} 인과 돌파 결전
            </button>
          )}

          {/* Combat Result Card */}
          {battleResult && (
            <div
              data-testid="battle-results-card"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                background: battleResult.won
                  ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                  : 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
                border: battleResult.won ? '1px solid #10b981' : '1px solid #ef4444',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 'bold' }}>
                {battleResult.won
                  ? `🎉 Floor ${battleResult.floor} 돌파 성공!`
                  : `💀 Floor ${battleResult.floor}에서 격퇴됨...`}
              </div>
              <div style={{ fontSize: 12, color: battleResult.won ? '#a7f3d0' : '#fca5a5' }}>
                소요 턴수: {battleResult.turns}턴 | 가한 총 피해: {(battleResult.totalDamageDealt / 100_000_000).toFixed(2)}억 | 받은 피해: {(battleResult.totalDamageTaken / 100_000_000).toFixed(2)}억
              </div>
              {battleResult.won && battleResult.rewards && (
                <div
                  data-testid="battle-victory-rewards"
                  style={{
                    fontSize: 12,
                    background: 'rgba(0,0,0,0.4)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    color: '#fef08a',
                    fontWeight: 'bold',
                  }}
                >
                  🏆 획득 보상: 골드 +{(battleResult.rewards.goldReward / 100_000_000).toLocaleString()}억 G | 역설의 분진 +{battleResult.rewards.paradoxDust}개
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
