/**
 * PantheonRaidModal.tsx — C1154: Eternal Pantheon Interactive Raid Modal UI.
 *
 * Provides the interactive UI for the 4-Titan Sequential Gauntlet:
 * - Real-time Pantheon Crest counter & clear statistics.
 * - 4-Phase Titan sequence showcase with live HP pools (500M ~ 2.5B HP).
 * - Full Gauntlet combat resolution with turn-by-turn phase tracking and rewards.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import {
  PANTHEON_TITANS,
  checkPantheonEligibility,
  resolveFullPantheonRaid,
  type PantheonFullRaidResult,
  type PantheonPhase,
} from '../systems/pantheonRaid';
import { getEquippedInstances } from '../systems/equipment';
import { getEffectiveElement } from '../systems/enchantSystem';
import { aggregateReforgeBonus } from '../systems/reforgeSystem';
import { HeroEntity } from '../hero/HeroEntity';
import { getPantheonTitanLore, PANTHEON_VICTORY_EPILOGUE } from '../data/pantheonRaidLore';
import { OmniverseArmoryModal } from './OmniverseArmoryModal';

interface Props {
  onClose: () => void;
}

export function PantheonRaidModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero() ?? HeroEntity.create({ seed: 42, heroHpMax: 100_000, heroAtkBase: 10_000 });

  const eqInst = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const equippedWeapon = eqInst.find(i => i.baseId.startsWith('w-'));
  const heroWeaponElement = equippedWeapon ? getEffectiveElement(equippedWeapon) : 'neutral';
  const reforgeBonus = aggregateReforgeBonus(eqInst);

  const eligibility = checkPantheonEligibility(meta);
  const crests = (meta as unknown as { pantheonCrests?: number }).pantheonCrests ?? 0;
  const clears = (meta as unknown as { pantheonClears?: number }).pantheonClears ?? 0;

  const [selectedPhase, setSelectedPhase] = useState<PantheonPhase>(1);
  const [raidResult, setRaidResult] = useState<PantheonFullRaidResult | null>(null);
  const [showArmory, setShowArmory] = useState(false);

  const handleChallengeRaid = () => {
    if (!hero || !eligibility.eligible) return;

    const result = resolveFullPantheonRaid(
      hero,
      heroWeaponElement,
      reforgeBonus.armorDrBonus,
      meta
    );

    setRaidResult(result);

    if (result.won && result.rewards) {
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + (result.rewards?.goldReward ?? 0),
        },
        meta: {
          ...s.meta,
          pantheonClears: ((s.meta as any).pantheonClears ?? 0) + 1,
          pantheonCrests: ((s.meta as any).pantheonCrests ?? 0) + (result.rewards?.pantheonCrests ?? 0),
          pantheonHighestPhase: 4,
        },
      }));
    }
  };

  const currentTitan = PANTHEON_TITANS[selectedPhase];

  return (
    <div
      data-testid="pantheon-raid-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div
        data-testid="pantheon-raid-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #09090b 0%, #170724 100%)',
          border: '1px solid #a855f7',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
          overflow: 'hidden',
          color: '#e4e4e7',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #3b0764',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #3b0764 0%, #1e1b4b 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏛️</span>
            <div>
              <strong style={{ fontSize: 17, color: '#faf5ff' }}>
                초월의 만신전 (Eternal Pantheon)
              </strong>
              <div style={{ fontSize: 11, color: '#d8b4fe' }}>
                4대 우주 거신과의 연속 사투를 극복하고 진 우주 주재신에 등극하십시오.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              data-testid="pantheon-crests-count"
              style={{
                fontSize: 12,
                background: '#4c1d95',
                border: '1px solid #c084fc',
                padding: '4px 10px',
                borderRadius: 20,
                color: '#f3e8ff',
                fontWeight: 'bold',
              }}
            >
              만신전 문장: {crests}개 (완파: {clears}회)
            </div>
            <button
              data-testid="open-armory-modal-btn"
              onClick={() => setShowArmory(true)}
              style={{
                background: '#78350f',
                border: '1px solid #f59e0b',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#fef08a',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✨ 신격 무기고
            </button>
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

        {/* 4-Titan Phase Selector Strip */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #2e1065',
            background: '#090514',
          }}
        >
          {([1, 2, 3, 4] as PantheonPhase[]).map(p => {
            const titan = PANTHEON_TITANS[p];
            const isSelected = selectedPhase === p;

            return (
              <button
                key={p}
                data-testid={`titan-tab-${p}`}
                onClick={() => setSelectedPhase(p)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: 'none',
                  background: isSelected ? '#3b0764' : 'transparent',
                  color: isSelected ? '#f5d0fe' : '#a855f7',
                  borderBottom: isSelected ? '2px solid #d946ef' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 11,
                  fontWeight: isSelected ? 'bold' : 'normal',
                }}
              >
                <span>
                  {titan.icon} Phase {p}
                </span>
                <span style={{ fontSize: 10, color: isSelected ? '#fff' : '#c084fc' }}>
                  {titan.nameKR}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Titan Showcase Card */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            data-testid="current-titan-card"
            style={{
              background: 'linear-gradient(135deg, #1e1136 0%, #150926 100%)',
              border: '1px solid #7e22ce',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{currentTitan.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#c084fc' }}>[{currentTitan.titleKR}]</div>
                  <strong style={{ fontSize: 16, color: '#fff' }}>{currentTitan.nameKR}</strong>
                  <div style={{ fontSize: 11, color: '#f0abfc', fontStyle: 'italic', marginTop: 2 }}>
                    "{getPantheonTitanLore(selectedPhase).entryDecree}"
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#581c87',
                  color: '#e9d5ff',
                  fontWeight: 'bold',
                }}
              >
                속성: {currentTitan.element.toUpperCase()}
              </span>
            </div>

            {/* Boss Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ color: '#c084fc' }}>최대 생명력</div>
                <div style={{ fontWeight: 'bold', color: '#f87171' }}>
                  {(currentTitan.hp / 100_000_000).toLocaleString()}억 HP
                </div>
              </div>
              <div>
                <div style={{ color: '#c084fc' }}>공격력</div>
                <div style={{ fontWeight: 'bold', color: '#facc15' }}>
                  {(currentTitan.atk / 10_000).toLocaleString()}만
                </div>
              </div>
              <div>
                <div style={{ color: '#c084fc' }}>방어력</div>
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                  {(currentTitan.def / 10_000).toLocaleString()}만
                </div>
              </div>
            </div>

            {/* Apocalyptic Modifier */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#2e1065',
                border: '1px solid #6b21a8',
                fontSize: 11,
                color: '#f5d0fe',
              }}
            >
              ⚡ <strong>종말의 기믹: </strong> {currentTitan.phaseModifierDescription}
            </div>
          </div>

          {/* Action Challenge Button */}
          {eligibility.eligible && (
            <button
              data-testid="challenge-pantheon-btn"
              onClick={handleChallengeRaid}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(90deg, #9333ea 0%, #c026d3 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)',
              }}
            >
              ⚔️ 만신전 4대 거신 연속 레이드 결행
            </button>
          )}

          {/* Raid Results Card */}
          {raidResult && (
            <div
              data-testid="raid-results-card"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                background: raidResult.won
                  ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                  : 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
                border: raidResult.won ? '1px solid #10b981' : '1px solid #ef4444',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                {raidResult.won
                  ? '🎉 만신전 완전 토벌 대승리!'
                  : `💀 Phase ${raidResult.phasesCleared + 1}에서 격퇴됨...`}
              </div>
              <div style={{ fontSize: 12, color: raidResult.won ? '#a7f3d0' : '#fca5a5' }}>
                돌파 페이즈: {raidResult.phasesCleared} / 4 | 소요 턴수: {raidResult.totalTurns}턴 | 가한 피해: {(raidResult.totalDamageDealt / 100_000_000).toFixed(1)}억
              </div>
              {raidResult.won && raidResult.rewards && (
                <div
                  data-testid="pantheon-victory-rewards"
                  style={{
                    fontSize: 12,
                    background: 'rgba(0,0,0,0.4)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    color: '#fef08a',
                    fontWeight: 'bold',
                  }}
                >
                  🏆 칭호 획득: [{raidResult.rewards.titleKR}] | 만신전 문장 +{raidResult.rewards.pantheonCrests}개 | 상금 +{(raidResult.rewards.goldReward / 100_000_000).toLocaleString()}억 G
                </div>
              )}
              {raidResult.won && (
                <div
                  data-testid="pantheon-victory-epilogue"
                  style={{ fontSize: 11, color: '#6ee7b7', fontStyle: 'italic', marginTop: 4 }}
                >
                  "{PANTHEON_VICTORY_EPILOGUE}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showArmory && <OmniverseArmoryModal onClose={() => setShowArmory(false)} />}
    </div>
  );
}
