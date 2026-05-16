import type { TraitId } from '../cycle/traits';
import { TRAIT_CATALOG } from '../data/traits';

interface Props {
  availableIds: readonly TraitId[];
  selectedIds: readonly TraitId[];
  maxSlots: number;
  onChange: (next: TraitId[]) => void;
}

export function TraitSelector({ availableIds, selectedIds, maxSlots, onChange }: Props) {
  const selectedSet = new Set(selectedIds);
  const handleClick = (id: TraitId) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else if (selectedIds.length < maxSlots) {
      onChange([...selectedIds, id]);
    }
    // else: full and clicking new → ignore
  };

  return (
    <div data-testid="trait-selector">
      <div data-testid="trait-slot-count" style={{ marginBottom: 8 }}>
        선택: {selectedIds.length} / {maxSlots}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {availableIds.map(id => {
          const t = TRAIT_CATALOG[id];
          const selected = selectedSet.has(id);
          return (
            <button
              key={id}
              type="button"
              data-testid={`trait-card-${id}`}
              data-selected={selected}
              onClick={() => handleClick(id)}
              style={{
                padding: 8,
                border: selected ? '2px solid #f5c542' : '1px solid #555',
                background: selected ? '#3a3520' : '#1a1a1a',
                color: '#eee',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{t.nameKR}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.descKR}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
