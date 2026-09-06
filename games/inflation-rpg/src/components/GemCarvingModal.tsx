/**
 * GemCarvingModal.tsx — C1088: Four-Elemental Celestial Gem Carving Workshop Modal UI.
 *
 * Enables players to:
 * - Inspect, carve, and upgrade 4 Elemental Celestial Gems across 4 tiers.
 * - View real-time trigger mechanics and effect potency.
 * - Socket / carve gems onto equipped weapons and armors.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  GEM_DEFINITIONS,
  GEM_TIER_DEFINITIONS,
  NEXT_GEM_TIER,
  getEffectiveGemEffect,
  canCarveGem,
  canUpgradeGem,
  upgradeCarvedGem,
  type GemType,
  type GemTier,
  type CarvedGem,
} from '../systems/celestialGemCarving';
import { ElementalBadge } from './ElementalBadge';
import type { EquipmentInstance } from '../types';

interface Props {
  onClose: () => void;
}

export function GemCarvingModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const shards = meta.starlightShards ?? 0;
  const crackStones = meta.crackStones ?? 0;
  const gold = run.goldThisRun;

  const [selectedGemType, setSelectedGemType] = useState<GemType>('fire_ruby');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Flatten weapons & armors
  const equipmentList: EquipmentInstance[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
  ].filter(it => meta.equippedItemIds.includes(it.instanceId));

  const [selectedEquipId, setSelectedEquipId] = useState<string>(
    equipmentList[0]?.instanceId ?? '',
  );

  const ownedGems: CarvedGem[] = meta.carvedGems ?? [];
  const currentGem = ownedGems.find(g => g.type === selectedGemType);
  const gemDef = GEM_DEFINITIONS[selectedGemType];

  // Helper to update store inventory & gems
  const updateStoreResources = (sCost: number, cCost: number, gCost: number) => {
    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - gCost,
      },
      meta: {
        ...s.meta,
        starlightShards: (s.meta.starlightShards ?? 0) - sCost,
        crackStones: (s.meta.crackStones ?? 0) - cCost,
      },
    }));
  };

  // Carve new gem
  const handleCarveInitial = () => {
    if (!canCarveGem(shards, crackStones, gold, 'normal')) {
      setFeedback({ type: 'error', message: '제련에 필요한 재화가 부족합니다.' });
      return;
    }

    const tierDef = GEM_TIER_DEFINITIONS.normal;
    updateStoreResources(tierDef.costShards, tierDef.costCrackStones, tierDef.costGold);

    const newGem: CarvedGem = { type: selectedGemType, tier: 'normal' };
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        carvedGems: [...(s.meta.carvedGems ?? []).filter(g => g.type !== selectedGemType), newGem],
      },
    }));

    setFeedback({
      type: 'success',
      message: `[${gemDef.nameKR}] 하급 제련에 성공하였습니다!`,
    });
  };

  // Upgrade existing gem
  const handleUpgrade = () => {
    if (!currentGem) return;
    const res = upgradeCarvedGem(currentGem, shards, crackStones, gold);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    updateStoreResources(res.shardsSpent, res.crackStonesSpent, res.goldSpent);

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        carvedGems: (s.meta.carvedGems ?? []).map(g =>
          g.type === currentGem.type ? res.upgradedGem : g,
        ),
      },
    }));

    setFeedback({ type: 'success', message: res.message });
  };

  // Socket gem onto selected equipment
  const handleSocketGem = () => {
    if (!currentGem || !selectedEquipId) return;

    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedEquipId ? { ...it, carvedGem: currentGem } : it));

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: s.meta.inventory.accessories,
        },
      },
    }));

    setFeedback({
      type: 'success',
      message: `선택한 장비에 [${gemDef.nameKR}] 각인이 완료되었습니다!`,
    });
  };

  // Unsocket gem from equipment
  const handleUnsocketGem = () => {
    if (!selectedEquipId) return;

    const updateList = (list: EquipmentInstance[]) =>
      list.map(it => (it.instanceId === selectedEquipId ? { ...it, carvedGem: undefined } : it));

    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: s.meta.inventory.accessories,
        },
      },
    }));

    setFeedback({
      type: 'success',
      message: '장비에서 보옥을 안전하게 회수하였습니다.',
    });
  };

  const selectedEquip = equipmentList.find(it => it.instanceId === selectedEquipId);

  return (
    <div
      data-testid="gem-carving-modal-backdrop"
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
        data-testid="gem-carving-modal"
        style={{
          width: 'min(660px, 96vw)',
          maxHeight: '92vh',
          background: '#0d111c',
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
            background: '#131929',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>💎⚒️</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>천상 보옥 제련소</strong>
              <span style={{ fontSize: 11, color: '#38bdf8', marginLeft: 8 }}>
                4대 원소 격발 초월
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24' }}>💰 {gold.toLocaleString()}G</span>
            <span style={{ color: '#38bdf8' }}>✨ {shards.toLocaleString()}개</span>
            <span style={{ color: '#c084fc' }}>🔮 {crackStones.toLocaleString()}개</span>
          </div>
          <button
            data-testid="close-gem-modal-btn"
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
          {/* Gem Selector Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            {(Object.keys(GEM_DEFINITIONS) as GemType[]).map(type => {
              const def = GEM_DEFINITIONS[type];
              const owned = ownedGems.find(g => g.type === type);
              const isSelected = selectedGemType === type;

              return (
                <button
                  key={type}
                  data-testid={`gem-tab-${type}`}
                  onClick={() => { setSelectedGemType(type); setFeedback(null); }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? def.color : '#1e293b'}`,
                    background: isSelected ? '#1e293b' : '#131929',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{def.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 'bold' }}>{def.nameKR}</span>
                  <span style={{ fontSize: 10, color: owned ? '#34d399' : '#64748b' }}>
                    {owned ? `[${GEM_TIER_DEFINITIONS[owned.tier].tierNameKR}]` : '미제련'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Gem Details Card */}
          <div
            data-testid="gem-details-card"
            style={{
              background: '#131929',
              borderRadius: 8,
              padding: 14,
              marginBottom: 14,
              border: `1px solid ${gemDef.color}55`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{gemDef.emoji}</span>
                <div>
                  <strong style={{ fontSize: 15, color: gemDef.color }}>
                    {gemDef.nameKR} ({gemDef.hanja})
                  </strong>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{gemDef.description}</div>
                </div>
              </div>
              <ElementalBadge element={gemDef.element} size="md" />
            </div>

            <div
              style={{
                background: '#090d16',
                padding: 10,
                borderRadius: 6,
                fontSize: 12,
                color: '#cbd5e1',
                marginBottom: 12,
                border: '1px solid #1e293b',
              }}
            >
              <div><strong>격발 유형:</strong> {gemDef.triggerType === 'on_hit' ? '타격 시 (On-Hit)' : '피격 시 (On-Damaged)'}</div>
              <div style={{ color: '#38bdf8', marginTop: 4 }}>
                <strong>효과:</strong> {currentGem ? getEffectiveGemEffect(currentGem).displayName + ' — ' : ''}{gemDef.effectDescription}
              </div>
            </div>

            {/* Craft or Upgrade Button */}
            {!currentGem ? (
              <button
                data-testid="carve-gem-btn"
                disabled={!canCarveGem(shards, crackStones, gold, 'normal')}
                onClick={handleCarveInitial}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: canCarveGem(shards, crackStones, gold, 'normal') ? 'pointer' : 'not-allowed',
                }}
              >
                💎 하급 제련 개시 (✨ 30 / 🔮 3 / 💰 50,000G)
              </button>
            ) : NEXT_GEM_TIER[currentGem.tier] ? (
              <button
                data-testid="upgrade-gem-btn"
                disabled={!canUpgradeGem(currentGem, shards, crackStones, gold)}
                onClick={handleUpgrade}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: '#7c3aed',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: canUpgradeGem(currentGem, shards, crackStones, gold) ? 'pointer' : 'not-allowed',
                }}
              >
                ⚡ [{GEM_TIER_DEFINITIONS[NEXT_GEM_TIER[currentGem.tier]!].tierNameKR}] 승급 제련 (✨{' '}
                {GEM_TIER_DEFINITIONS[NEXT_GEM_TIER[currentGem.tier]!].costShards} / 🔮{' '}
                {GEM_TIER_DEFINITIONS[NEXT_GEM_TIER[currentGem.tier]!].costCrackStones} / 💰{' '}
                {GEM_TIER_DEFINITIONS[NEXT_GEM_TIER[currentGem.tier]!].costGold.toLocaleString()}G)
              </button>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: 10,
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  fontSize: 13,
                  background: '#451a03',
                  borderRadius: 6,
                }}
              >
                👑 최고 등급(신화)에 도달한 완전무결한 보옥입니다!
              </div>
            )}
          </div>

          {/* Socketing onto Equipment Section */}
          <div
            style={{
              background: '#131929',
              borderRadius: 8,
              padding: 14,
              border: '1px solid #1e293b',
              marginBottom: 14,
            }}
          >
            <strong style={{ fontSize: 14, color: '#f8fafc', display: 'block', marginBottom: 8 }}>
              💠 장착 장비 보옥 각인
            </strong>

            {equipmentList.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>장착 중인 무기 또는 방어구가 없습니다.</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
                  {equipmentList.map(eq => {
                    const isSelected = eq.instanceId === selectedEquipId;
                    const carved = eq.carvedGem;

                    return (
                      <button
                        key={eq.instanceId}
                        data-testid={`equip-select-${eq.instanceId}`}
                        onClick={() => setSelectedEquipId(eq.instanceId)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? '#38bdf8' : '#334155'}`,
                          background: isSelected ? '#1e293b' : '#0d111c',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{eq.baseId} (+{eq.enhanceLv})</div>
                        <div style={{ fontSize: 10, color: carved ? '#fbbf24' : '#64748b' }}>
                          {carved ? `💎 ${GEM_DEFINITIONS[carved.type].nameKR}` : '보옥 미각인'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    data-testid="socket-gem-btn"
                    disabled={!currentGem || !selectedEquipId}
                    onClick={handleSocketGem}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 6,
                      border: 'none',
                      background: currentGem ? '#059669' : '#334155',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: 13,
                      cursor: currentGem ? 'pointer' : 'not-allowed',
                    }}
                  >
                    💠 현재 보옥 각인
                  </button>

                  {selectedEquip?.carvedGem && (
                    <button
                      data-testid="unsocket-gem-btn"
                      onClick={handleUnsocketGem}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid #dc2626',
                        background: '#450a0a',
                        color: '#fca5a5',
                        fontWeight: 'bold',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      🔓 회수
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              data-testid="gem-feedback-banner"
              style={{
                padding: 10,
                borderRadius: 6,
                background: feedback.type === 'success' ? '#064e3b' : '#450a0a',
                border: feedback.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
                color: '#fff',
                fontSize: 12,
              }}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
