import * as React from 'react';
import { useGameStore } from '../store/gameStore';
import { RELICS, ALL_RELIC_IDS, getEffectiveStack } from '../data/relics';
import { MYTHICS } from '../data/mythics';
import { COMPASS_ITEMS, ALL_COMPASS_IDS } from '../data/compass';
import { getDungeonById } from '../data/dungeons';
import { isAtCap } from '../systems/relics';
import { canWatchAd, AD_COOLDOWN_MS, AD_DAILY_CAP } from '../systems/ads';
import type { RelicId } from '../types';

export default function Relics() {
  const meta = useGameStore((s) => s.meta);
  const watchAdForRelic = useGameStore((s) => s.watchAdForRelic);
  const [tab, setTab] = React.useState<'stack' | 'mythic' | 'compass'>('stack');
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
        <button
          onClick={() => setTab('compass')}
          data-testid="relics-tab-compass"
          style={{ background: tab === 'compass' ? 'var(--forge-accent)' : 'var(--forge-panel)' }}
        >
          🧭 나침반
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
      {tab === 'mythic' && <MythicTab />}
      {tab === 'compass' && <CompassTab />}
      {adRunning && <AdWatchModal relicId={adRunning} />}
    </div>
  );
}

function CompassTab() {
  const meta = useGameStore((s) => s.meta);
  return (
    <div data-testid="compass-tab">
      <p style={{ fontSize: 'var(--forge-font-sm)', marginBottom: 12, color: 'var(--forge-text-secondary)' }}>
        mini-boss / major-boss 첫 처치 시 획득. 던전 추첨 가중치 ×3 또는 자유 선택 부여.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {ALL_COMPASS_IDS.map((id) => {
          const def = COMPASS_ITEMS[id];
          const owned = meta.compassOwned[id];
          const hint =
            id === 'omni'
              ? '모든 던전 mini-boss 첫 처치 시 자동 부여'
              : def.tier === 1
                ? `${getDungeonById(def.dungeonId!)?.nameKR ?? def.dungeonId} 던전 floor 5 mini-boss 첫 처치`
                : `${getDungeonById(def.dungeonId!)?.nameKR ?? def.dungeonId} 던전 floor 10 major-boss 첫 처치`;
          return (
            <div
              key={id}
              data-testid={`compass-row-${id}`}
              style={{
                padding: 12,
                border: '1px solid var(--forge-border)',
                borderRadius: 8,
                opacity: owned ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.5rem' }}>{def.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{def.nameKR}</div>
                  <div style={{ fontSize: 'var(--forge-font-sm)', color: 'var(--forge-text-secondary)' }}>
                    {def.descriptionKR}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 'var(--forge-font-sm)' }}>
                  {owned ? '✓ 보유' : '미보유'}
                </div>
              </div>
              {!owned && (
                <div style={{ fontSize: 'var(--forge-font-xs)', marginTop: 6, color: 'var(--forge-text-secondary)' }}>
                  {hint}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MythicTab() {
  const meta = useGameStore((s) => s.meta);
  const equipMythicAction = useGameStore((s) => s.equipMythicAction);
  const unequipMythicAction = useGameStore((s) => s.unequipMythicAction);

  return (
    <>
      <div data-testid="mythic-slot-info">슬롯 ({meta.mythicSlotCap}/5)</div>
      <div data-testid="mythic-slot-grid" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const id = meta.mythicEquipped[i];
          const locked = i >= meta.mythicSlotCap;
          if (locked) {
            return (
              <div key={i} data-testid={`mythic-slot-${i}-locked`}
                style={{ width: 58, height: 58, border: '1px dashed', display: 'grid', placeItems: 'center' }}>
                🔒
              </div>
            );
          }
          if (id) {
            const def = MYTHICS[id];
            return (
              <div key={i} data-testid={`mythic-slot-${i}-equipped`}
                onClick={() => unequipMythicAction(i)}
                style={{ width: 58, height: 58, border: '1px solid var(--forge-accent)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                {def.emoji}
              </div>
            );
          }
          return (
            <div key={i} data-testid={`mythic-slot-${i}-empty`}
              style={{ width: 58, height: 58, border: '1px dashed' }} />
          );
        })}
      </div>
      <div data-testid="mythic-owned-count">보유 ({meta.mythicOwned.length}/30)</div>
      <div data-testid="mythic-owned-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {meta.mythicOwned.map((id) => {
          const def = MYTHICS[id];
          const equipped = meta.mythicEquipped.includes(id);
          return (
            <div key={id} data-testid={`mythic-card-${id}`}
              style={{ padding: 8, border: '1px solid', opacity: equipped ? 0.5 : 1 }}>
              <div>{def.emoji} {def.nameKR}</div>
              <div style={{ fontSize: 11 }}>{def.descriptionKR}</div>
              {!equipped && (
                <button
                  data-testid={`mythic-equip-btn-${id}`}
                  onClick={() => {
                    const firstEmpty = meta.mythicEquipped.findIndex((slot, i) => slot === null && i < meta.mythicSlotCap);
                    if (firstEmpty >= 0) equipMythicAction(firstEmpty, id);
                  }}>
                  장착
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
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
