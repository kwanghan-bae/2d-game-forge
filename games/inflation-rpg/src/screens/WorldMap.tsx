import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableAreas } from '../data/maps';
import { isRunOver } from '../systems/bp';
import type { MapArea } from '../types';

export function WorldMap() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);

  const areas = getAvailableAreas(run.isHardMode);

  const enterArea = (area: MapArea) => {
    encounterMonster(); // BP -1
    if (isRunOver(run.bp - 1)) {
      endRun();
      return;
    }
    useGameStore.setState((s) => ({ run: { ...s.run, currentAreaId: area.id } }));
    setScreen('battle');
  };

  return (
    <div className="screen" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ background: 'var(--bg-card)', border: '1px solid #2a4060', borderRadius: 6, padding: '4px 12px', color: 'var(--bp-color)', fontWeight: 700, fontSize: 14 }}>
          ⚡ BP: {run.bp}
        </span>
        <span style={{ background: 'var(--bg-card)', border: '1px solid #2a4a2a', borderRadius: 6, padding: '4px 12px', color: 'var(--hp-color)', fontWeight: 700, fontSize: 14 }}>
          Lv.{run.level.toLocaleString()}
        </span>
      </div>

      {/* Area list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {areas.map((area) => {
          const isLocked = run.level < area.levelRange[0];
          return (
            <button
              key={area.id}
              role="button"
              aria-label={area.nameKR}
              disabled={isLocked}
              onClick={isLocked ? undefined : () => enterArea(area)}
              style={{
                background: area.bossId ? '#1a0a0a' : 'var(--bg-card)',
                border: `1px solid ${area.bossId ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                textAlign: 'left',
                cursor: isLocked ? 'default' : 'pointer',
                opacity: isLocked ? 0.4 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: area.bossId ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {area.nameKR}
                {area.bossId && <span style={{ fontSize: 10, background: 'var(--danger)', color: '#fff', borderRadius: 3, padding: '0 5px', marginLeft: 6 }}>BOSS</span>}
              </span>
              {isLocked ? (
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                  Lv.{area.levelRange[0].toLocaleString()} 필요
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {area.levelRange[0].toLocaleString()}~{area.levelRange[1] === Infinity ? '∞' : area.levelRange[1].toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </button>
      </div>
    </div>
  );
}
