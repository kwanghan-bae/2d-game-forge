/**
 * Cycle 106 F2 — Inflation Milestone VFX overlay component.
 *
 * F1 의 `inflation_milestone` 이벤트 → store 큐 → 이 컴포넌트가 head 를 render.
 * 8 tier preset (color/size/duration/shake/sfx) 은 `data/milestones.ts` 참조.
 *
 * 동작:
 *  - 마운트 즉시 시각 + 사운드 + screen-shake + aria-live 알림.
 *  - `durationMs` 후 self-unmount via onDone callback.
 *  - reduced-motion 시 shake 비활성, flash 단축.
 *  - sound 파일 누락 시 silent fallback (playSfx 가 이미 처리).
 *  - z-index 9999, pointer-events none → modal 위에 떠도 interaction 차단 안 함.
 *
 * 마운트 위치 = `<OverworldRunner>` 내부 (cycle 진행 중에만 emit).
 */

import { useEffect, useRef, useState } from 'react';
import { presetForTier, type MilestoneTier } from '../data/milestones';
import { playSfx } from '../systems/sound';

export interface InflationMilestoneVFXProps {
  tier: MilestoneTier;
  thresholdLv: number;
  /** 마운트 시 호출되어 사운드/타이머 시작. */
  onDone?: () => void;
}

/** Detect prefers-reduced-motion at render time. Stable across the component
 *  lifecycle (we don't subscribe to changes during a single VFX flash). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function InflationMilestoneVFX({ tier, thresholdLv, onDone }: InflationMilestoneVFXProps): React.JSX.Element {
  const preset = presetForTier(tier);
  const reduced = prefersReducedMotion();
  const durationMs = reduced ? 200 : preset.durationMs;
  const shakeAmplitude = reduced ? 0 : preset.shakeAmplitude;
  const [active, setActive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sound — silent fallback in playSfx handles missing .ogg files.
    try {
      playSfx(preset.sfxId);
    } catch {
      /* silent fallback per PRD §F2 §반대 기준 */
    }

    timerRef.current = setTimeout(() => {
      setActive(false);
      timerRef.current = null;
      if (onDone) onDone();
    }, durationMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // Intentionally one-shot — preset/duration captured at mount.
  }, []);

  if (!active) return <></>;

  const flashColorVar = `var(${preset.cssVarName})`;
  const shakeKeyframes = `milestone-shake-${tier}`;

  return (
    <>
      {/* Per-instance keyframes injected inline. translate amplitude varies per tier. */}
      <style>{`
        @keyframes ${shakeKeyframes} {
          0%   { transform: translate(-50%, -50%) translate(0, 0); }
          15%  { transform: translate(-50%, -50%) translate(-${shakeAmplitude}px, ${shakeAmplitude / 2}px); }
          30%  { transform: translate(-50%, -50%) translate(${shakeAmplitude}px, -${shakeAmplitude / 2}px); }
          45%  { transform: translate(-50%, -50%) translate(-${shakeAmplitude / 2}px, ${shakeAmplitude}px); }
          60%  { transform: translate(-50%, -50%) translate(${shakeAmplitude / 2}px, -${shakeAmplitude}px); }
          75%  { transform: translate(-50%, -50%) translate(-${shakeAmplitude}px, 0); }
          100% { transform: translate(-50%, -50%) translate(0, 0); }
        }
        @keyframes milestone-flash-${tier} {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(${reduced ? 0.7 : 1.0}); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(${reduced ? 0.7 : 1.2}); }
        }
        @media (prefers-reduced-motion: reduce) {
          .milestone-vfx-shake-host { animation: none !important; transform: translate(-50%, -50%) !important; }
        }
      `}</style>

      {/* Central radial flash. position: fixed + viewport center. */}
      <div
        data-testid="inflation-milestone-vfx"
        data-tier={tier}
        data-threshold-lv={thresholdLv}
        className="milestone-vfx-shake-host"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: preset.size,
          height: preset.size,
          maxWidth: `calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))`,
          maxHeight: `calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`,
          background: `radial-gradient(circle, ${flashColorVar}, transparent 70%)`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          animation: reduced
            ? `milestone-flash-${tier} ${durationMs}ms ease-out forwards`
            : `milestone-flash-${tier} ${durationMs}ms ease-out forwards, ${shakeKeyframes} ${Math.min(durationMs, 600)}ms ease-in-out`,
          // Tier 8 rainbow accent — additional inner glow.
          boxShadow: tier === 8
            ? `0 0 80px 20px ${flashColorVar}, 0 0 160px 40px var(--color-milestone-tier-3), 0 0 240px 60px var(--color-milestone-tier-5)`
            : `0 0 40px 8px ${flashColorVar}`,
        }}
      />

      {/* aria-live announcement — visually hidden, screen-reader only. */}
      <div
        role="status"
        aria-live="polite"
        data-testid="inflation-milestone-announcement"
        style={{
          position: 'fixed',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
          zIndex: 99999,
        }}
      >
        레벨 {thresholdLv.toLocaleString('ko-KR')} 돌파
      </div>
    </>
  );
}
