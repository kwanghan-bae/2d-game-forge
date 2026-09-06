/**
 * ApexTrialModal.tsx — C1105: Apex Trial Challenge Summit Modal UI.
 *
 * Provides the interactive UI for the 3-tier endgame Apex Trial Gauntlet:
 * - Tier 1: 태초의 여명 (Primordial Dawn)
 * - Tier 2: 불멸의 황혼 (Immortal Dusk)
 * - Tier 3: 무극의 극점 (Apex of Zenith)
 *
 * Seamlessly integrates prerequisites checking, boss tactical mechanic inspection,
 * live combat resolution with transmuted relics & mythic resonance, and reward claims.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { getEquippedInstances } from '../systems/equipment';
import { getEffectiveElement } from '../systems/enchantSystem';
import { aggregateReforgeBonus } from '../systems/reforgeSystem';
import { computeZodiacResonance } from '../systems/zodiacSystem';
import { computeElixirStatBonuses } from '../systems/astralAlchemy';
import { computeEquippedRelicBonuses, type RelicSlotType } from '../systems/celestialRelics';
import { computeCumulativeAwakeningStats } from '../systems/celestialAwakening';
import { ElementalBadge } from './ElementalBadge';
import {
  APEX_TRIAL_BOSSES,
  checkApexTrialUnlock,
  resolveApexTrialCombat,
  type ApexTrialTier,
  type ApexCombatResult,
} from '../systems/apexTrialChallenge';

interface Props {
  onClose: () => void;
}

const ALL_TIERS: ApexTrialTier[] = [1, 2, 3];

export function ApexTrialModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  const highestRiftDepth = meta.highestRiftDepth ?? 0;
  const clearedTiers = meta.apexTrialsCleared ?? [];
  const transmutedRelics = meta.transmutedRelics ?? [];

  // Calculate equipped gear synergies & Mythic Stars
  const eqInst = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const equippedWeapon = eqInst.find(i => i.baseId.startsWith('w-'));
  const playerElement = equippedWeapon ? getEffectiveElement(equippedWeapon) : 'neutral';

  const mythicStarsTotal = eqInst.reduce((acc, item) => acc + (item.mythicStars ?? 0), 0);

  const reforgeBonus = aggregateReforgeBonus(eqInst);
  const zodiacBonus = computeZodiacResonance(meta.zodiacUnlocked ?? []);
  const elixirBonus = computeElixirStatBonuses(meta.elixirDoses ?? {});

  const equippedWithSlots = eqInst.map(instance => {
    let slotType: RelicSlotType = 'weapon';
    if (instance.baseId.startsWith('a-')) slotType = 'armor';
    else if (instance.baseId.startsWith('acc-')) slotType = 'accessory';
    return { instance, slotType };
  });
  const relicBonus = computeEquippedRelicBonuses(equippedWithSlots);
  const awakeningStats = computeCumulativeAwakeningStats(meta.awakeningTier ?? 0);

  const totalDR = Math.min(
    0.90,
    reforgeBonus.armorDrBonus +
      (zodiacBonus.damageReduction ?? 0) +
      (elixirBonus.damageReduction ?? 0) +
      (relicBonus.damageReduction ?? 0) +
      awakeningStats.damageReduction,
  );

  const totalElementalBonus =
    (zodiacBonus.elementalDmgPercent ?? 0) / 100 +
    (elixirBonus.elementalDmgPercent ?? 0) / 100 +
    ((relicBonus.elementalDmgPercent ?? 0) / 100) +
    awakeningStats.elementalDmgPercent / 100;

  const finalDmgMultiplier = awakeningStats.finalDmgMultiplier;

  // Selected Tier (default to first uncleared tier or tier 1)
  const defaultTier: ApexTrialTier =
    (ALL_TIERS.find(t => !clearedTiers.includes(t)) as ApexTrialTier) ?? 1;

  const [selectedTier, setSelectedTier] = useState<ApexTrialTier>(defaultTier);
  const [combatResult, setCombatResult] = useState<ApexCombatResult | null>(null);

  const bossDef = APEX_TRIAL_BOSSES[selectedTier];
  const unlockStatus = checkApexTrialUnlock(
    selectedTier,
    highestRiftDepth,
    clearedTiers,
    transmutedRelics.length,
    mythicStarsTotal
  );

  const isTierCleared = clearedTiers.includes(selectedTier);

  const handleChallenge = () => {
    if (!hero || !unlockStatus.unlocked) return;

    const result = resolveApexTrialCombat(hero, selectedTier, {
      weaponElement: playerElement,
      playerDR: totalDR,
      playerElementalBonus: totalElementalBonus,
      finalDmgMultiplier,
      defPierce: 0,
      transmutedRelics,
      mythicStarsTotal,
    });

    setCombatResult(result);

    if (result.won && result.rewards) {
      const nextCleared = clearedTiers.includes(selectedTier)
        ? clearedTiers
        : [...clearedTiers, selectedTier];

      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + result.rewards!.gold,
        },
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) + result.rewards!.starlightShards,
          crackStones: (s.meta.crackStones ?? 0) + result.rewards!.crackStones,
          apexTrialsCleared: nextCleared,
        },
      }));
    }
  };

  return (
    <div
      data-testid="apex-trial-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 115,
      }}
      onClick={onClose}
    >
      <div
        data-testid="apex-trial-modal"
        style={{
          width: 'min(640px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #090b14 0%, #111425 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #3b82f6',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
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
            background: 'linear-gradient(90deg, #1e1b4b 0%, #311042 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🌌</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                무극의 초월 시련 (Apex Trial Summit)
              </strong>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>
                정복 달성: {clearedTiers.length}/3 단계 | 초월 성유물: {transmutedRelics.length}/4 | 신화 성운: {mythicStarsTotal}성
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

        {/* Tier Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            padding: '12px 16px',
            background: '#070913',
            borderBottom: '1px solid #1e293b',
          }}
        >
          {ALL_TIERS.map(t => {
            const def = APEX_TRIAL_BOSSES[t];
            const status = checkApexTrialUnlock(
              t,
              highestRiftDepth,
              clearedTiers,
              transmutedRelics.length,
              mythicStarsTotal
            );
            const isSelected = t === selectedTier;
            const isCleared = clearedTiers.includes(t);

            return (
              <button
                key={t}
                data-testid={`tier-btn-${t}`}
                onClick={() => {
                  setSelectedTier(t);
                  setCombatResult(null);
                }}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: isSelected ? '2px solid #38bdf8' : '1px solid #1e293b',
                  background: isSelected ? '#1e293b' : '#0f172a',
                  color: status.unlocked ? '#f8fafc' : '#64748b',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  opacity: status.unlocked ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 'bold' }}>
                  {t}단계: {t === 1 ? '태초의 여명' : t === 2 ? '불멸의 황혼' : '무극의 극점'}
                </span>
                <span style={{ fontSize: 11, color: isCleared ? '#34d399' : status.unlocked ? '#93c5fd' : '#f87171' }}>
                  {isCleared ? '👑 정복 완료' : status.unlocked ? '도전 가능' : '🔒 잠김'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Boss Inspection & Challenge Panel */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Boss Header Banner */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{bossDef.title} ({bossDef.hanja})</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span data-testid="boss-name">{bossDef.nameKR}</span>
                  <ElementalBadge element={bossDef.element} />
                </div>
              </div>
              {isTierCleared && (
                <span
                  style={{
                    fontSize: 12,
                    color: '#34d399',
                    background: '#064e3b',
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: '1px solid #059669',
                    fontWeight: 'bold',
                  }}
                >
                  👑 COMPLETE
                </span>
              )}
            </div>

            {/* Boss Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 6,
                background: '#090d16',
                border: '1px solid #1e293b',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ color: '#94a3b8' }}>HP (생명력)</div>
                <div style={{ fontWeight: 'bold', color: '#f43f5e' }}>{bossDef.maxHp.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>ATK (공격력)</div>
                <div style={{ fontWeight: 'bold', color: '#fb923c' }}>{bossDef.atk.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>DEF (방어력)</div>
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>{bossDef.def.toLocaleString()}</div>
              </div>
            </div>

            {/* Boss Special Mechanic */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#cbd5e1', background: '#1e1b4b', padding: '8px 12px', borderRadius: 6, border: '1px solid #3730a3' }}>
              <strong style={{ color: '#c084fc' }}>⚡ 보스 고유 기믹:</strong> {bossDef.specialMechanic}
            </div>

            {/* Rewards */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>🎁 격파 보상:</span>
              <span>✨ 별빛 파편 +{bossDef.rewards.starlightShards}</span>
              <span>💎 균열석 +{bossDef.rewards.crackStones}</span>
              <span>🪙 골드 +{bossDef.rewards.gold.toLocaleString()}</span>
              <span>🏷️ [{bossDef.rewards.title}]</span>
            </div>
          </div>

          {/* Unlock Requirements Notice */}
          {!unlockStatus.unlocked && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: '#450a0a',
                border: '1px solid #b91c1c',
                color: '#fca5a5',
                fontSize: 12,
              }}
            >
              🔒 <strong>시련 해금 조건 미달:</strong> {unlockStatus.requirementDescription}
            </div>
          )}

          {/* Action Button */}
          <button
            data-testid="challenge-apex-btn"
            disabled={!unlockStatus.unlocked || !hero}
            onClick={handleChallenge}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: unlockStatus.unlocked
                ? 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)'
                : '#334155',
              color: '#fff',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: unlockStatus.unlocked ? 'pointer' : 'not-allowed',
              boxShadow: unlockStatus.unlocked ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
            }}
          >
            ⚔️ {bossDef.nameKR}에게 도전하기
          </button>

          {/* Combat Result Card */}
          {combatResult && (
            <div
              data-testid="apex-combat-result"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                background: combatResult.won ? '#064e3b' : '#450a0a',
                border: combatResult.won ? '1px solid #10b981' : '1px solid #ef4444',
                color: '#fff',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                {combatResult.won
                  ? `🎉 ${combatResult.bossName} 토벌 성공! (${combatResult.turns}턴)`
                  : `💀 ${combatResult.bossName} 토벌 실패... (${combatResult.turns}턴)`}
              </div>

              <div>
                가한 피해: {combatResult.damageDealt.toLocaleString()} | 받은 피해: {combatResult.damageTaken.toLocaleString()}
              </div>

              {combatResult.relicsTriggered.length > 0 && (
                <div style={{ fontSize: 11, color: '#6ee7b7' }}>
                  <strong>발동된 성유물 스킬:</strong> {combatResult.relicsTriggered.join(', ')}
                </div>
              )}

              {combatResult.mechanicsTriggered.length > 0 && (
                <div style={{ fontSize: 11, color: '#fca5a5' }}>
                  <strong>발동된 보스 기믹:</strong> {combatResult.mechanicsTriggered.join(', ')}
                </div>
              )}

              {combatResult.won && combatResult.rewards && (
                <div style={{ fontSize: 12, color: '#fef08a', fontWeight: 'bold' }}>
                  획득 칭호: [{combatResult.rewards.title}] | 별빛 파편 +{combatResult.rewards.starlightShards} | 균열석 +{combatResult.rewards.crackStones}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
