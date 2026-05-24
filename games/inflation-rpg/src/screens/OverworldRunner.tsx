import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useGameStore } from '../store/gameStore';
import { computeLightDelta } from '../overworld/lightEmit';
import { getLightRateMul, getMoveSpeedMul } from '../buff/buffEffects';
import { REALM_CATALOG } from '../data/realms';
import type { SagaEvent } from '../saga/SagaTypes';
import { SpendModal } from './SpendModal';
import { NpcEncounterModal } from './NpcEncounterModal';
import { SagaBookModal } from './SagaBookModal';

interface Props {
  onCycleEnd: () => void;
  /** V3-H: 자동 저장 후 메인 메뉴로 복귀. cycle 상태는 유지된다. */
  onExitToMenu?: () => void;
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
  currentRealm?: import('../types').RealmId,
  unlockedRealms?: readonly import('../types').RealmId[],
): Promise<{ destroy: () => void; setSpeed: (m: number) => void; setUnlockedRealms: (r: readonly import('../types').RealmId[]) => void }> {
  const [Phaser, { OverworldScene, GRID_H }] = await Promise.all([
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
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent, initialSpeed, currentRealm, unlockedRealms });
  const getScene = () => game.scene.getScene('OverworldScene') as InstanceType<typeof OverworldScene> | null;
  const setSpeed = (m: number) => {
    getScene()?.setSpeed(m);
  };
  const setUnlockedRealms = (r: readonly import('../types').RealmId[]) => {
    getScene()?.setUnlockedRealms(r);
  };
  return { destroy: () => game.destroy(true), setSpeed, setUnlockedRealms };
}

const SPEED_PRESETS = [1, 2, 5, 10] as const;
type SpeedPreset = (typeof SPEED_PRESETS)[number];

export function OverworldRunner({ onCycleEnd, onExitToMenu }: Props) {
  const status = useCycleStoreV2(s => s.status);
  const controller = useCycleStoreV2(s => s.controller);
  const endCycle = useCycleStoreV2(s => s.endCycle);
  const startCycle = useCycleStoreV2(s => s.start);
  const meta = useGameStore(s => s.meta);
  const run = useGameStore(s => s.run);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setHudTick] = useState(0);
  const [logEntries, setLogEntries] = useState<readonly SagaEvent[]>([]);
  const [speed, setSpeed] = useState<SpeedPreset>(1);
  const [chapterOverlay, setChapterOverlay] = useState<{ toChapter: string; atAge: number; key: number } | null>(null);
  const [realmOverlay, setRealmOverlay] = useState<{ realmId: import('../types').RealmId; key: number } | null>(null);
  const [lightFloaters, setLightFloaters] = useState<Array<{ key: number; amount: number }>>([]);
  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const [sagaModalOpen, setSagaModalOpen] = useState(false);
  const [npcModal, setNpcModal] = useState<{ npcInstanceId: string } | null>(null);
  const setSceneSpeedRef = useRef<((m: number) => void) | null>(null);
  const setSceneUnlockedRealmsRef = useRef<((r: readonly import('../types').RealmId[]) => void) | null>(null);
  const endedRef = useRef(false);
  const chapterOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realmOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveMul = getMoveSpeedMul(meta);

  // V3-H B2: auto-start cycle on mount if no cycle is active.
  // If run.heroSnapshot exists the cycle controller will restore the hero from it
  // (same age/level/saga context). Otherwise a fresh hero is created as usual.
  useEffect(() => {
    const cycleState = useCycleStoreV2.getState();
    if (cycleState.status === 'idle' || cycleState.controller === null) {
      const atkBaseBonus = useGameStore.getState().meta.atkBaseBonus ?? 0;
      const hpBaseBonus = useGameStore.getState().meta.hpBaseBonus ?? 0;
      startCycle({
        seed: Date.now() & 0xffffffff,
        traits: [],
        heroHpMax: 100 + hpBaseBonus,
        heroAtkBase: 50 + atkBaseBonus,
        // heroSnapshot is picked up automatically from run.heroSnapshot inside cycleSliceV2.start
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const npcEncounter = evs.find(e => e.type === 'npc_encounter');
          if (npcEncounter && npcEncounter.type === 'npc_encounter') {
            setNpcModal({ npcInstanceId: npcEncounter.npcInstanceId });
          }
          const realmEntered = evs.find(e => e.type === 'realm_entered');
          if (realmEntered && realmEntered.type === 'realm_entered') {
            useGameStore.getState().setCurrentRealm(realmEntered.realmId);
            setRealmOverlay({ realmId: realmEntered.realmId, key: Date.now() });
            if (realmOverlayTimerRef.current) clearTimeout(realmOverlayTimerRef.current);
            realmOverlayTimerRef.current = setTimeout(() => {
              setRealmOverlay(null);
              realmOverlayTimerRef.current = null;
            }, 2000);
          }
          // V3-H Bug A: sync OverworldScene's stale unlockedRealms copy after a
          // realm_unlocked event so DestinationResolver.choose sees the new exit landmark.
          const realmUnlocked = evs.find(e => e.type === 'realm_unlocked');
          if (realmUnlocked && realmUnlocked.type === 'realm_unlocked') {
            setSceneUnlockedRealmsRef.current?.(controller.getUnlockedRealms());
          }
        }
        if ((event.type === 'cycle_ended' || event.type === 'hero_died') && !endedRef.current) {
          endedRef.current = true;
          // V3-H B2: cycle ends naturally → clear hero snapshot so next visit spawns fresh hero.
          useGameStore.getState().clearHeroSnapshot();
          endCycle();
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
      speed * moveMul,
      controller.getCurrentRealmId() ?? undefined,
      controller.getUnlockedRealms(),
    ).then(g => {
      destroy = g.destroy;
      setSceneSpeedRef.current = g.setSpeed;
      setSceneUnlockedRealmsRef.current = g.setUnlockedRealms;
    });

    return () => {
      setSceneSpeedRef.current = null;
      setSceneUnlockedRealmsRef.current = null;
      if (chapterOverlayTimerRef.current) {
        clearTimeout(chapterOverlayTimerRef.current);
        chapterOverlayTimerRef.current = null;
      }
      if (realmOverlayTimerRef.current) {
        clearTimeout(realmOverlayTimerRef.current);
        realmOverlayTimerRef.current = null;
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
        <button type="button" onClick={() => setSagaModalOpen(true)} data-testid="open-saga-modal" style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12 }}>📖 기록</button>
        <span data-testid="hud-realm" style={{ marginLeft: 8 }}>
          {(() => {
            const r = REALM_CATALOG.find(rr => rr.id === run.currentRealmId);
            return `🌍 ${r?.nameKR ?? '?'} (${meta.unlockedRealms.length}/${REALM_CATALOG.length})`;
          })()}
        </span>
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
      {npcModal && <NpcEncounterModal npcInstanceId={npcModal.npcInstanceId} onClose={() => setNpcModal(null)} />}
      {sagaModalOpen && <SagaBookModal onClose={() => setSagaModalOpen(false)} />}

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
      {realmOverlay && (
        <div
          key={realmOverlay.key}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffd54f',
            fontSize: 24,
            fontWeight: 700,
            background: 'rgba(0,0,0,0.7)',
            padding: '12px 24px',
            borderRadius: 8,
            animation: 'forgeChapterFade 2s ease-in-out forwards',
            pointerEvents: 'none',
            zIndex: 50,
          }}
          data-testid="realm-entered-overlay"
        >
          다음 영역: {(() => {
            const r = REALM_CATALOG.find(rr => rr.id === realmOverlay.realmId);
            return r?.nameKR ?? realmOverlay.realmId;
          })()}
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

      <button
        type="button"
        data-testid="open-main-menu"
        onClick={() => {
          // V3-H B2: 자동 저장 — controller 의 현재 hero snapshot 을 run 에 persist.
          const ctrl = useCycleStoreV2.getState().controller;
          if (ctrl) {
            const heroSnap = ctrl.getHero().serialize(ctrl.getSeed());
            useGameStore.getState().saveHeroSnapshot(heroSnap);
          }
          if (onExitToMenu) {
            onExitToMenu();
          } else {
            window.history.back();
          }
        }}
        style={mainMenuBtnStyle}
      >
        메인 메뉴
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

const mainMenuBtnStyle: React.CSSProperties = {
  margin: '12px auto',
  display: 'block',
  minHeight: 44,
  padding: '8px 16px',
  background: '#3b4252',
  color: '#eee',
  border: '1px solid #555',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
