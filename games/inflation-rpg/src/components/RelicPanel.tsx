import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

const RELIC_ICONS: Record<number, string> = {
  0: '🔥', // Ember Crown
  1: '💰', // Miser's Pouch
  2: '🪶', // Phoenix Feather
  3: '⏳', // Hourglass
  4: '🩸', // Blood Pact
  5: '📖', // Scholar's Lens
};

const RELIC_DESCRIPTIONS: Record<number, string> = {
  0: 'ATK per crit (stacking)',
  1: 'Gold +40%, heal -50%',
  2: 'Survive death once',
  3: 'Temporal effects ×2',
  4: 'Blood Pact enhanced',
  5: 'EXP +50%, ATK -20%',
};

export function RelicPanel() {
  const controller = useCycleStoreV2(s => s.controller);
  if (!controller) return null;

  const relics = controller.getRelics();
  const imprinted = controller.getImprintedRelic();

  if (relics.length === 0 && !imprinted) return null;

  return (
    <div className="relic-panel" style={{
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '8px',
      border: '1px solid rgba(218,165,32,0.4)',
      fontSize: '12px',
      color: '#e0e0e0',
    }}>
      <div style={{ fontWeight: 'bold', color: '#daa520', marginBottom: '4px' }}>
        Relics ({relics.length}/3)
      </div>
      {relics.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
          <span>{RELIC_ICONS[r.id] ?? '?'}</span>
          <span>{r.name}</span>
          {r.level > 1 && <span style={{ color: '#ffd700' }}>{'★'.repeat(r.level)}</span>}
          <span style={{ color: '#888', fontSize: '10px' }}>{RELIC_DESCRIPTIONS[r.id]}</span>
        </div>
      ))}
      {imprinted && (
        <div style={{ marginTop: '4px', opacity: 0.7, fontStyle: 'italic' }}>
          Imprinted: {RELIC_ICONS[imprinted.id]} {imprinted.name} (30%)
        </div>
      )}
    </div>
  );
}
