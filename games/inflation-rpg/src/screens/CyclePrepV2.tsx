import { useMemo, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { HeroSpawner } from '../hero/HeroSpawner';
import { SeededRng } from '../cycle/SeededRng';
import { useGameStore } from '../store/gameStore';
import { DIRECTIVE_INFO, type DirectiveInfo } from '../systems/sponsorDirective';
import type { SponsorDirective } from '../types';

interface Props {
  onStart: () => void;
  onCancel: () => void;
  /** V3-H B2: clear persisted hero snapshot before starting a new cycle. */
  onClearSnapshot?: () => void;
}

export function CyclePrepV2({ onStart, onCancel, onClearSnapshot }: Props) {
  const startCycle = useCycleStoreV2(s => s.start);
  const atkBaseBonus = useGameStore(s => s.meta.atkBaseBonus ?? 0);
  const hpBaseBonus = useGameStore(s => s.meta.hpBaseBonus ?? 0);
  const sponsorGold = useGameStore(s => s.meta.sponsorGold ?? 0);
  const [selectedDirective, setSelectedDirective] = useState<SponsorDirective | null>(null);

  // Preview today's hero with deterministic seed-of-the-moment
  const previewSeed = useMemo(() => Date.now() & 0xffffffff, []);
  const preview = useMemo(() => HeroSpawner.spawn(new SeededRng(previewSeed)), [previewSeed]);

  const handleStart = () => {
    // V3-H B2: clear any persisted snapshot so fresh hero spawns (not resume).
    onClearSnapshot?.();
    // C1008: save directive to run state before starting
    useGameStore.setState(s => ({ run: { ...s.run, directive: selectedDirective } }));
    startCycle({
      seed: previewSeed,
      traits: [],
      heroHpMax: 100 + hpBaseBonus,
      heroAtkBase: 50 + atkBaseBonus,
      heroSnapshot: null,  // explicit null overrides run.heroSnapshot in cycleSliceV2.start
      pauseOnInteractiveChoice: true,
    });
    onStart();
  };

  return (
    <div data-testid="cycle-prep-v2" style={{ padding: 24, color: '#eee', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>오늘 등장한 영혼</h2>
      <p style={{ opacity: 0.7, marginBottom: 24, fontSize: 13 }}>
        신이여, 이 영혼을 후원하소서. 그의 일대기가 시작된다.
      </p>

      <div style={{ background: '#111827', padding: 20, borderRadius: 8, maxWidth: 320, margin: '0 auto', border: '1px solid #1f2937' }}>
        <div style={{ fontSize: 48 }}>{preview.emoji}</div>
        <div data-testid="spawned-hero-name" style={{ marginTop: 8, fontSize: 18, fontWeight: 'bold' }}>
          {preview.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
          {preview.age}세 · {preview.job} · LV {preview.level}
        </div>
      </div>

      {/* C1010: Sponsor Directive selection */}
      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8, opacity: 0.8 }}>후원 교서 (선택)</h3>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {DIRECTIVE_INFO.map((d: DirectiveInfo) => (
            <button
              key={d.id}
              type="button"
              data-testid={`directive-${d.id}`}
              onClick={() => setSelectedDirective(selectedDirective === d.id ? null : d.id)}
              style={{
                ...directiveCardStyle,
                border: selectedDirective === d.id ? '2px solid #fbbf24' : '1px solid #374151',
                background: selectedDirective === d.id ? '#1e293b' : '#0f172a',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{d.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{d.description}</div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>⚠ {d.tradeoff}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <button type="button" data-testid="btn-prep-start" onClick={handleStart} style={primaryBtnStyle}>
          후원하기
        </button>
        <button type="button" data-testid="btn-prep-cancel" onClick={onCancel} style={ghostBtnStyle}>
          돌아가기
        </button>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, opacity: 0.7 }}>
        <div>신의 후원금: {sponsorGold.toLocaleString()} (사이클 종료 시 자동 후원)</div>
        <div>영구 보너스: ATK +{atkBaseBonus} / HP +{hpBaseBonus}</div>
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  background: '#fbbf24',
  color: '#0f172a',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 'bold',
};
const ghostBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  background: 'transparent',
  color: '#cbd5e1',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
};
const directiveCardStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  textAlign: 'left',
  maxWidth: 140,
  color: '#e2e8f0',
};
