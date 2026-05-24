import { useCallback, useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useGameStore } from '../store/gameStore';
import { computeLightDelta } from '../overworld/lightEmit';
import { getLightRateMul, getMoveSpeedMul } from '../buff/buffEffects';
import { REALM_CATALOG } from '../data/realms';
import type { SagaEvent } from '../saga/SagaTypes';
import { SpendModal } from './SpendModal';
import { NpcEncounterModal } from './NpcEncounterModal';
import { SagaBookModal } from './SagaBookModal';
import { StatusModal } from './StatusModal';
import { seasonEmoji, seasonNameKR, seasonBonus } from '../season/SeasonState';

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
  currentSeason?: import('../types').SeasonId,
): Promise<{
  destroy: () => void;
  setSpeed: (m: number) => void;
  setUnlockedRealms: (r: readonly import('../types').RealmId[]) => void;
  setSeason: (s: import('../types').SeasonId) => void;
}> {
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
  game.scene.start('OverworldScene', { seed, hero, ai, onEvent, initialSpeed, currentRealm, unlockedRealms, currentSeason });
  const getScene = () => game.scene.getScene('OverworldScene') as InstanceType<typeof OverworldScene> | null;
  const setSpeed = (m: number) => {
    getScene()?.setSpeed(m);
  };
  const setUnlockedRealms = (r: readonly import('../types').RealmId[]) => {
    getScene()?.setUnlockedRealms(r);
  };
  const setSeason = (s: import('../types').SeasonId) => {
    getScene()?.setSeason(s);
  };
  return { destroy: () => game.destroy(true), setSpeed, setUnlockedRealms, setSeason };
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
  type LightFloat = { id: string; amount: number; createdAt: number };
  const FADE_MS = 1500;
  const MAX_FLOATS = 3;
  const [lightFloats, setLightFloats] = useState<LightFloat[]>([]);
  const [spendModalOpen, setSpendModalOpen] = useState(false);
  const [sagaModalOpen, setSagaModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [npcModal, setNpcModal] = useState<{ npcInstanceId: string } | null>(null);
  const setSceneSpeedRef = useRef<((m: number) => void) | null>(null);
  const setSceneUnlockedRealmsRef = useRef<((r: readonly import('../types').RealmId[]) => void) | null>(null);
  const setSceneSeasonRef = useRef<((s: import('../types').SeasonId) => void) | null>(null);
  const endedRef = useRef(false);
  const chapterOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realmOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRejuvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveMul = getMoveSpeedMul(meta);

  const emitLightFloat = useCallback((amount: number) => {
    setLightFloats(prev => {
      const next: LightFloat[] = [...prev, { id: `${Date.now()}-${Math.random()}`, amount, createdAt: Date.now() }];
      return next.slice(-MAX_FLOATS);
    });
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setLightFloats(prev => prev.filter(f => now - f.createdAt < FADE_MS));
    }, 500);
    return () => clearInterval(tick);
  }, []);

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
            const curMeta = useGameStore.getState().meta;
            // V3-H F6: spring bonus lightRateMul stacked on top of meta rateMul.
            const rateMul = getLightRateMul(curMeta) * seasonBonus(curMeta.season.current).lightRateMul;
            const finalDelta = rawDelta * rateMul;
            useGameStore.setState(s => ({
              ...s,
              meta: { ...s.meta, light: (s.meta.light ?? 0) + finalDelta },
            }));
            emitLightFloat(finalDelta);
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
          // V3-H F6: season changed → update scene bg tint. Store already updated by controller.
          const seasonChanged = evs.find(e => e.type === 'season_changed');
          if (seasonChanged && seasonChanged.type === 'season_changed') {
            setSceneSeasonRef.current?.(seasonChanged.season);
          }
          // V3-H E1 + B3: hero_died comes from handleArrival (EncounterEngine emits it).
          // It is NOT a top-level OverworldScene event — move detection here alongside
          // the other evs.find() checks so the auto-rejuv timer actually fires.
          const heroDied = evs.find(e => e.type === 'hero_died');
          if (heroDied && heroDied.type === 'hero_died') {
            // V3-H B3: 영웅은 불멸 — 사망 후 2초 극적 여운, 자동 5년 회춘.
            // 회춘은 빛 비용 없이 무료 (영원한 영웅 컨셉).
            // hero.staggered=true 이므로 다음 arrival 에서 HP 가 자동 회복됨.
            if (autoRejuvTimerRef.current) clearTimeout(autoRejuvTimerRef.current);
            autoRejuvTimerRef.current = setTimeout(() => {
              autoRejuvTimerRef.current = null;
              const ctrl = useCycleStoreV2.getState().controller;
              if (!ctrl) return;
              ctrl.getHero().rejuvenate(5);
              ctrl.recordRejuvenation(5);
            }, 2000);
          }
        }
        if (event.type === 'cycle_ended' && !endedRef.current) {
          endedRef.current = true;
          // V3-H B2: cycle ends naturally → clear hero snapshot so next visit spawns fresh hero.
          useGameStore.getState().clearHeroSnapshot();
          // Cycle-5 F3: forward optional cause (e.g. '무위') so the saga
          // records pathfinder-exhausted runs distinctly from '자연사'.
          endCycle(event.cause);
          onCycleEnd();
        }
      },
      controller.getHero(),
      controller.getDecisionAI(),
      controller.getSeed(),
      speed * moveMul,
      controller.getCurrentRealmId() ?? undefined,
      controller.getUnlockedRealms(),
      useGameStore.getState().meta.season.current,
    ).then(g => {
      destroy = g.destroy;
      setSceneSpeedRef.current = g.setSpeed;
      setSceneUnlockedRealmsRef.current = g.setUnlockedRealms;
      setSceneSeasonRef.current = g.setSeason;
    });

    return () => {
      setSceneSpeedRef.current = null;
      setSceneUnlockedRealmsRef.current = null;
      setSceneSeasonRef.current = null;
      if (chapterOverlayTimerRef.current) {
        clearTimeout(chapterOverlayTimerRef.current);
        chapterOverlayTimerRef.current = null;
      }
      if (realmOverlayTimerRef.current) {
        clearTimeout(realmOverlayTimerRef.current);
        realmOverlayTimerRef.current = null;
      }
      if (autoRejuvTimerRef.current) {
        clearTimeout(autoRejuvTimerRef.current);
        autoRejuvTimerRef.current = null;
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
        {/* Cycle 4 B1: 3-row chunk — 정체성 / 자원 / 액션. 모바일 word-break 방지. */}
        {/* Row 1: 정체성 — 이름 / 나이·시기 / 직업·LV / HP */}
        <div data-testid="hud-row-identity" style={hudRowStyle(13)}>
          <span data-testid="hud-name" style={hudChipStyle}>{hero.emoji} {hero.name}</span>
          <span data-testid="hud-age" style={hudChipStyle}>{hero.age}세 · {hero.chapter}</span>
          <span data-testid="hud-job-lv" style={hudChipStyle}>{hero.job} · LV {hero.level}</span>
          <span data-testid="hud-hp" style={hudChipStyle}>HP {hero.hp}/{hero.hpMax}</span>
        </div>
        {/* Row 2: 자원 — 빛 / 재생 / 계절 / 지역 */}
        <div data-testid="hud-row-resource" style={hudRowStyle(12)}>
          <span data-testid="hud-light" style={hudChipStyle}>빛 {Math.floor(meta.light ?? 0)}</span>
          <span data-testid="hud-rejuvenation" style={hudChipStyle}>재생 #{hero.rejuvenationCount}</span>
          <span data-testid="hud-season" style={hudChipStyle}>{seasonEmoji(meta.season.current)} {seasonNameKR(meta.season.current)}</span>
          <span data-testid="hud-realm" style={hudChipStyle}>
            {(() => {
              const r = REALM_CATALOG.find(rr => rr.id === run.currentRealmId);
              return `🌍 ${r?.nameKR ?? '?'} (${meta.unlockedRealms.length}/${REALM_CATALOG.length})`;
            })()}
          </span>
        </div>
        {/* Row 3: 액션 — 3 버튼 + 속도 프리셋. whiteSpace: nowrap 으로 future label 추가 시에도 word-break 방지. */}
        <div data-testid="hud-row-action" style={{ ...hudRowStyle(12), gap: 6 }}>
          <button
            type="button"
            onClick={() => setSpendModalOpen(true)}
            data-testid="open-spend-modal"
            style={hudActionBtnStyle}
          >
            신의 메뉴
          </button>
          <button
            type="button"
            onClick={() => setSagaModalOpen(true)}
            data-testid="open-saga-modal"
            style={hudActionBtnStyle}
          >
            📖 기록
          </button>
          <button
            type="button"
            data-testid="open-status-modal"
            onClick={() => setStatusModalOpen(true)}
            style={hudActionBtnStyle}
          >
            📊 상태
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
      </div>
      <div data-testid="light-floaters" style={{ position: 'absolute', right: 0, top: 60, pointerEvents: 'none', zIndex: 5 }}>
        {lightFloats.map((f, idx) => {
          const elapsed = Date.now() - f.createdAt;
          const opacity = Math.max(0, 1 - elapsed / FADE_MS);
          return (
            <div
              key={f.id}
              style={{
                position: 'absolute',
                right: 16 + idx * 4,
                top: idx * 18,
                color: '#ffd54f',
                fontSize: 14,
                fontWeight: 700,
                opacity,
                transition: 'opacity 0.3s',
              }}
            >
              +{f.amount.toFixed(1)}
            </div>
          );
        })}
      </div>
      <div ref={containerRef} style={{ background: '#0a0e1a', display: 'flex', justifyContent: 'center', paddingTop: 8 }} />
      {spendModalOpen && <SpendModal onClose={() => setSpendModalOpen(false)} />}
      {npcModal && <NpcEncounterModal npcInstanceId={npcModal.npcInstanceId} onClose={() => setNpcModal(null)} />}
      {sagaModalOpen && <SagaBookModal onClose={() => setSagaModalOpen(false)} />}
      {statusModalOpen && <StatusModal onClose={() => setStatusModalOpen(false)} />}

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
  flexDirection: 'column',
  gap: 6,
  padding: '8px 16px',
  background: '#1f2937',
  color: '#cbd5e1',
  fontSize: 13,
  borderBottom: '1px solid #334155',
  position: 'relative',
  zIndex: 10,
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
    whiteSpace: 'nowrap',
  };
}

/** Cycle 4 B1: HUD row 공통 스타일. flex + wrap + gap. fontSize 만 row 별 override. */
function hudRowStyle(fontSize: number): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize,
    flexWrap: 'wrap',
    width: '100%',
  };
}

/** Cycle 4 B1: HUD chip 공통 — word-break 방지. */
const hudChipStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
};

/** Cycle 4 B1: action 버튼 공통 — 44px 터치 타겟 (4a Mobile UX) + nowrap. */
const hudActionBtnStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '4px 10px',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

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
