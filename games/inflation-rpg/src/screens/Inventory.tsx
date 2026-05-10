import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { EquipmentInstance, EquipmentBase, EquipmentSlot, Modifier } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';
import { getCraftCost, getNextTier } from '../systems/crafting';
import { getEquipmentBase } from '../data/equipment';
import { enhanceCost, getInstanceStats } from '../systems/enhance';
import { getModifierMagnitude } from '../systems/modifiers';
import { CHARACTERS } from '../data/characters';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeInventoryGrid } from '@/components/ui/forge-inventory-grid';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { formatNumber } from '../lib/format';
import { RerollModal } from '../components/RerollModal';

function formatMagnitude(mod: Modifier, value: number): string {
  if (mod.effectType === 'dot') return `${Math.floor(value)}/sec`;
  if (mod.effectType === 'cc') return `${Math.floor(value)}ms`;
  if (mod.effectType === 'shield') return `${Math.floor(value)} shield`;
  return `+${(value * 100).toFixed(1)}%`;
}

const TABS: { slot: EquipmentSlot; label: string; emoji: string }[] = [
  { slot: 'weapon',    label: '무기',     emoji: '⚔️' },
  { slot: 'armor',     label: '방어구',   emoji: '🛡️' },
  { slot: 'accessory', label: '악세사리', emoji: '💍' },
];

export function Inventory() {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');
  const [mainTab, setMainTab] = useState<'inventory' | 'craft' | 'skills'>('inventory');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rerollFor, setRerollFor] = useState<{ inst: EquipmentInstance; slot: EquipmentSlot } | null>(null);
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const sellEquipment = useGameStore((s) => s.sellEquipment);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const craft = useGameStore((s) => s.craft);
  const enhanceItem = useGameStore((s) => s.enhanceItem);
  const run = useGameStore((s) => s.run);

  const allItems: EquipmentInstance[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];
  const equippedItems = meta.equippedItemIds
    .map((id) => allItems.find((e) => e.instanceId === id))
    .filter((e): e is EquipmentInstance => e !== undefined);

  const tabItems = activeSlot === 'weapon'
    ? meta.inventory.weapons
    : activeSlot === 'armor'
    ? meta.inventory.armors
    : meta.inventory.accessories;

  const isFull = meta.equippedItemIds.length >= meta.equipSlotCount;
  const backScreen = run.characterId ? 'town' : 'main-menu';

  const craftable = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const item of allItems) groups[item.baseId] = (groups[item.baseId] ?? 0) + 1;
    return Object.entries(groups)
      .filter(([, count]) => count >= 3)
      .map(([baseId, count]) => {
        const base = getEquipmentBase(baseId);
        return base ? { baseId, count, base } : null;
      })
      .filter((e): e is { baseId: string; count: number; base: EquipmentBase } => e !== null);
  }, [meta.inventory]);

  return (
    <ForgeScreen style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <ForgeButton variant="secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </ForgeButton>
        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>인벤토리</span>
        <span style={{ fontSize: 12, color: 'var(--forge-stat-luc)' }}>💰 {formatNumber(meta.gold)}</span>
      </div>

      {/* 메인 탭 토글 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <ForgeButton
          variant={mainTab === 'inventory' ? 'primary' : 'secondary'}
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => setMainTab('inventory')}
        >
          인벤토리
        </ForgeButton>
        <ForgeButton
          variant={mainTab === 'craft' ? 'primary' : 'secondary'}
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => setMainTab('craft')}
        >
          합성
        </ForgeButton>
        <ForgeButton
          variant={mainTab === 'skills' ? 'primary' : 'secondary'}
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => setMainTab('skills')}
        >
          스킬
        </ForgeButton>
      </div>

      {mainTab === 'inventory' && (
        <>
          {/* Equipped Slots */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginBottom: 6 }}>
              장착 슬롯 ({meta.equippedItemIds.length}/{meta.equipSlotCount})
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: 10 }).map((_, i) => {
                const item = equippedItems[i];
                const isOwned = i < meta.equipSlotCount;
                if (!isOwned) {
                  return (
                    <div key={i} style={{ width: 58, height: 58, background: '#111', border: '2px dashed #1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 18, opacity: 0.3 }}>🔒</span>
                    </div>
                  );
                }
                if (item) {
                  const itemBase = getEquipmentBase(item.baseId);
                  const displayName = itemBase
                    ? `${itemBase.name}${item.enhanceLv > 0 ? ` +${item.enhanceLv}` : ''}`
                    : '???';
                  return (
                    <div key={i} onClick={() => unequipItem(item.instanceId)} style={{ width: 58, height: 58, background: 'var(--forge-bg-card)', border: '2px solid var(--forge-accent)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', padding: 2 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--forge-accent)', textAlign: 'center', lineHeight: 1.2 }}>{displayName}</div>
                      <div style={{ fontSize: 9, color: 'var(--forge-text-muted)' }}>해제</div>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ width: 58, height: 58, background: 'var(--forge-bg-card)', border: '2px dashed #2a4060', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--forge-text-muted)' }}>비어있음</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {TABS.map((tab) => {
              const count = tab.slot === 'weapon' ? meta.inventory.weapons.length
                : tab.slot === 'armor' ? meta.inventory.armors.length
                : meta.inventory.accessories.length;
              return (
                <button
                  key={tab.slot}
                  onClick={() => setActiveSlot(tab.slot)}
                  style={{
                    flex: 1,
                    background: activeSlot === tab.slot ? 'var(--forge-accent-dim)' : 'var(--forge-bg-card)',
                    border: `1px solid ${activeSlot === tab.slot ? 'var(--forge-accent)' : 'var(--forge-border)'}`,
                    borderRadius: 6, padding: '6px 4px', fontSize: 11,
                    color: activeSlot === tab.slot ? 'var(--forge-accent)' : 'var(--forge-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.emoji} {tab.label} {count}/{SLOT_LIMITS[tab.slot]}
                </button>
              );
            })}
          </div>

          {/* Items */}
          <ForgeInventoryGrid
            className="forge-scroll-list"
            style={{ maxHeight: '45vh' }}
          >
            {tabItems.map((item) => {
              const isEquipped = meta.equippedItemIds.includes(item.instanceId);
              return (
                <EquipmentCard
                  key={item.instanceId}
                  inst={item}
                  isEquipped={isEquipped}
                  canEquip={!isFull && !isEquipped}
                  expanded={expandedId === item.instanceId}
                  onToggleExpand={() => setExpandedId((prev) => prev === item.instanceId ? null : item.instanceId)}
                  onEquip={() => equipItem(item.instanceId)}
                  onUnequip={() => unequipItem(item.instanceId)}
                  onSell={() => {
                    const base = getEquipmentBase(item.baseId);
                    sellEquipment(item.instanceId, base?.price ?? 0);
                  }}
                  onEnhance={() => enhanceItem(item.instanceId)}
                  onOpenReroll={() => setRerollFor({ inst: item, slot: activeSlot })}
                  dr={meta.dr}
                  enhanceStones={meta.enhanceStones}
                />
              );
            })}
            {tabItems.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--forge-text-muted)', padding: 24 }}>
                장비가 없습니다
              </div>
            )}
          </ForgeInventoryGrid>
        </>
      )}

      {mainTab === 'craft' && (
        <div className="forge-scroll-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {craftable.length === 0 && (
            <p style={{ padding: 16, color: 'var(--forge-text-muted)' }}>
              합성 가능한 아이템이 없다 (같은 장비 3개 이상 필요).
            </p>
          )}
          {craftable.map(({ baseId, count, base }) => {
            const nextTier = getNextTier(base.rarity);
            const cost = getCraftCost(base.rarity);
            const canAfford = meta.gold >= cost;
            const canCraft = nextTier !== null;
            return (
              <ForgePanel key={baseId} style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{base.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                    x{count}
                  </span>
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {base.rarity} → {nextTier ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--forge-accent)', marginTop: 2 }}>
                  비용: {cost.toLocaleString()}G {!canAfford && '(골드 부족)'}
                </div>
                {canCraft && canAfford ? (
                  <ForgeButton variant="primary" style={{ marginTop: 8 }} onClick={() => craft(baseId)}>
                    합성
                  </ForgeButton>
                ) : (
                  <ForgeButton variant="disabled" style={{ marginTop: 8 }} disabled>
                    {!canCraft ? '최상위 등급' : '골드 부족'}
                  </ForgeButton>
                )}
              </ForgePanel>
            );
          })}
        </div>
      )}

      {rerollFor && (
        <RerollModal
          instance={rerollFor.inst}
          slot={rerollFor.slot}
          onClose={() => setRerollFor(null)}
        />
      )}

      {mainTab === 'skills' && (() => {
        const char = CHARACTERS.find((c) => c.id === run.characterId);
        if (!char) {
          return (
            <p style={{ padding: 16, color: 'var(--forge-text-muted)' }}>
              캐릭터 정보를 찾을 수 없다.
            </p>
          );
        }
        return (
          <div className="forge-scroll-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <ForgePanel style={{ margin: '8px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginBottom: 4 }}>
                패시브
              </div>
              <div style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
                {char.passiveSkill.nameKR}
              </div>
              <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 4 }}>
                {char.passiveSkill.description}
              </div>
            </ForgePanel>
            {char.activeSkills.map((s) => (
              <ForgePanel key={s.id} style={{ margin: '8px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>
                    {s.vfxEmoji} {s.nameKR}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--forge-text-muted)' }}>
                    쿨다운 {s.cooldownSec}s
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 6 }}>
                  {s.description}
                </div>
              </ForgePanel>
            ))}
          </div>
        );
      })()}
    </ForgeScreen>
  );
}

function EquipmentCard({ inst, isEquipped, canEquip, expanded, onToggleExpand, onEquip, onUnequip, onSell, onEnhance, onOpenReroll, dr, enhanceStones }: {
  inst: EquipmentInstance;
  isEquipped: boolean;
  canEquip: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  onSell: () => void;
  onEnhance: () => void;
  onOpenReroll: () => void;
  dr: number;
  enhanceStones: number;
}) {
  const base = getEquipmentBase(inst.baseId);
  if (!base) return null;

  const rarityColor: Record<string, string> = {
    common: 'var(--forge-rarity-common)',
    uncommon: 'var(--forge-rarity-uncommon)',
    rare: 'var(--forge-rarity-rare)',
    epic: 'var(--forge-rarity-epic)',
    legendary: 'var(--forge-rarity-legendary)',
    mythic: 'var(--forge-rarity-mythic)',
  };

  const effectiveStats = getInstanceStats(inst);
  const statStr = Object.entries(effectiveStats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(effectiveStats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');
  const displayName = `${base.name}${inst.enhanceLv > 0 ? ` +${inst.enhanceLv}` : ''}`;

  const cost = enhanceCost(base.rarity, inst.enhanceLv);
  const canAfford = dr >= cost.dr && enhanceStones >= cost.stones;
  const nextStats = getInstanceStats({ ...inst, enhanceLv: inst.enhanceLv + 1 });
  const nextStatStr = Object.entries(nextStats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(nextStats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');

  return (
    <div style={{ background: 'var(--forge-bg-card)', border: `1px solid ${isEquipped ? 'var(--forge-accent)' : rarityColor[base.rarity]}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{displayName}</div>
      <div style={{ fontSize: 11, color: 'var(--forge-stat-atk)', marginBottom: 6 }}>{statStr}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {isEquipped ? (
          <button
            onClick={onUnequip}
            style={{ fontSize: 11, background: 'var(--forge-accent-dim)', border: '1px solid var(--forge-accent)', borderRadius: 4, padding: '2px 6px', color: 'var(--forge-accent)', cursor: 'pointer' }}
          >
            해제
          </button>
        ) : (
          <button
            onClick={onEquip}
            disabled={!canEquip}
            style={{ fontSize: 11, background: canEquip ? 'var(--forge-accent-dim)' : 'none', border: `1px solid ${canEquip ? 'var(--forge-accent)' : 'var(--forge-border)'}`, borderRadius: 4, padding: '2px 6px', color: canEquip ? 'var(--forge-accent)' : 'var(--forge-text-muted)', cursor: canEquip ? 'pointer' : 'default' }}
          >
            장착
          </button>
        )}
        <button
          onClick={onSell}
          style={{ fontSize: 11, background: 'none', border: '1px solid var(--forge-border)', borderRadius: 4, padding: '2px 8px', color: 'var(--forge-text-muted)', cursor: 'pointer' }}
        >
          매각 {base.price.toLocaleString()}G
        </button>
        <button
          onClick={onToggleExpand}
          data-testid={`enhance-toggle-${inst.instanceId}`}
          style={{ fontSize: 11, background: 'none', border: '1px solid var(--forge-border)', borderRadius: 4, padding: '2px 8px', color: 'var(--forge-text-muted)', cursor: 'pointer', marginLeft: 'auto' }}
        >
          {expanded ? '▴ 닫기' : '▾ 강화'}
        </button>
      </div>
      {expanded && (
        <div
          data-testid={`enhance-panel-${inst.instanceId}`}
          style={{ marginTop: 8, padding: 8, borderTop: '1px solid var(--forge-border)', fontSize: 12 }}
        >
          <div style={{ color: 'var(--forge-text-muted)', marginBottom: 4 }}>현재 lv {inst.enhanceLv} → {nextStatStr || '—'}</div>
          <div style={{ color: 'var(--forge-text-muted)', marginBottom: 6 }}>
            비용: 강화석 {cost.stones} / DR {cost.dr.toLocaleString()}
            {!canAfford && <span style={{ color: '#c44', marginLeft: 6 }}>(재료 부족)</span>}
          </div>
          <button
            disabled={!canAfford}
            onClick={onEnhance}
            data-testid={`enhance-btn-${inst.instanceId}`}
            style={{
              fontSize: 12,
              background: canAfford ? 'var(--forge-accent-dim)' : 'none',
              border: `1px solid ${canAfford ? 'var(--forge-accent)' : 'var(--forge-border)'}`,
              borderRadius: 4,
              padding: '4px 12px',
              color: canAfford ? 'var(--forge-accent)' : 'var(--forge-text-muted)',
              cursor: canAfford ? 'pointer' : 'default',
            }}
          >
            강화 +1
          </button>
          {inst.modifiers.length > 0 && (
            <div data-testid="modifier-list" style={{ marginTop: 8, borderTop: '1px solid var(--forge-border)', paddingTop: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginBottom: 4 }}>수식어</div>
              {inst.modifiers.map((mod) => {
                const magnitude = getModifierMagnitude(mod, inst, base.rarity);
                return (
                  <div
                    key={mod.id}
                    data-testid={`modifier-${mod.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}
                  >
                    <span style={{ color: 'var(--forge-text-secondary)' }}>{mod.nameKR}</span>
                    <span style={{ color: 'var(--forge-accent)' }}>{formatMagnitude(mod, magnitude)}</span>
                  </div>
                );
              })}
              <button
                data-testid="open-reroll"
                onClick={onOpenReroll}
                style={{
                  minHeight: 44, width: '100%', marginTop: 8,
                  background: 'var(--forge-accent-dim)',
                  border: '1px solid var(--forge-accent)',
                  borderRadius: 4, padding: '4px 8px',
                  color: 'var(--forge-accent)',
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                재굴림
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
