import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

/**
 * C879: Active Buff HUD — shows current active buffs as compact badges.
 * Reads from getCombatSummary().activeBuffs.
 */
export function ActiveBuffHUD() {
  const controller = useCycleStoreV2(s => s.controller);
  if (!controller) return null;

  const summary = controller.getCombatSummary();
  const buffs = summary.activeBuffs;
  if (buffs.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 8, right: 8,
      display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200,
      pointerEvents: 'none',
    }}>
      {buffs.map((buff, i) => (
        <span key={i} style={{
          background: 'rgba(240, 192, 64, 0.2)',
          border: '1px solid rgba(240, 192, 64, 0.5)',
          borderRadius: 4, padding: '2px 6px',
          fontSize: 10, color: '#f0c040',
          whiteSpace: 'nowrap',
        }}>
          {buff}
        </span>
      ))}
    </div>
  );
}
