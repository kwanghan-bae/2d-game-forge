/**
 * AscendantRushModal.tsx — C1073: Ascendant Boss Rush 5-Wave Trial Modal UI.
 *
 * Provides a high-stakes arena interface where players pit their full gear,
 * Zodiac, Alchemy, and Relic synergies against a continuous 5-wave boss gauntlet.
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
import { ElementalBadge } from './ElementalBadge';
import {
  BOSS_RUSH_WAVES,
  TOTAL_RUSH_WAVES,
  TOTAL_RUSH_REWARDS,
  runFullBossRush,
  type FullRushResult,
} from '../systems/ascendantBossRush';

interface Props {
  onClose: () => void;
}

export function AscendantRushModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  const [rushResult, setRushResult] = useState<FullRushResult | null>(null);

  // Compute player synergies from equipped items, Zodiac, Alchemy, Relics
  const eqInst = getEquippedInstances(meta.inventory, meta.equippedItemIds);
  const equippedWeapon = eqInst.find(i => i.baseId.startsWith('w-'));
  const playerElement = equippedWeapon ? getEffectiveElement(equippedWeapon) : 'neutral';

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

  const totalDR =
    reforgeBonus.armorDrBonus +
    (zodiacBonus.damageReduction ?? 0) +
    (elixirBonus.damageReduction ?? 0) +
    (relicBonus.damageReduction ?? 0);

  const totalElementalBonus =
    (zodiacBonus.elementalDmgPercent ?? 0) / 100 +
    (elixirBonus.elementalDmgPercent ?? 0) / 100 +
    ((relicBonus.elementalDmgPercent ?? 0) / 100);

  const handleStartRush = () => {
    if (!hero) return;

    const result = runFullBossRush(
      hero,
      playerElement,
      totalDR,
      totalElementalBonus,
      0.15,
    );
    setRushResult(result);

    if (result.totalRewards.shards > 0 || result.totalRewards.gold > 0) {
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + result.totalRewards.gold,
        },
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) + result.totalRewards.shards,
          crackStones: (s.meta.crackStones ?? 0) + result.totalRewards.crackStones,
        },
      }));
    }
  };

  return (
    <div
      data-testid="boss-rush-modal-backdrop"
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
        data-testid="boss-rush-modal"
        style={{
          width: 'min(640px, 96vw)',
          maxHeight: '90vh',
          background: '#0d111c',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
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
            background: '#131929',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚔️👑</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>승천 보스 연전 (Boss Rush)</strong>
              <span style={{ fontSize: 11, color: '#38bdf8', marginLeft: 8 }}>5대 군주 연속 도전</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {run.goldThisRun.toLocaleString()}G</span>
            <span style={{ color: '#38bdf8' }}>✨ {(meta.starlightShards ?? 0).toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 {(meta.crackStones ?? 0).toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-rush-btn"
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
          {/* Synergy Status Bar */}
          <div
            style={{
              background: '#131929',
              borderRadius: 8,
              padding: 10,
              marginBottom: 14,
              border: '1px solid #1e293b',
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>공격 속성:</span>
              <ElementalBadge element={playerElement} size="sm" />
            </div>
            <div style={{ color: '#38bdf8' }}>
              🛡️ 총 피해 감소: {(totalDR * 100).toFixed(1)}%
            </div>
            <div style={{ color: '#fbbf24' }}>
              🌀 속성 공명: +{(totalElementalBonus * 100).toFixed(0)}%
            </div>
          </div>

          {/* Wave Overview List */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            5대 승천 군주 라인업 (전체 클리어 시: ✨ 240개 + 🔮 33개 + 💰 330,000G):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {BOSS_RUSH_WAVES.map((w, idx) => {
              const waveRes = rushResult?.waveResults[idx];
              const isCleared = waveRes?.cleared;
              const isFailed = waveRes && !waveRes.cleared;

              return (
                <div
                  key={w.id}
                  data-testid={`rush-wave-card-${w.wave}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isCleared ? '#064e3b' : isFailed ? '#450a0a' : '#131929',
                    border: isCleared
                      ? '1px solid #059669'
                      : isFailed
                      ? '1px solid #dc2626'
                      : '1px solid #1e293b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{w.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 13, color: '#f8fafc' }}>
                        W{w.wave}. {w.nameKR} ({w.hanja})
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        HP: {w.maxHp.toLocaleString()} · ATK: {w.atk.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ElementalBadge element={w.element} size="sm" />
                    <div style={{ fontSize: 11, color: '#fbbf24', textAlign: 'right' }}>
                      ✨ {w.rewards.shards} / 🔮 {w.rewards.crackStones}
                    </div>
                    {waveRes && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: isCleared ? '#34d399' : '#f87171',
                        }}
                      >
                        {isCleared ? `✓ ${waveRes.turns}턴` : '💀 패배'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Summary Banner */}
          {rushResult && (
            <div
              data-testid="rush-summary-banner"
              style={{
                background: rushResult.allCleared ? '#042f2e' : '#271010',
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
                border: rushResult.allCleared ? '1px solid #0f766e' : '1px solid #7f1d1d',
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: 14,
                  color: rushResult.allCleared ? '#2dd4bf' : '#f87171',
                  marginBottom: 6,
                }}
              >
                {rushResult.allCleared
                  ? '👑 전설 달성! 모든 승천 보스를 완벽히 격파했습니다!'
                  : `⚔️ ${rushResult.wavesCleared}웨이브 격파 완료 후 전사했습니다.`}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', gap: 14 }}>
                <span>총 소요 턴: {rushResult.totalTurns}턴</span>
                <span>총 피해량: {rushResult.totalDamageTaken.toLocaleString()}</span>
                <span>
                  획득 보상: ✨ {rushResult.totalRewards.shards}개 · 🔮{' '}
                  {rushResult.totalRewards.crackStones}개 · 💰{' '}
                  {rushResult.totalRewards.gold.toLocaleString()}G
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            data-testid="start-rush-btn"
            disabled={!hero}
            onClick={handleStartRush}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 8,
              border: 'none',
              background: '#b91c1c',
              color: '#fff',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: hero ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 14px rgba(185, 28, 28, 0.4)',
            }}
          >
            {rushResult ? '⚔️ 보스 연전 재도전' : '⚔️ 5연속 승천 보스 연전 개시'}
          </button>
        </div>
      </div>
    </div>
  );
}
