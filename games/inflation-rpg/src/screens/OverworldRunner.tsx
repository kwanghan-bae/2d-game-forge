import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useGameStore } from '../store/gameStore';
import { computeLightDelta } from '../overworld/lightEmit';
import { getLightRateMul, getMoveSpeedMul } from '../buff/buffEffects';
import type { SagaEvent } from '../saga/SagaTypes';
import { SpendModal } from './SpendModal';

interface Props {
  onCycleEnd: () => void;
}

const LOG_LIMIT = 12;

// Lazy-load Phaser only on the client + only when this component mounts. This
// avoids server-rendering issues with the dev-shell.
async function bootPhaser(
  container: HTMLDivElement,
  onEvent: (e: import('../overworld/OverworldEvents').OverworldEvent) => void,
  hero: import('../hero/HeroEntity').HeroEntity,
  ai: import('../decisionAI/HeroDecisionAI').HeroDecisionAI,
  seed: number,
  initialSpeed: number,
): Promise<{ destroy: () => void; setSpeed: (m: number) => void }> {
  const [Phaser, { OverworldScene, GRID_W, GRID_H }] = await Promise.all([
    import('phaser'),
    import('../overworld/OverworldScene'),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 640,   // V3-D: viewport fixed at 640px regardless of GRID_W
    height: GRID_H * 32,
    backgroundColor: '#0a0e1a',
    scene: OverworldScene,
    physics: { default: 'arcade' },
  });
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent, initialSpeed });
  const setSpeed = (m: number) => {
    const scene = game.scene.getScene('OverworldScene') as InstanceType<typeof OverworldScene> | null;
    scene?.setSpeed(m);
  };
  return { destroy: () => game.destroy(true), setSpeed };
}

const SPEED_PRESETS = [1, 2, 5, 10] as const;
type SpeedPreset = (typeof SPEED_PRESETS)[number];

export function OverworldRunner({ onCycleEnd }: Props) {
  const status = useCycleStoreV2(s => s.status);
  const controller = useCycleStoreV2(s => s.controller);
  const endCycle = useCycleStoreV2(s => s.endCycle);
  const meta = useGameStore(s => s.meta);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setHudTick] = useState(0);
  const [logEntries, setLogEntries] = useState<readonly SagaEvent[]>([]);
  const [speed, setSpeed] = useState<SpeedPreset>(1);
  const [chapterOverlay, setChapterOverlay] = useState<{ toChapter: string; atAge: number; key: number } | null>(null);
  const [lightFloaters, setLightFloaters] = useState<Array<{ key: number; amount: number }>>([]);
  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const setSceneSpeedRef = useRef<((m: number) => void) | null>(null);
  const endedRef = useRef(false);
  const chapterOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveMul = getMoveSpeedMul(meta);

  useEffect(() => {
    if (status !== 'running' || !controller || !containerRef.current) return;
    let destroy: (() => void) | null = null;
    endedRef.current = false;

    bootPhaser(
      containerRef.current,
      (event) => {
        if (event.type === 'arrived_at') {
          const evs = controller.handleArrival(event.landmarkKind, event.landmarkId);
          const { delta: rawDelta } = computeLightDelta(evs, event.landmarkKind);
          if (rawDelta > 0) {
            const rateMul = getLightRateMul(useGameStore.getState().meta);
            const finalDelta = rawDelta * rateMul;
            useGameStore.setState(s => ({
              ...s,
              meta: { ...s.meta, light: (s.meta.light ?? 0) + finalDelta },
            }));
            const floaterKey = Date.now() + Math.random();
            setLightFloaters(prev => [...prev, { key: floaterKey, amount: finalDelta }]);
            setTimeout(() => {
              setLightFloaters(prev => prev.filter(f => f.key !== floaterKey));
            }, 1500);
          }
          setHudTick(n => n + 1);
          setLogEntries(controller.getRecentSagaEvents(LOG_LIMIT));
          const transition = evs.find(e => e.type === 'chapter_transition');
          if (transition && transition.type === 'chapter_transition') {
            setChapterOverlay({ toChapter: transition.toChapter, atAge: transition.atAge, key: Date.now() });
            if (chapterOverlayTimerRef.current) clearTimeout(chapterOverlayTimerRef.current);
            chapterOverlayTimerRef.current = setTimeout(() => {
              setChapterOverlay(null);
              chapterOverlayTimerRef.current = null;
            }, 2000);
          }
        }
        if ((event.type === 'cycle_ended' || event.type === 'hero_died') && !endedRef.current) {
          endedRef.current = true;
          endCycle();
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
      speed * moveMul,
    ).then(g => {
      destroy = g.destroy;
      setSceneSpeedRef.current = g.setSpeed;
    });

    return () => {
      setSceneSpeedRef.current = null;
      if (chapterOverlayTimerRef.current) {
        clearTimeout(chapterOverlayTimerRef.current);
        chapterOverlayTimerRef.current = null;
      }
      destroy?.();
    };
    // `speed` is intentionally not a dep — mutations are forwarded to the
    // scene via the effect below without remounting the Phaser game.
  }, [status, controller, onCycleEnd, endCycle]);

  useEffect(() => {
    setSceneSpeedRef.current?.(speed * moveMul);
  }, [speed, moveMul]);

  if (status === 'idle' || !controller) {
    return <div style={{ padding: 24, color: '#eee' }}>사이클이 시작되지 않았습니다.</div>;
  }

  const hero = controller.getHero();

  return (
    <div data-testid="overworld-runner" style={{ position: 'relative' }}>
      <div data-testid="overworld-hud" style={hudStyle}>
        <span data-testid="hud-name">{hero.emoji} {hero.name}</span>
        <span data-testid="hud-age">{hero.age}세 · {hero.chapter}</span>
        <span>{hero.job} · LV {hero.level}</span>
        <span>HP {hero.hp}/{hero.hpMax}</span>
        <span data-testid="hud-light" style={{ position: 'relative' }}>
          빛 {Math.floor(meta.light ?? 0)}
          <span data-testid="light-floaters" style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 8, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {lightFloaters.map(f => (
              <span
                key={f.key}
                style={{
                  display: 'inline-block',
                  color: '#ffd54f',
                  fontWeight: 700,
                  animation: 'forgeLightFloat 1.5s ease-out forwards',
                  marginRight: 4,
                }}
              >
                +{f.amount.toFixed(1)}
              </span>
            ))}
          </span>
        </span>
        <span data-testid="hud-rejuvenation">재생 #{hero.rejuvenationCount}</span>
        <button
          type="button"
          onClick={() => setSpendModalOpen(true)}
          data-testid="open-spend-modal"
          style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12 }}
        >
          신의 메뉴
        </button>
        <span data-testid="speed-buttons" style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          {SPEED_PRESETS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              data-testid={`speed-${s}x`}
              data-active={speed === s ? 'true' : undefined}
              style={speedBtnStyle(speed === s)}
            >
              {s}×
            </button>
          ))}
        </span>
      </div>
      <div ref={containerRef} style={{ background: '#0a0e1a', display: 'flex', justifyContent: 'center', paddingTop: 8 }} />
      {spendModalOpen && <SpendModal onClose={() => setSpendModalOpen(false)} />}

      <style>{`
        @keyframes forgeChapterFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes forgeLightFloat {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
      `}</style>
      {chapterOverlay && (
        <div
          key={chapterOverlay.key}
          style={chapterOverlayStyle}
          data-testid="chapter-transition-overlay"
        >
          <div style={{ fontSize: 28, fontWeight: 700 }}>📖 {chapterOverlay.toChapter}</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{chapterOverlay.atAge}세</div>
        </div>
      )}

      <div data-testid="event-log" style={logPanelStyle}>
        <div style={logHeaderStyle}>최근 일대기</div>
        {logEntries.length === 0 ? (
          <div style={{ opacity: 0.4, fontSize: 12 }}>아직 사건이 없다.</div>
        ) : (
          [...logEntries].reverse().map((ev, i) => (
            <div key={`${logEntries.length - i}-${ev.age}`} style={logRowStyle(eventColor(ev.type))}>
              <span style={{ opacity: 0.6, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{ev.age}세</span>
              {ev.narrativeText}
            </div>
          ))
        )}
      </div>

      <button onClick={() => { endCycle(); onCycleEnd(); }} style={abandonBtnStyle}>
        포기 (cycle 종료)
      </button>
    </div>
  );
}

function eventColor(type: SagaEvent['type']): string {
  switch (type) {
    case 'battle':       return '#fca5a5';
    case 'levelUp':      return '#fde68a';
    case 'drop':         return '#a7f3d0';
    case 'jobUnlock':    return '#fbbf24';
    case 'skillLearned': return '#c4b5fd';
    case 'shrine':       return '#7dd3fc';
    case 'moralChoice':  return '#f0abfc';
    case 'death':        return '#f87171';
    default:             return '#cbd5e1';
  }
}

const hudStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '8px 16px',
  background: '#1f2937',
  color: '#cbd5e1',
  fontSize: 13,
  borderBottom: '1px solid #334155',
  flexWrap: 'wrap',
};

function speedBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 12,
    background: active ? '#fbbf24' : 'transparent',
    color: active ? '#0f172a' : '#cbd5e1',
    border: active ? '1px solid #fbbf24' : '1px solid #475569',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
  };
}

const logPanelStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '12px auto 0',
  padding: '10px 12px',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 6,
  color: '#cbd5e1',
  fontSize: 12,
  lineHeight: 1.7,
  maxHeight: 220,
  overflowY: 'auto',
};

const logHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  opacity: 0.5,
  marginBottom: 6,
};

const chapterOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20%',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '16px 24px',
  background: 'rgba(0,0,0,0.7)',
  color: '#ffd166',
  borderRadius: 8,
  pointerEvents: 'none',
  zIndex: 100,
  animation: 'forgeChapterFade 2s ease-in-out forwards',
  textAlign: 'center',
};

function logRowStyle(color: string): React.CSSProperties {
  return {
    color,
    paddingLeft: 8,
    borderLeft: `2px solid ${color}55`,
    marginBottom: 2,
  };
}

const abandonBtnStyle: React.CSSProperties = {
  margin: '12px auto',
  display: 'block',
  padding: '8px 16px',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};
