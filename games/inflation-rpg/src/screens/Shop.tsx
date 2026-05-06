import React from 'react';
import { useGameStore, SLOT_COSTS } from '../store/gameStore';
import { EQUIPMENT_BASES, createInstance } from '../data/equipment';
import { canDropForBase } from '../systems/equipment';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeScreen } from '@/components/ui/forge-screen';

export function Shop() {
  const meta = useGameStore((s) => s.meta);
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const addEquipment = useGameStore((s) => s.addEquipment);
  const buyEquipSlot = useGameStore((s) => s.buyEquipSlot);

  const buyEquipment = (itemId: string, price: number) => {
    if (run.goldThisRun < price) return;
    const item = EQUIPMENT_BASES.find((e) => e.id === itemId);
    if (!item || !canDropForBase(meta.inventory, item)) return;
    const inst = createInstance(item.id);
    addEquipment(inst);
    useGameStore.setState((s) => ({ run: { ...s.run, goldThisRun: s.run.goldThisRun - price } }));
  };

  const backScreen = run.characterId ? 'town' : 'main-menu';
  const nextSlotCost = SLOT_COSTS[meta.equipSlotCount];

  return (
    <ForgeScreen style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <ForgeButton variant="secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setScreen(backScreen)}>
          ← 뒤로
        </ForgeButton>
        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>상점</span>
        <span style={{ fontSize: 12, color: 'var(--forge-stat-luc)' }}>
          💰 {run.goldThisRun.toLocaleString()}G
        </span>
      </div>

      {/* 슬롯 확장 */}
      {nextSlotCost && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginBottom: 6 }}>
            🔧 장비 슬롯 업그레이드 (현재 {meta.equipSlotCount}/10)
          </div>
          <ForgePanel style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>슬롯 확장</div>
              <div style={{ fontSize: 11, color: 'var(--forge-text-muted)' }}>장착 슬롯 +1 (영구)</div>
            </div>
            <button
              aria-label="슬롯 확장"
              disabled={run.goldThisRun < nextSlotCost}
              onClick={buyEquipSlot}
              style={{
                background: run.goldThisRun >= nextSlotCost ? 'var(--forge-accent)' : 'var(--forge-bg-card)',
                color: run.goldThisRun >= nextSlotCost ? '#1a1a24' : 'var(--forge-text-muted)',
                border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                cursor: run.goldThisRun >= nextSlotCost ? 'pointer' : 'default',
              }}
            >
              {nextSlotCost.toLocaleString()}G
            </button>
          </ForgePanel>
        </div>
      )}

      {/* 장비 구매 */}
      <div style={{ fontSize: 11, color: 'var(--forge-text-muted)', marginBottom: 6 }}>⚔️ 장비</div>
      <div className="forge-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '55vh' }}>
        {EQUIPMENT_BASES.map((item) => {
          const canBuy = run.goldThisRun >= item.price && canDropForBase(meta.inventory, item);
          const statStr = Object.entries(item.baseStats.percent ?? {})
            .map(([k, v]) => `${k.toUpperCase()}+${v}%`)
            .concat(Object.entries(item.baseStats.flat ?? {}).map(([k, v]) => `${k.toUpperCase()}+${v}`))
            .join(' ');
          return (
            <ForgePanel key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--forge-stat-atk)' }}>{statStr}</div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => buyEquipment(item.id, item.price)}
                style={{
                  background: canBuy ? 'var(--forge-accent)' : 'var(--forge-bg-card)',
                  color: canBuy ? '#1a1a24' : 'var(--forge-text-muted)',
                  border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                  cursor: canBuy ? 'pointer' : 'default',
                }}
              >
                {item.price.toLocaleString()}G
              </button>
            </ForgePanel>
          );
        })}
      </div>
    </ForgeScreen>
  );
}
