import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

/**
 * C578: Compact combat status overlay showing active buffs,
 * death prevention layers, and danger level.
 */
export function CombatOverlay() {
  const controller = useCycleStoreV2(s => s.controller);
  if (!controller) return null;

  const summary = controller.getCombatSummary();
  if (summary.activeBuffs.length === 0 && summary.deathPrevention === 0 && summary.dangerLevel === 0 && summary.adaptivePressure === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute', top: 8, right: 8,
      background: summary.deathSaveBlocked ? 'rgba(80,0,0,0.85)' : 'rgba(0,0,0,0.7)',
      borderRadius: 6, padding: '6px 10px',
      fontSize: 12, color: '#ddd', minWidth: 100, pointerEvents: 'none',
      border: summary.dangerLevel >= 5 ? '1px solid #f44' : undefined,
    }}>
      {summary.activeBuffs.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#8f8' }}>⚡</span>{' '}
          {summary.activeBuffs.join(' · ')}
        </div>
      )}
      {summary.deathPrevention > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#ff8' }}>🛡</span>{' '}
          방어막 ×{summary.deathPrevention}
        </div>
      )}
      {summary.deathSaveBlocked && (
        <div style={{ marginBottom: 4, color: '#f44' }}>
          ⚠️ 저주: 사망방지 차단
        </div>
      )}
      {summary.dangerLevel > 0 && (
        <div>
          <span style={{ color: '#f88' }}>{'🔥'.repeat(Math.min(summary.dangerLevel, 5))}</span>{' '}
          위험 Lv{summary.dangerLevel}
        </div>
      )}
      {summary.adaptivePressure > 10 && (
        <div style={{ marginTop: 4, fontSize: 10, color: summary.adaptivePressure > 50 ? '#f88' : '#aaa' }}>
          압력 {summary.adaptivePressure}%
        </div>
      )}
    </div>
  );
}
