import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getRegionById } from '../data/regions';
import { getAreasByRegion } from '../data/maps';
import { getRegionEnterStory } from '../data/stories';
import { isRunOver } from '../systems/bp';
import type { MapArea } from '../types';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { StoryModal } from '../components/StoryModal';

const ICON_EMOJI: Record<string, string> = {
  village: '🏘️', wheat: '🌾', 'water-drop': '💧', coins: '🪙', beer: '🍺',
  fire: '🔥', footprint: '👣', grass: '🌿', castle: '🏯', 'plain-arrow': '➡️',
  gears: '⚙️', arid: '🌵', 'wooden-sign': '🪵', boat: '⛵', rain: '🌧️',
  ruins: '🏚️', poison: '☠️', campfire: '🔥', 'border-post': '🚩', watchtower: '🗼',
  'crossed-swords': '⚔️', 'pine-tree': '🌲', bamboo: '🎋', oak: '🌳',
  fox: '🦊', 'stone-block': '🪨', mushroom: '🍄', 'tree-face': '🌳',
  'dark-forest': '🌑', 'torii-gate': '⛩️', tiger: '🐯', maze: '🌀',
  'dead-tree': '🌵', heart: '❤️', hiking: '🥾', imp: '👺', rock: '🪨',
  cliff: '🏔️', totem: '🗿', snowflake: '❄️', mountain: '⛰️',
  'mountain-peak': '🏔️', 'arrow-right': '➡️', fortress: '🏰', lake: '🏞️',
  cloud: '☁️', lightning: '⚡', spirit: '👻', star: '⭐', anchor: '⚓',
  crab: '🦀', wave: '🌊', fish: '🐟', trident: '🔱', coral: '🪸',
  cave: '🕳️', treasure: '💎', vortex: '🌀', ice: '🧊', palace: '🏯',
  throne: '🪑', lava: '🌋', ash: '💨', circle: '⭕', dragon: '🐉',
  waterfall: '💦', crater: '⭕', gate: '🚪', river: '🌊', portcullis: '🚧',
  ghost: '👻', 'haunted-house': '🏚️', skull: '💀', door: '🚪', crown: '👑',
  void: '🌑', scale: '⚖️', abyss: '🕳️', feather: '🪶', flower: '🌸',
  'yin-yang': '☯️', portal: '🔮', infinity: '♾️', chaos: '🌀',
  hourglass: '⏳', 'broken-clock': '⏰', 'black-hole': '🌑',
};

interface RegionMapProps {
  regionId: string;
  onBack: () => void;
}

export function RegionMap({ regionId, onBack }: RegionMapProps) {
  const run = useGameStore((s) => s.run);
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const encounterMonster = useGameStore((s) => s.encounterMonster);
  const endRun = useGameStore((s) => s.endRun);
  const setCurrentArea = useGameStore((s) => s.setCurrentArea);
  const resetDungeon = useGameStore((s) => s.resetDungeon);
  const markRegionVisited = useGameStore((s) => s.markRegionVisited);
  const [lockedInfo, setLockedInfo] = React.useState<MapArea | null>(null);
  const [showStory, setShowStory] = React.useState(false);

  const region = getRegionById(regionId);

  React.useEffect(() => {
    if (!region) return;
    if (meta.regionsVisited.includes(region.id)) return;
    if (getRegionEnterStory(region.id)) setShowStory(true);
  }, [region, meta.regionsVisited]);

  const closeStory = () => {
    if (region) markRegionVisited(region.id);
    setShowStory(false);
  };

  if (!region) return null;
  const enterStory = getRegionEnterStory(region.id);

  const areas = getAreasByRegion(regionId, run.isHardMode);

  const enterArea = (area: MapArea) => {
    setLockedInfo(null);
    // 영역의 하한 레벨을 몬스터 레벨로 사용. Phase B 에서 던전 floor 별 정확한
    // 레벨로 교체 예정.
    const monsterLevel = area.levelRange[0];
    encounterMonster(monsterLevel);
    // BP 가 0 이하가 되었는지 확인 (encounter 이후 상태로). 비용이 더 이상 -1
    // 고정이 아니므로 store 상태 재조회로 검사.
    const newBP = useGameStore.getState().run.bp;
    if (isRunOver(newBP)) {
      endRun();
      return;
    }
    setCurrentArea(area.id);
    resetDungeon();
    setScreen('dungeon');
  };

  return (
    <ForgeScreen
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: region.bgGradient,
        overflow: 'hidden',
      }}
    >
      {/* CSS pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: region.bgPattern,
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
          padding: '4px 12px',
          background: 'rgba(0,0,0,0.55)',
          zIndex: 10,
        }}
      >
        <button
          aria-label="뒤로가기"
          onClick={onBack}
          style={{
            fontSize: 18,
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ←
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          {region.emoji} {region.nameKR}
        </span>
        <span
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid #2a4060',
            borderRadius: 6,
            padding: '4px 10px',
            color: '#7ab8e8',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ⚡ BP: {run.bp}
        </span>
      </div>

      {/* SVG connection lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {areas.map((area, i) => {
          if (i === 0) return null;
          const prev = areas[i - 1]!;
          const unlocked = run.level >= area.levelRange[0];
          return (
            <line
              key={`line-${area.id}`}
              x1={`${prev.mapX}%`}
              y1={`${prev.mapY}%`}
              x2={`${area.mapX}%`}
              y2={`${area.mapY}%`}
              stroke={unlocked ? '#d4af37' : '#555'}
              strokeWidth={2}
              strokeDasharray={unlocked ? '6 3' : '4 4'}
            />
          );
        })}
      </svg>

      {/* Area nodes */}
      {areas.map((area) => {
        const isLocked = run.level < area.levelRange[0];
        const isCurrent = run.currentAreaId === area.id;
        const emoji = ICON_EMOJI[area.icon] ?? '📍';
        return (
          <button
            key={area.id}
            aria-label={area.nameKR}
            onClick={() => (isLocked ? setLockedInfo(area) : enterArea(area))}
            style={{
              position: 'absolute',
              left: `${area.mapX}%`,
              top: `${area.mapY}%`,
              transform: 'translate(-50%, -50%)',
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: area.bossId ? '2px solid #e03030' : '2px solid rgba(255,255,255,0.3)',
              background: isLocked ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.75)',
              opacity: isLocked ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 20,
              boxShadow: isCurrent ? '0 0 12px 4px gold' : undefined,
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {isLocked ? '🔒' : emoji}
          </button>
        );
      })}

      {/* Locked area info bar */}
      {lockedInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 12,
            right: 12,
            background: 'rgba(0,0,0,0.88)',
            border: '1px solid #2a4060',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#fff',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {lockedInfo.nameKR}
            {lockedInfo.bossId && (
              <span
                style={{
                  fontSize: 10,
                  background: '#e03030',
                  color: '#fff',
                  borderRadius: 3,
                  padding: '0 5px',
                  marginLeft: 6,
                }}
              >
                BOSS
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            {lockedInfo.levelRange[0].toLocaleString()} ~{' '}
            {lockedInfo.levelRange[1] === Infinity
              ? '∞'
              : lockedInfo.levelRange[1].toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#e05050', marginTop: 2 }}>
            Lv.{lockedInfo.levelRange[0].toLocaleString()} 필요
          </div>
        </div>
      )}

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
          background: 'rgba(0,0,0,0.55)',
        }}
      >
        <ForgeButton variant="secondary" style={{ flex: 1 }} onClick={() => setScreen('inventory')}>
          인벤토리
        </ForgeButton>
        <ForgeButton variant="secondary" style={{ flex: 1 }} onClick={() => setScreen('shop')}>
          상점
        </ForgeButton>
        <ForgeButton variant="secondary" style={{ flex: 1 }} onClick={() => setScreen('quests')}>
          퀘스트
        </ForgeButton>
      </div>

      {showStory && enterStory && (
        <StoryModal
          title={region.nameKR}
          emoji={region.emoji}
          textKR={enterStory.textKR}
          onClose={closeStory}
        />
      )}
    </ForgeScreen>
  );
}
