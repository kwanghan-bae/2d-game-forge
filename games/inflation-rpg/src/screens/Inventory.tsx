import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Equipment, EquipmentSlot } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeInventoryGrid } from '@/components/ui/forge-inventory-grid';
import { ForgeScreen } from '@/components/ui/forge-screen';

const TABS: { slot: EquipmentSlot; label: string; emoji: string }[] = [
  { slot: 'weapon',    label: '무기',     emoji: '⚔️' },
  { slot: 'armor',     label: '방어구',   emoji: '🛡️' },
  { slot: 'accessory', label: '악세사리', emoji: '💍' },
];

export function Inventory() {
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('weapon');
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const sellEquipment = useGameStore((s) => s.sellEquipment);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
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
  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <ForgeScreen style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <ForgeButton variant="secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </ForgeButton>
        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>인벤토리</span>
        <span style={{ fontSize: 12, color: 'var(--forge-stat-luc)' }}>💰 {meta.gold.toLocaleString()}</span>
      </div>

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

      {/* Tabs */}
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
    common: 'var(--forge-border)', rare: '#c060e0', epic: '#60a0e0', legendary: 'var(--forge-accent)',
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
