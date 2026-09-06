/**
 * CelestialInfusionModal.tsx — C1117: Celestial Infusion Modal UI.
 *
 * Provides the interactive UI for infusing equipment with 4 Cosmic Affixes
 * using Dimensional Essences harvested from spacetime anomalies:
 * - celestial_sharpness: +15% Crit DMG, +5% DEF Pierce
 * - astral_fortitude: +10% HP, +5% Damage Reduction
 * - singularity_might: +12% ATK, +5% Final Damage Multiplier
 * - cosmic_celerity: +15% SPD, +5% Dodge Rate
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getEquipmentBase } from '../data/equipment';
import {
  COSMIC_AFFIXES,
  INFUSION_COST,
  canInfuseEquipment,
  infuseEquipment,
  type CosmicAffixType,
} from '../systems/cosmicInfusion';
import type { EquipmentInstance } from '../types';
import { AstralResonanceBanner } from './AstralResonanceBanner';

interface Props {
  onClose: () => void;
}

const ALL_AFFIX_TYPES: CosmicAffixType[] = [
  'celestial_sharpness',
  'astral_fortitude',
  'singularity_might',
  'cosmic_celerity',
];

export function CelestialInfusionModal({ onClose }: Props) {
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);

  const essence = meta.dimensionalEssence ?? 0;
  const shards = meta.starlightShards ?? 0;
  const gold = run.goldThisRun;

  const allItems: EquipmentInstance[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];

  const [selectedItemId, setSelectedItemId] = useState<string>(
    allItems[0]?.instanceId ?? ''
  );
  const [selectedAffix, setSelectedAffix] = useState<CosmicAffixType>('celestial_sharpness');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedItem = allItems.find(i => i.instanceId === selectedItemId);
  const itemBase = selectedItem ? getEquipmentBase(selectedItem.baseId) : null;
  const canInfuse = canInfuseEquipment(essence, shards, gold);

  const handleInfuse = () => {
    if (!selectedItem) return;
    const res = infuseEquipment(selectedItem, selectedAffix, essence, shards, gold);

    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
      return;
    }

    // Update item in inventory
    const updated = res.updatedInstance!;
    const updateList = (list: EquipmentInstance[]) =>
      list.map(i => (i.instanceId === updated.instanceId ? updated : i));

    useGameStore.setState(s => ({
      run: {
        ...s.run,
        goldThisRun: s.run.goldThisRun - res.costSpent.gold,
      },
      meta: {
        ...s.meta,
        dimensionalEssence: (s.meta.dimensionalEssence ?? 0) - res.costSpent.essence,
        starlightShards: (s.meta.starlightShards ?? 0) - res.costSpent.shards,
        inventory: {
          weapons: updateList(s.meta.inventory.weapons),
          armors: updateList(s.meta.inventory.armors),
          accessories: updateList(s.meta.inventory.accessories),
        },
      },
    }));

    setFeedback({ type: 'success', message: res.message });
  };

  return (
    <div
      data-testid="celestial-infusion-modal-backdrop"
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
        data-testid="celestial-infusion-modal"
        style={{
          width: 'min(640px, 96vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #090c17 0%, #15102a 100%)',
          color: '#eee',
          borderRadius: 12,
          border: '1px solid #6366f1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(99, 102, 241, 0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e1b4b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1b4b 0%, #311042 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <strong style={{ fontSize: 16, color: '#f8fafc' }}>
                차원 정수 천상 주입 (Celestial Infusion)
              </strong>
              <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 2 }}>
                차원 정수: {essence}개 | 별빛 파편: {shards}개 | 골드: {gold.toLocaleString()}G
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Item Selection Strip */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e293b', background: '#080b14' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            주입할 장비 선택:
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {allItems.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>인벤토리에 장비가 없습니다.</div>
            ) : (
              allItems.map(item => {
                const base = getEquipmentBase(item.baseId);
                const isSelected = item.instanceId === selectedItemId;
                return (
                  <button
                    key={item.instanceId}
                    data-testid={`item-slot-${item.instanceId}`}
                    onClick={() => {
                      setSelectedItemId(item.instanceId);
                      setFeedback(null);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: isSelected ? '2px solid #818cf8' : '1px solid #1e293b',
                      background: isSelected ? '#1e1b4b' : '#0f172a',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{base?.name ?? item.baseId}</span>
                    {item.cosmicAffix && <span style={{ marginLeft: 4 }}>✨</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedItem && (
            <div style={{ padding: '10px 14px', background: '#090d19', borderRadius: 8, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#f8fafc' }}>
                선택된 장비: {itemBase?.name ?? selectedItem.baseId} (+{selectedItem.enhanceLv})
              </div>
              <div style={{ fontSize: 12, color: selectedItem.cosmicAffix ? '#6ee7b7' : '#94a3b8', marginTop: 4 }}>
                현재 주입된 우주적 접사: {selectedItem.cosmicAffix ? COSMIC_AFFIXES[selectedItem.cosmicAffix].nameKR : '없음'}
              </div>
            </div>
          )}

          {/* Astral Resonance Status */}
          <AstralResonanceBanner equippedInstances={allItems} />

          {/* Affix Selection Cards */}
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#cbd5e1' }}>
            부여할 우주적 접사 선택:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {ALL_AFFIX_TYPES.map(type => {
              const def = COSMIC_AFFIXES[type];
              const isSelected = type === selectedAffix;
              return (
                <button
                  key={type}
                  data-testid={`affix-btn-${type}`}
                  onClick={() => {
                    setSelectedAffix(type);
                    setFeedback(null);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #818cf8' : '1px solid #1e293b',
                    background: isSelected ? '#1e1b4b' : '#0f172a',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{def.emoji}</span>
                    <span>{def.nameKR}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>({def.hanja})</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 2 }}>
                    {def.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cost Indicator */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: '#090d16',
              border: '1px solid #1e293b',
              fontSize: 12,
              color: '#fbbf24',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>소모 비용:</span>
            <span>🌌 차원 정수 {INFUSION_COST.essence}개</span>
            <span>✨ 별빛 파편 {INFUSION_COST.shards}개</span>
            <span>🪙 {INFUSION_COST.gold.toLocaleString()}G</span>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              data-testid="infusion-feedback"
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: feedback.type === 'success' ? '#064e3b' : '#450a0a',
                border: feedback.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                color: '#fff',
                fontSize: 12,
              }}
            >
              {feedback.message}
            </div>
          )}

          {/* Infuse Action Button */}
          <button
            data-testid="execute-infuse-btn"
            disabled={!canInfuse || !selectedItem}
            onClick={handleInfuse}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: canInfuse && selectedItem
                ? 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)'
                : '#334155',
              color: '#fff',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: canInfuse && selectedItem ? 'pointer' : 'not-allowed',
            }}
          >
            ✨ [ {COSMIC_AFFIXES[selectedAffix].nameKR} ] 주입하기
          </button>
        </div>
      </div>
    </div>
  );
}
