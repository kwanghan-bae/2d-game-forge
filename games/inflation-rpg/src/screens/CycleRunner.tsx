import { useEffect, useRef, useState } from 'react';
import { useCycleStore } from '../cycle/cycleSlice';
import type { CycleEvent } from '../cycle/cycleEvents';

const TICK_MS = 100;
const LOG_KEEP_LAST = 50;

interface Props {
  onCycleEnd: () => void;
}

export function CycleRunner({ onCycleEnd }: Props) {
  const { status, controller, endOnBpExhausted } = useCycleStore();
  const [tick, setTick] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (status !== 'running' || !controller) return;
    endedRef.current = false;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      if (delta >= TICK_MS) {
        controller.tick(delta);
        lastTimeRef.current = now;
        setTick(t => t + 1);
        if (controller.getState().ended && !endedRef.current) {
          endedRef.current = true;
          endOnBpExhausted();
          onCycleEnd();
          return;
        }
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [status, controller, onCycleEnd, endOnBpExhausted]);

  if (status === 'idle' || !controller) {
    return <div>사이클이 시작되지 않았습니다.</div>;
  }

  const state = controller.getState();
  const events = controller.getEvents();
  const recent = events.slice(-LOG_KEEP_LAST);

  return (
    <div data-testid="cycle-runner" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div data-testid="hud-level">LV {state.heroLv}</div>
        <div data-testid="hud-hp">HP {state.heroHp} / {state.heroHpMax}</div>
        <div data-testid="hud-bp">BP {state.bp} / {state.bpMax}</div>
        <div data-testid="hud-kills">처치 {state.cumKills}</div>
        <div data-testid="hud-gold">골드 {state.cumGold}</div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
        {recent.map((e, i) => (
          <div key={`${e.t}_${i}`}>{formatEvent(e)}</div>
        ))}
      </div>
    </div>
  );
}

function formatEvent(e: CycleEvent): string {
  const ts = `[${e.t.toString().padStart(6, '0')}ms]`;
  switch (e.type) {
    case 'cycle_start': return `${ts} cycle 시작 (캐릭터 ${e.characterId} seed ${e.seed})`;
    case 'battle_start': return `${ts} ⚔️ 전투 시작 — ${e.enemyId} (HP ${e.enemyHp})`;
    case 'hero_hit': return `${ts}   → ${e.damage} 데미지 (적 HP ${e.remaining})`;
    case 'enemy_hit': return `${ts}   ← ${e.damage} 데미지 (내 HP ${e.remaining})`;
    case 'enemy_kill': return `${ts} 💀 처치 — EXP +${e.expGain} / 골드 +${e.goldGain}`;
    case 'level_up': return `${ts} ⭐ 레벨업 ${e.from} → ${e.to}`;
    case 'bp_change': return `${ts} 🟦 BP ${e.delta > 0 ? '+' : ''}${e.delta} → ${e.remaining}`;
    case 'cycle_end': return `${ts} 🏁 cycle 종료 — ${e.reason} / 최대 lv ${e.maxLevel}`;
    default: return `${ts} ${(e as { type: string }).type}`;
  }
}
