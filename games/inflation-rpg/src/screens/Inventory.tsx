import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Equipment, EquipmentSlot } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';
import { getCraftCost, getNextTier } from '../systems/crafting';
import { getEquipmentById } from '../data/equipment';
import { CHARACTERS } from '../data/characters';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeInventoryGrid } from '@/components/ui/forge-inventory-grid';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { formatNumber } from '../lib/format';

const TABS: { slot: EquipmentSlot; label: string; emoji: string }[] = [
  { slot: 'weapon',    label: '무기',     emoji: '⚔️' },
  { slot: 'armor',     label: '방어구',   emoji: '🛡️' },
  { slot: 'accessory', label: '악세사리', emoji: '💍' },
];

export function Inventory() {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');
  const [mainTab, setMainTab] = useState<'inventory' | 'craft' | 'skills'>('inventory');
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const sellEquipment = useGameStore((s) => s.sellEquipment);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const craft = useGameStore((s) => s.craft);
  const run = useGameStore((s) => s.run);

  const allItems: Equipment[] = [
    ...meta.inventory.weapons,
    ...meta.inventory.armors,
    ...meta.inventory.accessories,
  ];
  const equippedItems = meta.equippedItemIds
    .map((id) => allItems.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);

  const tabItems = activeSlot === 'weapon'
    ? meta.inventory.weapons
    : activeSlot === 'armor'
    ? meta.inventory.armors
    : meta.inventory.accessories;

  const isFull = meta.equippedItemIds.length >= meta.equipSlotCount;
  const backScreen = run.characterId ? 'town' : 'main-menu';

  const craftable = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const item of allItems) groups[item.id] = (groups[item.id] ?? 0) + 1;
    return Object.entries(groups)
      .filter(([, count]) => count >= 3)
      .map(([id, count]) => {
        const equipment = getEquipmentById(id);
        return equipment ? { id, count, equipment } : null;
      })
      .filter((e): e is { id: string; count: number; equipment: Equipment } => e !== null);
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
                  return (
                    <div key={i} onClick={() => unequipItem(item.id)} style={{ width: 58, height: 58, background: 'var(--forge-bg-card)', border: '2px solid var(--forge-accent)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', padding: 2 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--forge-accent)', textAlign: 'center', lineHeight: 1.2 }}>{item.name}</div>
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
              const isEquipped = meta.equippedItemIds.includes(item.id);
              return (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  isEquipped={isEquipped}
                  canEquip={!isFull && !isEquipped}
                  onEquip={() => equipItem(item.id)}
                  onUnequip={() => unequipItem(item.id)}
                  onSell={() => sellEquipment(item.id, item.price)}
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
          {craftable.map(({ id, count, equipment }) => {
            const nextTier = getNextTier(equipment.rarity);
            const cost = getCraftCost(equipment.rarity);
            const canAfford = meta.gold >= cost;
            const canCraft = nextTier !== null;
            return (
              <ForgePanel key={id} style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{equipment.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--forge-text-secondary)' }}>
                    x{count}
                  </span>
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {equipment.rarity} → {nextTier ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--forge-accent)', marginTop: 2 }}>
                  비용: {cost.toLocaleString()}G {!canAfford && '(골드 부족)'}
                </div>
                {canCraft && canAfford ? (
                  <ForgeButton variant="primary" style={{ marginTop: 8 }} onClick={() => craft(id)}>
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

function EquipmentCard({ item, isEquipped, canEquip, onEquip, onUnequip, onSell }: {
  item: Equipment;
  isEquipped: boolean;
  canEquip: boolean;
  onEquip: () => void;
  onUnequip: () => void;
  onSell: () => void;
}) {
  const rarityColor: Record<string, string> = {
    common: 'var(--forge-rarity-common)',
    uncommon: 'var(--forge-rarity-uncommon)',
    rare: 'var(--forge-rarity-rare)',
    epic: 'var(--forge-rarity-epic)',
    legendary: 'var(--forge-rarity-legendary)',
    mythic: 'var(--forge-rarity-mythic)',
  };
  const statStr = Object.entries(item.stats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');

  return (
    <div style={{ background: 'var(--forge-bg-card)', border: `1px solid ${isEquipped ? 'var(--forge-accent)' : rarityColor[item.rarity]}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: 'var(--forge-stat-atk)', marginBottom: 6 }}>{statStr}</div>
      <div style={{ display: 'flex', gap: 4 }}>
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
          매각 {item.price.toLocaleString()}G
        </button>
      </div>
    </div>
  );
}
