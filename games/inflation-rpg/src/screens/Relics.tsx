import * as React from 'react';
import { useGameStore } from '../store/gameStore';
import { RELICS, ALL_RELIC_IDS, getEffectiveStack } from '../data/relics';
import { isAtCap } from '../systems/relics';
import { canWatchAd, AD_COOLDOWN_MS, AD_DAILY_CAP } from '../systems/ads';
import type { RelicId } from '../types';

export default function Relics() {
  const meta = useGameStore((s) => s.meta);
  const watchAdForRelic = useGameStore((s) => s.watchAdForRelic);
  const [tab, setTab] = React.useState<'stack' | 'mythic'>('stack');
  const [adRunning, setAdRunning] = React.useState<RelicId | null>(null);

  const onWatchAd = (relicId: RelicId) => {
    const now = Date.now();
    if (!canWatchAd(meta, now).ok) return;
    setAdRunning(relicId);
    setTimeout(() => {
      watchAdForRelic(relicId);
      setAdRunning(null);
    }, AD_COOLDOWN_MS);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>보물고</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setTab('stack')}
          style={{ background: tab === 'stack' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}>
          스택 유물
        </button>
        <button
          onClick={() => setTab('mythic')}
          style={{ background: tab === 'mythic' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}>
          Mythic
        </button>
      </div>
      {tab === 'stack' && (
        <>
          <div data-testid="ad-counter">광고 시청 (오늘 {meta.adsToday}/{AD_DAILY_CAP})</div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {ALL_RELIC_IDS.map((id) => {
              const def = RELICS[id];
              const stack = meta.relicStacks[id];
              const eff = getEffectiveStack(id, stack);
              const atCap = isAtCap(meta, id);
              const dailyCapReached = meta.adsToday >= AD_DAILY_CAP;
              const disabled = atCap || dailyCapReached || adRunning !== null;
              return (
                <div key={id} data-testid="relic-row" style={{ padding: 12, border: '1px solid var(--forge-border)', borderRadius: 8 }}>
                  <div>{def.emoji} {def.nameKR}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{def.descriptionKR}</div>
                  <div>현재: {eff} stack{atCap ? ' (MAX)' : ''}</div>
                  <button disabled={disabled} onClick={() => onWatchAd(id)}>
                    {adRunning === id ? '광고 시청 중…' : '광고 보기'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      {tab === 'mythic' && <div data-testid="mythic-tab-placeholder">Mythic (Task 21)</div>}
      {adRunning && <AdWatchModal relicId={adRunning} />}
    </div>
  );
}

function AdWatchModal({ relicId }: { relicId: RelicId }) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / AD_COOLDOWN_MS);
      setProgress(p);
      if (p >= 1) clearInterval(tick);
    }, 100);
    return () => clearInterval(tick);
  }, []);
  const def = RELICS[relicId];
  return (
    <div data-testid="ad-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: 'var(--forge-panel)', padding: 24, borderRadius: 12 }}>
        <div>광고 시청 중…</div>
        <div style={{ width: 240, height: 8, background: 'var(--forge-border)', marginTop: 12 }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--forge-accent)' }} />
        </div>
        <div style={{ marginTop: 12 }}>{def.emoji} {def.nameKR} +1 stack</div>
      </div>
    </div>
  );
}
