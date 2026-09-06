/**
 * ChaosRiftModal.tsx — C1081: Endless Chaos Rift Expedition Modal UI.
 *
 * Provides an infinite procedural dungeon exploration interface:
 * - Real-time procedural guardian inspection (name, element, stats, drops).
 * - Full synergy aggregation (Reforge, Zodiac, Alchemy, Relics, 9-Star Celestial Awakening).
 * - Single-depth challenge and 10-depth continuous expedition mechanics.
 * - Live rewards payout (Shards, Crack Stones, Gold) and highest depth persistence.
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
import {
  generateRiftGuardian,
  resolveRiftCombat,
  exploreChaosRift,
  type RiftCombatResult,
  type RiftExpeditionResult,
} from '../systems/endlessChaosRift';
import { ElementalBadge } from './ElementalBadge';

interface Props {
  onClose: () => void;
}

export function ChaosRiftModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  const highestDepth = meta.highestRiftDepth ?? 0;
  const maxSelectableDepth = highestDepth + 1;

  const [selectedDepth, setSelectedDepth] = useState<number>(maxSelectableDepth);
  const [singleResult, setSingleResult] = useState<RiftCombatResult | null>(null);
  const [expeditionResult, setExpeditionResult] = useState<RiftExpeditionResult | null>(null);

  // Compute player synergies from equipped items, Zodiac, Alchemy, Relics, & Awakening
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

  const guardian = generateRiftGuardian(selectedDepth);

  // Single depth challenge
  const handleSingleChallenge = () => {
    if (!hero) return;
    setExpeditionResult(null);

    const result = resolveRiftCombat(
      hero,
      hero.hpMax,
      selectedDepth,
      playerElement,
      totalDR,
      totalElementalBonus,
      finalDmgMultiplier,
    );
    setSingleResult(result);

    if (result.cleared && result.rewards) {
      const newHighest = Math.max(highestDepth, selectedDepth);
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + result.rewards!.gold,
        },
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) + result.rewards!.shards,
          crackStones: (s.meta.crackStones ?? 0) + result.rewards!.crackStones,
          highestRiftDepth: newHighest,
        },
      }));
      setSelectedDepth(newHighest + 1);
    }
  };

  // 10-depth continuous expedition
  const handleExpedition = () => {
    if (!hero) return;
    setSingleResult(null);

    const result = exploreChaosRift(
      hero,
      selectedDepth,
      10,
      playerElement,
      totalDR,
      totalElementalBonus,
      finalDmgMultiplier,
      0.15,
    );
    setExpeditionResult(result);

    if (result.totalRewards.shards > 0 || result.totalRewards.gold > 0) {
      const newHighest = Math.max(highestDepth, result.highestDepthCleared);
      useGameStore.setState(s => ({
        run: {
          ...s.run,
          goldThisRun: s.run.goldThisRun + result.totalRewards.gold,
        },
        meta: {
          ...s.meta,
          starlightShards: (s.meta.starlightShards ?? 0) + result.totalRewards.shards,
          crackStones: (s.meta.crackStones ?? 0) + result.totalRewards.crackStones,
          highestRiftDepth: newHighest,
        },
      }));
      if (result.highestDepthCleared >= selectedDepth) {
        setSelectedDepth(result.highestDepthCleared + 1);
      }
    }
  };

  return (
    <div
      data-testid="chaos-rift-modal-backdrop"
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
        data-testid="chaos-rift-modal"
        style={{
          width: 'min(660px, 96vw)',
          maxHeight: '92vh',
          background: '#090d16',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
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
            background: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌀⚡</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>무한 혼돈의 균열 (Chaos Rift)</strong>
              <span style={{ fontSize: 11, color: '#a855f7', marginLeft: 8 }}>
                최고 도달: {highestDepth}층
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {run.goldThisRun.toLocaleString()}G</span>
            <span style={{ color: '#38bdf8' }}>✨ {(meta.starlightShards ?? 0).toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 {(meta.crackStones ?? 0).toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-rift-btn"
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
          {/* Synergy Overview Bar */}
          <div
            style={{
              background: '#0f172a',
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
              <span>속성:</span>
              <ElementalBadge element={playerElement} size="sm" />
            </div>
            <div style={{ color: '#38bdf8' }}>
              🛡️ 피해감소: {(totalDR * 100).toFixed(1)}%
            </div>
            <div style={{ color: '#fbbf24' }}>
              🌀 원소공명: +{(totalElementalBonus * 100).toFixed(0)}%
            </div>
            <div style={{ color: '#f43f5e', fontWeight: 'bold' }}>
              ⚡ 최종증폭: {finalDmgMultiplier.toFixed(1)}x
            </div>
          </div>

          {/* Depth Selector Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#13192b',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 14,
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                data-testid="depth-prev-btn"
                disabled={selectedDepth <= 1}
                onClick={() => { setSelectedDepth(d => Math.max(1, d - 1)); setSingleResult(null); setExpeditionResult(null); }}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 8px',
                  color: '#eee',
                  cursor: selectedDepth > 1 ? 'pointer' : 'not-allowed',
                }}
              >
                ◀ -1층
              </button>
              <button
                data-testid="depth-next-btn"
                disabled={selectedDepth >= maxSelectableDepth}
                onClick={() => { setSelectedDepth(d => Math.min(maxSelectableDepth, d + 1)); setSingleResult(null); setExpeditionResult(null); }}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 8px',
                  color: '#eee',
                  cursor: selectedDepth < maxSelectableDepth ? 'pointer' : 'not-allowed',
                }}
              >
                +1층 ▶
              </button>
            </div>

            <div data-testid="depth-indicator" style={{ fontWeight: 'bold', fontSize: 16, color: '#38bdf8' }}>
              심도 {selectedDepth}층 {selectedDepth <= highestDepth ? '✅ 돌파완료' : '⚔️ 미개척'}
            </div>

            <button
              data-testid="depth-max-btn"
              onClick={() => { setSelectedDepth(maxSelectableDepth); setSingleResult(null); setExpeditionResult(null); }}
              style={{
                background: '#4338ca',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              최고 심도 ({maxSelectableDepth}층)
            </button>
          </div>

          {/* Procedural Guardian Preview Card */}
          <div
            data-testid="guardian-card"
            style={{
              background: '#0d1322',
              borderRadius: 8,
              padding: 14,
              marginBottom: 14,
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 'bold', fontSize: 15, color: '#f1f5f9' }}>
                {guardian.name}
              </div>
              <ElementalBadge element={guardian.element} size="md" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, marginBottom: 12 }}>
              <div style={{ background: '#131929', padding: 8, borderRadius: 6 }}>
                <span style={{ color: '#94a3b8' }}>HP: </span>
                <strong style={{ color: '#f87171' }}>{guardian.maxHp.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#131929', padding: 8, borderRadius: 6 }}>
                <span style={{ color: '#94a3b8' }}>ATK: </span>
                <strong style={{ color: '#fbbf24' }}>{guardian.atk.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#131929', padding: 8, borderRadius: 6 }}>
                <span style={{ color: '#94a3b8' }}>DEF: </span>
                <strong style={{ color: '#60a5fa' }}>{guardian.def.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              토벌 예상 보상: ✨ {guardian.rewards.shards}개 · 🔮 {guardian.rewards.crackStones}개 · 💰 {guardian.rewards.gold.toLocaleString()}G
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <button
              data-testid="challenge-single-btn"
              disabled={!hero}
              onClick={handleSingleChallenge}
              style={{
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: hero ? 'pointer' : 'not-allowed',
              }}
            >
              ⚔️ {selectedDepth}층 단발 도전
            </button>

            <button
              data-testid="start-expedition-btn"
              disabled={!hero}
              onClick={handleExpedition}
              style={{
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: hero ? 'pointer' : 'not-allowed',
              }}
            >
              🚀 10층 연속 원정 개시
            </button>
          </div>

          {/* Single Combat Outcome */}
          {singleResult && (
            <div
              data-testid="single-result-box"
              style={{
                background: singleResult.cleared ? '#064e3b' : '#450a0a',
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
                border: singleResult.cleared ? '1px solid #059669' : '1px solid #dc2626',
                color: '#fff',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
                {singleResult.cleared
                  ? `🎉 심도 ${singleResult.depth}층 돌파 성공! (${singleResult.turns}턴)`
                  : `💀 심도 ${singleResult.depth}층에서 패배...`}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                가한 피해: {singleResult.damageDealt.toLocaleString()} | 입은 피해: {singleResult.damageTaken.toLocaleString()}
                {singleResult.rewards && (
                  <span style={{ marginLeft: 8, color: '#fbbf24' }}>
                    보상: ✨ +{singleResult.rewards.shards} · 🔮 +{singleResult.rewards.crackStones} · 💰 +{singleResult.rewards.gold.toLocaleString()}G
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expedition Summary Banner */}
          {expeditionResult && (
            <div
              data-testid="expedition-summary-banner"
              style={{
                background: '#131929',
                borderRadius: 8,
                padding: 12,
                border: '1px solid #3b82f6',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#60a5fa', marginBottom: 6 }}>
                🚀 10층 연속 원정 결과 ({expeditionResult.totalDepthsCleared}/10개 층 돌파)
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8, display: 'flex', gap: 12 }}>
                <span>최고 돌파: {expeditionResult.highestDepthCleared}층</span>
                <span>총 턴수: {expeditionResult.totalTurns}턴</span>
                <span>
                  획득 전리품: ✨ {expeditionResult.totalRewards.shards} · 🔮 {expeditionResult.totalRewards.crackStones} · 💰 {expeditionResult.totalRewards.gold.toLocaleString()}G
                </span>
              </div>

              {/* Expedition Log List */}
              <div data-testid="expedition-log" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                {expeditionResult.battleLog.map(entry => (
                  <div
                    key={entry.depth}
                    data-testid={`log-entry-${entry.depth}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      padding: '4px 8px',
                      background: entry.cleared ? '#062d22' : '#2d0606',
                      borderRadius: 4,
                      border: entry.cleared ? '1px solid #065f46' : '1px solid #991b1b',
                    }}
                  >
                    <span>
                      {entry.cleared ? '✅' : '💀'} {entry.monsterName}
                    </span>
                    <span style={{ color: entry.cleared ? '#34d399' : '#f87171' }}>
                      {entry.cleared ? `${entry.turns}턴 격파` : '패배'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
