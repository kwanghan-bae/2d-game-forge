import type { FC } from 'react';
import { getSetForEquipment, getActiveSetBonuses, type ActiveSetResult } from '../systems/equipmentSets';

interface SetBadgeProps {
  baseId: string;
}

export const EquipmentSetBadge: FC<SetBadgeProps> = ({ baseId }) => {
  const setDef = getSetForEquipment(baseId);
  if (!setDef) return null;

  return (
    <span
      data-testid="equipment-set-badge"
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 'bold',
        borderRadius: 4,
        background: 'rgba(234, 179, 8, 0.15)',
        border: '1px solid rgba(234, 179, 8, 0.4)',
        color: '#fbbf24',
      }}
    >
      세트: {setDef.name}
    </span>
  );
};

interface SetSummaryProps {
  equippedBaseIds: string[];
}

export const EquipmentSetSummaryPanel: FC<SetSummaryProps> = ({ equippedBaseIds }) => {
  const activeSets = getActiveSetBonuses(equippedBaseIds);
  if (activeSets.length === 0) return null;

  return (
    <div
      data-testid="equipment-set-summary"
      style={{
        marginTop: 10,
        padding: '8px 10px',
        background: 'rgba(234, 179, 8, 0.08)',
        border: '1px solid rgba(234, 179, 8, 0.25)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 'bold',
          color: '#fbbf24',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>✨</span>
        <span>세트 시너지 효과</span>
      </div>

      {activeSets.map(({ set, equippedCount, activeBonuses, inactiveBonuses }: ActiveSetResult) => (
        <div key={set.id} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fef08a' }}>
            {set.name}{' '}
            <span style={{ fontSize: 10, fontWeight: 'normal', color: '#9ca3af' }}>
              ({equippedCount}/3)
            </span>
          </div>
          {activeBonuses.map(b => (
            <div
              key={b.pieces}
              data-testid="equipment-set-active-bonus"
              style={{ fontSize: 11, color: '#6ee7b7', marginLeft: 8, marginTop: 2 }}
            >
              ✔ {b.name}: {b.description}
            </div>
          ))}
          {inactiveBonuses.map(b => (
            <div
              key={b.pieces}
              data-testid="equipment-set-inactive-bonus"
              style={{ fontSize: 10, color: '#6b7280', marginLeft: 8, marginTop: 1 }}
            >
              🔒 {b.name}: {b.description}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
