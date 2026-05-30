import React, { useEffect, useRef, useState } from 'react';
import { DamageFloaterLogic, type DamageType } from './DamageFloaterLogic';

/**
 * C655: DamageFloater — floating damage/heal/exp/crit numbers
 * Renders entries that float upward and fade out over 800ms.
 */

const TYPE_COLORS: Record<DamageType, string> = {
  damage: '#ff4444',
  heal: '#44ff44',
  exp: '#ffd700',
  critical: '#cc44ff',
};

interface Props {
  logic: DamageFloaterLogic;
}

export function DamageFloater({ logic }: Props) {
  const [entries, setEntries] = useState<ReturnType<DamageFloaterLogic['getActiveEntries']>>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setEntries(logic.getActiveEntries(Date.now()));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [logic]);

  if (entries.length === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', width: 200, height: 120 }}>
      {entries.map(entry => {
        const yOffset = -entry.progress * 60;
        const opacity = 1 - entry.progress;
        const isCrit = entry.type === 'critical';
        const scale = isCrit ? 1 + 0.4 * Math.sin(entry.progress * Math.PI) : 1;
        return (
          <div
            key={entry.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: `calc(50% + ${yOffset}px)`,
              transform: `translateX(-50%) scale(${scale})`,
              opacity,
              fontSize: isCrit ? 18 : 14,
              fontWeight: 'bold',
              color: TYPE_COLORS[entry.type],
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.type === 'heal' ? '+' : entry.type === 'damage' || entry.type === 'critical' ? '-' : '+'}
            {entry.value}
          </div>
        );
      })}
    </div>
  );
}
