import React from 'react';
import { useGameStore } from '../store/gameStore';
import { REGIONS } from '../data/regions';
import { getAreasByRegion } from '../data/maps';
import { RegionMap } from './RegionMap';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeScreen } from '@/components/ui/forge-screen';

export function WorldMap() {
  const run = useGameStore((s) => s.run);
  const setScreen = useGameStore((s) => s.setScreen);
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null);

  if (selectedRegionId) {
    return (
      <RegionMap regionId={selectedRegionId} onBack={() => setSelectedRegionId(null)} />
    );
  }

  const isRegionUnlocked = (regionId: string) =>
    getAreasByRegion(regionId, run.isHardMode).some((a) => run.level >= a.levelRange[0]);

  const visibleRegions = REGIONS.filter((r) => !r.isHardOnly || run.isHardMode);

  return (
    <ForgeScreen
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(180deg, #7ab8e8 0%, #a8d5a2 35%, #5a9e30 65%, #7f8c8d 85%, #2c3e50 100%)',
        overflow: 'hidden',
      }}
    >
      {/* CSS pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 16px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4060',
            borderRadius: 6,
            padding: '4px 12px',
            color: '#7ab8e8',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ⚡ BP: {run.bp}
        </span>
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4a2a',
            borderRadius: 6,
            padding: '4px 12px',
            color: '#8dc98d',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Lv.{run.level.toLocaleString()}
        </span>
      </div>

      {/* SVG region connections */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {visibleRegions.map((region, i) => {
          if (i === 0) return null;
          const prev = visibleRegions[i - 1]!;
          const unlocked = isRegionUnlocked(region.id);
          return (
            <line
              key={`rline-${region.id}`}
              x1={`${prev.worldX}%`}
              y1={`${prev.worldY}%`}
              x2={`${region.worldX}%`}
              y2={`${region.worldY}%`}
              stroke={unlocked ? '#d4af37' : '#555'}
              strokeWidth={2}
              strokeDasharray={unlocked ? '6 3' : '4 4'}
            />
          );
        })}
      </svg>

      {/* Region nodes */}
      {visibleRegions.map((region) => {
        const unlocked = isRegionUnlocked(region.id);
        return (
          <button
            key={region.id}
            aria-label={region.nameKR}
            disabled={!unlocked}
            onClick={unlocked ? () => setSelectedRegionId(region.id) : undefined}
            style={{
              position: 'absolute',
              left: `${region.worldX}%`,
              top: `${region.worldY}%`,
              transform: 'translate(-50%, -50%)',
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: region.isHardOnly
                ? '2px solid #e03030'
                : '2px solid rgba(255,255,255,0.5)',
              background: unlocked ? 'rgba(0,0,0,0.72)' : 'rgba(80,80,80,0.55)',
              opacity: unlocked ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: unlocked ? 'pointer' : 'default',
              fontSize: 22,
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {unlocked ? region.emoji : '🔒'}
          </button>
        );
      })}

      {/* Bottom nav */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.45)',
        }}
      >
        <ForgeButton variant="secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </ForgeButton>
        <ForgeButton variant="secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </ForgeButton>
      </div>
    </ForgeScreen>
  );
}
