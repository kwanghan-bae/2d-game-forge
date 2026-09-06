/**
 * AbyssalCorridorModal.tsx — C1124: Cosmic Abyssal Corridor Exploration Modal UI.
 *
 * Provides the interactive UI for the 5-Sector Cosmic Abyssal Corridor endgame raid:
 * - 5 Sectors: 성운의 잔해, 암흑 조각 지대, 양자 왜곡 구역, 중력 붕괴 중심부, 종언의 특이점 코어
 * - Real-time environmental hazard inspection, guardian stats, and rewards payout.
 * - Full integration with Astral Resonance, Transmuted Relics, and Mythic Awakening.
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
import { computeAstralResonance } from '../systems/astralResonanceMatrix';
import { ElementalBadge } from './ElementalBadge';
import {
  CORRIDOR_SECTORS,
  checkCorridorUnlock,
  resolveCorridorCombat,
  type CorridorSectorId,
  type CorridorCombatResult,
} from '../systems/abyssalCorridor';

interface Props {
  onClose: () => void;
}

const ALL_SECTORS: CorridorSectorId[] = [1, 2, 3, 4, 5];

export function AbyssalCorridorModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  const clearedApexTiers = meta.apexTrialsCleared ?? [];
  const clearedSectors = meta.corridorSectorsCleared ?? [];
  const transmutedRelics = meta.transmutedRelics ?? [];

  // Calculate equipped synergies
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
  const astralResonance = computeAstralResonance(eqInst);

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

  // Selected Sector
  const defaultSector: CorridorSectorId =
    (ALL_SECTORS.find(s => !clearedSectors.includes(s)) as CorridorSectorId) ?? 1;

  const [selectedSector, setSelectedSector] = useState<CorridorSectorId>(defaultSector);
  const [combatResult, setCombatResult] = useState<CorridorCombatResult | null>(null);

  const sectorDef = CORRIDOR_SECTORS[selectedSector];
  const unlockStatus = checkCorridorUnlock(selectedSector, clearedApexTiers, clearedSectors);
  const isSectorCleared = clearedSectors.includes(selectedSector);

  const handleChallenge = () => {
    if (!hero || !unlockStatus.unlocked) return;

    const result = resolveCorridorCombat(hero, selectedSector, {
      weaponElement: playerElement,
      playerDR: totalDR,
      playerElementalBonus: totalElementalBonus,
      finalDmgMultiplier,
      defPierce: 0.15,
      transmutedRelics,
      mythicStarsTotal,
      astralResonance,
    });

    setCombatResult(result);

    if (result.won && result.rewards) {
      const nextCleared = clearedSectors.includes(selectedSector)
        ? clearedSectors
        : [...clearedSectors, selectedSector];

      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + result.rewards!.gold,
        },
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) + result.rewards!.starlightShards,
          crackStones: (s.meta.crackStones ?? 0) + result.rewards!.crackStones,
          dimensionalEssence: (s.meta.dimensionalEssence ?? 0) + result.rewards!.dimensionalEssence,
          corridorSectorsCleared: nextCleared,
        },
      }));
    }
  };

  return (
    <div
      data-testid="abyssal-corridor-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
      }}
      onClick={onClose}
    >
      <div
        data-testid="abyssal-corridor-modal"
        style={{
          width: 'min(680px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #05070e 0%, #0d1222 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #6366f1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
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
            background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🪐</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                우주적 심연 회랑 (Cosmic Abyssal Corridor)
              </strong>
              <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 2 }}>
                돌파 현황: {clearedSectors.length}/5 섹터 | 차원 정수: {meta.dimensionalEssence ?? 0}개
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

        {/* 5 Sector Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 6,
            padding: '10px 14px',
            background: '#070a14',
            borderBottom: '1px solid #1e293b',
          }}
        >
          {ALL_SECTORS.map(s => {
            const status = checkCorridorUnlock(s, clearedApexTiers, clearedSectors);
            const isSelected = s === selectedSector;
            const isCleared = clearedSectors.includes(s);

            return (
              <button
                key={s}
                data-testid={`sector-btn-${s}`}
                onClick={() => {
                  setSelectedSector(s);
                  setCombatResult(null);
                }}
                style={{
                  padding: '8px 4px',
                  borderRadius: 6,
                  border: isSelected ? '2px solid #818cf8' : '1px solid #1e293b',
                  background: isSelected ? '#1e1b4b' : '#0f172a',
                  color: status.unlocked ? '#f8fafc' : '#64748b',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  opacity: status.unlocked ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{s}섹터</span>
                <span style={{ fontSize: 10, color: isCleared ? '#34d399' : status.unlocked ? '#93c5fd' : '#f87171' }}>
                  {isCleared ? '👑 정복' : status.unlocked ? '진입' : '🔒'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Guardian Inspection Card */}
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
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {sectorDef.sector}섹터: {sectorDef.nameKR} ({sectorDef.hanja})
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span data-testid="guardian-name">{sectorDef.title}</span>
                  <ElementalBadge element={sectorDef.element} />
                </div>
              </div>
              {isSectorCleared && (
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
                  👑 CLEAR
                </span>
              )}
            </div>

            {/* Guardian Stats */}
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
                <div style={{ fontWeight: 'bold', color: '#f43f5e' }}>{sectorDef.maxHp.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>ATK (공격력)</div>
                <div style={{ fontWeight: 'bold', color: '#fb923c' }}>{sectorDef.atk.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8' }}>DEF (방어력)</div>
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>{sectorDef.def.toLocaleString()}</div>
              </div>
            </div>

            {/* Hazard */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#cbd5e1', background: '#3b0764', padding: '8px 12px', borderRadius: 6, border: '1px solid #6b21a8' }}>
              <strong style={{ color: '#f0abfc' }}>⚠️ 환경 위험 요소:</strong> {sectorDef.environmentalHazard}
            </div>

            {/* Rewards */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>🎁 섹터 보상:</span>
              <span>✨ 파편 +{sectorDef.rewards.starlightShards}</span>
              <span>💎 균열석 +{sectorDef.rewards.crackStones}</span>
              {sectorDef.rewards.dimensionalEssence > 0 && (
                <span>🌌 정수 +{sectorDef.rewards.dimensionalEssence}</span>
              )}
              <span>🪙 {sectorDef.rewards.gold.toLocaleString()}G</span>
              {sectorDef.rewards.title && <span>🏷️ [{sectorDef.rewards.title}]</span>}
            </div>
          </div>

          {/* Unlock notice */}
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
              🔒 <strong>섹터 진입 불가:</strong> {unlockStatus.requirementDescription}
            </div>
          )}

          {/* Action Button */}
          <button
            data-testid="challenge-corridor-btn"
            disabled={!unlockStatus.unlocked || !hero}
            onClick={handleChallenge}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: unlockStatus.unlocked
                ? 'linear-gradient(90deg, #4338ca 0%, #7c3aed 100%)'
                : '#334155',
              color: '#fff',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: unlockStatus.unlocked ? 'pointer' : 'not-allowed',
            }}
          >
            🪐 {sectorDef.title} 레이드 돌입
          </button>

          {/* Combat Result Card */}
          {combatResult && (
            <div
              data-testid="corridor-combat-result"
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
                  ? `🎉 ${combatResult.guardianName} 토벌 성공! (${combatResult.turns}턴)`
                  : `💀 ${combatResult.guardianName}에게 패배... (${combatResult.turns}턴)`}
              </div>

              <div>
                가한 피해: {combatResult.damageDealt.toLocaleString()} | 받은 피해: {combatResult.damageTaken.toLocaleString()}
              </div>

              {combatResult.hazardsTriggered.length > 0 && (
                <div style={{ fontSize: 11, color: '#fca5a5' }}>
                  <strong>환경 기믹 반응:</strong> {combatResult.hazardsTriggered.join(', ')}
                </div>
              )}

              {combatResult.relicsTriggered.length > 0 && (
                <div style={{ fontSize: 11, color: '#6ee7b7' }}>
                  <strong>성유물 반응:</strong> {combatResult.relicsTriggered.join(', ')}
                </div>
              )}

              {combatResult.won && combatResult.rewards && (
                <div style={{ fontSize: 12, color: '#fef08a', fontWeight: 'bold' }}>
                  보상 획득: 별빛 파편 +{combatResult.rewards.starlightShards} | 균열석 +{combatResult.rewards.crackStones}
                  {combatResult.rewards.dimensionalEssence > 0 && ` | 차원 정수 +${combatResult.rewards.dimensionalEssence}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
