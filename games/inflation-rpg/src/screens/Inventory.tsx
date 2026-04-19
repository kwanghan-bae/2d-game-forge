import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Equipment, EquipmentSlot } from '../types';
import { SLOT_LIMITS } from '../systems/equipment';

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
  const run = useGameStore((s) => s.run);

  const items = activeSlot === 'weapon'
    ? meta.inventory.weapons
    : activeSlot === 'armor'
    ? meta.inventory.armors
    : meta.inventory.accessories;

  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>인벤토리</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>💰 {meta.gold.toLocaleString()}</span>
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
                background: activeSlot === tab.slot ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: `1px solid ${activeSlot === tab.slot ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                padding: '6px 4px',
                fontSize: 11,
                color: activeSlot === tab.slot ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {tab.emoji} {tab.label} {count}/{SLOT_LIMITS[tab.slot]}
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {items.map((item) => (
          <EquipmentCard key={item.id} item={item} onSell={() => sellEquipment(item.id, item.price)} />
        ))}
        {items.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
            장비가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentCard({ item, onSell }: { item: Equipment; onSell: () => void }) {
  const rarityColor: Record<string, string> = {
    common: 'var(--border)', rare: '#c060e0', epic: '#60a0e0', legendary: 'var(--accent)',
  };
  const statStr = Object.entries(item.stats.percent ?? {})
    .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
    .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
    .join(' ');

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${rarityColor[item.rarity]}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: 'var(--atk-color)', marginBottom: 6 }}>{statStr}</div>
      <button onClick={onSell} style={{ fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: 'var(--text-muted)', cursor: 'pointer' }}>
        매각 {item.price.toLocaleString()}G
      </button>
    </div>
  );
}
