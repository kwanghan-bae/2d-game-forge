import React from 'react';
import { useGameStore } from '../store/gameStore';
import { EQUIPMENT_CATALOG } from '../data/equipment';
import { canDrop } from '../systems/equipment';

export function Shop() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const addEquipment = useGameStore((s) => s.addEquipment);
  const run = useGameStore((s) => s.run);

  const buy = (itemId: string, price: number) => {
    if (meta.gold < price) return;
    const item = EQUIPMENT_CATALOG.find((e) => e.id === itemId);
    if (!item || !canDrop(meta.inventory, item.slot)) return;
    addEquipment(item);
    useGameStore.setState((s) => ({ meta: { ...s.meta, gold: s.meta.gold - price } }));
  };

  const backScreen = run.characterId ? 'world-map' : 'main-menu';

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>상점</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>💰 {meta.gold.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EQUIPMENT_CATALOG.map((item) => {
          const canBuy = meta.gold >= item.price && canDrop(meta.inventory, item.slot);
          const statStr = Object.entries(item.stats.percent ?? {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
            .concat(Object.entries(item.stats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
            .join(' ');
          return (
            <div key={item.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--atk-color)' }}>{statStr}</div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => buy(item.id, item.price)}
                style={{
                  background: canBuy ? 'var(--accent)' : 'var(--bg-card)',
                  color: canBuy ? '#1a1a24' : 'var(--text-muted)',
                  border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                  cursor: canBuy ? 'pointer' : 'default',
                }}
              >
                {item.price.toLocaleString()}G
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
