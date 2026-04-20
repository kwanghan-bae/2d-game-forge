import React from 'react';
import { useGameStore, SLOT_COSTS } from '../store/gameStore';
import { EQUIPMENT_CATALOG } from '../data/equipment';
import { canDrop } from '../systems/equipment';

export function Shop() {
  const meta = useGameStore((s) => s.meta);
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const addEquipment = useGameStore((s) => s.addEquipment);
  const buyEquipSlot = useGameStore((s) => s.buyEquipSlot);

  const buyEquipment = (itemId: string, price: number) => {
    if (run.goldThisRun < price) return;
    const item = EQUIPMENT_CATALOG.find((e) => e.id === itemId);
    if (!item || !canDrop(meta.inventory, item.slot)) return;
    addEquipment(item);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun - price } }));
  };

  const backScreen = run.characterId ? 'world-map' : 'main-menu';
  const nextSlotCost = SLOT_COSTS[meta.equipSlotCount];

  return (
    <div className="screen" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>상점</span>
        <span style={{ fontSize: 12, color: 'var(--luc-color)' }}>
          💰 {run.goldThisRun.toLocaleString()}G
        </span>
      </div>

      {/* 슬롯 확장 */}
      {nextSlotCost && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            🔧 장비 슬롯 업그레이드 (현재 {meta.equipSlotCount}/10)
          </div>
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>슬롯 확장</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>장착 슬롯 +1 (영구)</div>
            </div>
            <button
              aria-label="슬롯 확장"
              disabled={run.goldThisRun < nextSlotCost}
              onClick={buyEquipSlot}
              style={{
                background: run.goldThisRun >= nextSlotCost ? 'var(--accent)' : 'var(--bg-card)',
                color: run.goldThisRun >= nextSlotCost ? '#1a1a24' : 'var(--text-muted)',
                border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                cursor: run.goldThisRun >= nextSlotCost ? 'pointer' : 'default',
              }}
            >
              {nextSlotCost.toLocaleString()}G
            </button>
          </div>
        </div>
      )}

      {/* 장비 구매 */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>⚔️ 장비</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EQUIPMENT_CATALOG.map((item) => {
          const canBuy = run.goldThisRun >= item.price && canDrop(meta.inventory, item.slot);
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
                onClick={() => buyEquipment(item.id, item.price)}
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
