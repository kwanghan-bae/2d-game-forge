import { useState } from 'react';
import { TraitSelector } from '../components/TraitSelector';
import { useCycleStore } from '../cycle/cycleSlice';
import { useGameStore } from '../store/gameStore';
import type { TraitId } from '../cycle/traits';

interface Props {
  onStart: () => void;
  onCancel: () => void;
}

const DEFAULT_SLOTS = 3;

export function CyclePrep({ onStart, onCancel }: Props) {
  const [selected, setSelected] = useState<TraitId[]>([]);
  const startCycle = useCycleStore(s => s.start);
  const characterId = useGameStore(s => s.meta.lastPlayedCharId ?? 'K01');
  const available = useGameStore(s => s.meta.traitsUnlocked) as readonly TraitId[];

  const handleStart = () => {
    startCycle({
      loadout: {
        characterId,
        bpMax: 30,
        heroHpMax: 100,
        heroAtkBase: 50,
      },
      seed: Date.now() & 0xffffffff,
      traits: selected,
    });
    onStart();
  };

  return (
    <div data-testid="cycle-prep" style={{ padding: 16 }}>
      <h2>사이클 준비</h2>
      <p style={{ opacity: 0.8, fontSize: 13 }}>
        성격 · 성향을 정하면 hero 가 그대로 사이클을 살아낸다.
      </p>
      <TraitSelector
        availableIds={available}
        selectedIds={selected}
        maxSlots={DEFAULT_SLOTS}
        onChange={setSelected}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" data-testid="btn-prep-start" onClick={handleStart}>
          출발
        </button>
        <button type="button" data-testid="btn-prep-cancel" onClick={onCancel}>
          돌아가기
        </button>
      </div>
    </div>
  );
}
