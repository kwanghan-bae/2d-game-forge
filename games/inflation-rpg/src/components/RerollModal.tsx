import { useGameStore } from '../store/gameStore';
import { rerollCost } from '../systems/modifiers';
import type { EquipmentInstance, SlotKind } from '../types';

interface Props {
  instance: EquipmentInstance;
  slot: SlotKind;
  onClose: () => void;
}

export function RerollModal({ instance, slot, onClose }: Props) {
  const dr = useGameStore((s) => s.meta.dr);
  const stones = useGameStore((s) => s.meta.crackStones);
  const rerollCountSoFar = useGameStore((s) => s.meta.rerollCount ?? 0);
  const rerollOne = useGameStore((s) => s.rerollOneSlot);
  const rerollAll = useGameStore((s) => s.rerollAllSlots);

  const oneCost = rerollCost(rerollCountSoFar, 'one');
  const allCost = rerollCost(rerollCountSoFar, 'all');
  const canOne = dr >= oneCost.dr && stones >= oneCost.stones;
  const canAll = dr >= allCost.dr && stones >= allCost.stones;

  return (
    <div
      data-testid="reroll-modal"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100,
      }}
    >
      <div style={{ background: '#222', padding: 16, borderRadius: 8, minWidth: 280, maxWidth: 360 }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--forge-accent, #c8a84b)' }}>재굴림</h3>
        <div style={{ fontSize: 12, color: 'var(--forge-text-muted, #888)', marginBottom: 8 }}>
          DR {dr.toLocaleString()} / 균열석 {stones.toLocaleString()}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px' }}>
          {instance.modifiers.map((m, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--forge-text-secondary, #aaa)', marginBottom: 4 }}>
                {m.nameKR}
              </div>
              <button
                data-testid={`reroll-slot-${idx}`}
                disabled={!canOne}
                onClick={() => rerollOne(instance.instanceId, slot, idx)}
                style={{
                  minHeight: 44, width: '100%',
                  background: canOne ? 'var(--forge-accent-dim, #3a2c10)' : 'none',
                  border: `1px solid ${canOne ? 'var(--forge-accent, #c8a84b)' : 'var(--forge-border, #2a4060)'}`,
                  borderRadius: 4, padding: '4px 8px',
                  color: canOne ? 'var(--forge-accent, #c8a84b)' : 'var(--forge-text-muted, #888)',
                  cursor: canOne ? 'pointer' : 'default', fontSize: 12,
                }}
              >
                슬롯 {idx + 1} 재굴림 (DR {oneCost.dr.toLocaleString()} + 석 {oneCost.stones.toLocaleString()})
              </button>
            </li>
          ))}
        </ul>
        <button
          data-testid="reroll-all"
          disabled={!canAll}
          onClick={() => rerollAll(instance.instanceId, slot)}
          style={{
            minHeight: 44, width: '100%', marginTop: 8,
            background: canAll ? 'var(--forge-accent-dim, #3a2c10)' : 'none',
            border: `1px solid ${canAll ? 'var(--forge-accent, #c8a84b)' : 'var(--forge-border, #2a4060)'}`,
            borderRadius: 4, padding: '4px 8px',
            color: canAll ? 'var(--forge-accent, #c8a84b)' : 'var(--forge-text-muted, #888)',
            cursor: canAll ? 'pointer' : 'default', fontSize: 12,
          }}
        >
          전체 재굴림 (DR {allCost.dr.toLocaleString()} + 석 {allCost.stones.toLocaleString()})
        </button>
        <button
          data-testid="reroll-close"
          onClick={onClose}
          style={{
            minHeight: 44, width: '100%', marginTop: 8,
            background: 'none',
            border: '1px solid var(--forge-border, #2a4060)',
            borderRadius: 4, padding: '4px 8px',
            color: 'var(--forge-text-muted, #888)',
            cursor: 'pointer', fontSize: 12,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
