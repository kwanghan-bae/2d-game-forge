import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { JP_PERKS, canPurchasePerk, purchasePerk, type JpPerkId, type JpPerkDef } from '../systems/jpPerks';
import { getPerkUnlockReaction } from '../data/characterReactions';

interface Props {
  onBack: () => void;
}

export function PerkShopScreen({ onBack }: Props) {
  const charId = useGameStore(s => s.run.characterId);
  const jp = useGameStore(s => s.meta.jp?.[charId] ?? 0);
  const ownedPerks = useGameStore(s => (s.meta.jpPerksOwned?.[charId] ?? []) as JpPerkId[]);
  const [buying, setBuying] = useState<JpPerkId | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);

  const handleBuy = (perkId: JpPerkId) => {
    const result = purchasePerk(perkId, ownedPerks, jp);
    if (!result) return;
    useGameStore.setState(s => ({
      meta: {
        ...s.meta,
        jp: { ...s.meta.jp, [charId]: result.newJp },
        jpPerksOwned: { ...s.meta.jpPerksOwned, [charId]: result.newOwned },
      },
    }));
    setBuying(null);
    const quote = getPerkUnlockReaction(charId, perkId);
    if (quote) setReaction(quote);
  };

  const tier1Perks = JP_PERKS.filter(p => (p.tier ?? 1) === 1);
  const tier2Perks = JP_PERKS.filter(p => p.tier === 2);

  const renderPerkGrid = (perks: JpPerkDef[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {perks.map((perk: JpPerkDef) => {
        const owned = ownedPerks.includes(perk.id);
        const { canBuy, reason } = canPurchasePerk(perk.id, ownedPerks, jp);
        const locked = reason === 'missing_prerequisite';
        const reqName = perk.requires ? JP_PERKS.find(p => p.id === perk.requires)?.name : undefined;

        return (
          <div
            key={perk.id}
            data-testid={`perk-node-${perk.id}`}
            style={{
              ...perkCardStyle,
              border: owned
                ? '2px solid #22c55e'
                : locked
                ? '1px solid #374151'
                : perk.tier === 2
                ? '1px solid #f59e0b'
                : '1px solid #6366f1',
              opacity: locked ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{perk.name}</div>
              {locked && <span style={{ fontSize: 11 }}>🔒</span>}
              {owned && <span style={{ fontSize: 11, color: '#22c55e' }}>✓</span>}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{perk.description}</div>
            <div
              style={{
                fontSize: 11,
                marginTop: 6,
                color: owned ? '#22c55e' : jp < perk.cost ? '#ef4444' : '#a5b4fc',
              }}
            >
              {owned ? '보유 완료' : `${perk.cost} JP`}
            </div>
            {locked && reqName && (
              <div
                data-testid={`perk-req-${perk.id}`}
                style={{ fontSize: 10, color: '#f97316', marginTop: 4, background: 'rgba(249, 115, 22, 0.1)', padding: '2px 4px', borderRadius: 4 }}
              >
                필요: {reqName}
              </div>
            )}
            {!owned && canBuy && !buying && (
              <button
                type="button"
                data-testid={`btn-buy-${perk.id}`}
                onClick={() => setBuying(perk.id)}
                style={buyBtnStyle}
              >
                구매
              </button>
            )}
            {buying === perk.id && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  data-testid={`btn-confirm-${perk.id}`}
                  onClick={() => handleBuy(perk.id)}
                  style={{ ...buyBtnStyle, background: '#22c55e' }}
                >
                  확인
                </button>
                <button
                  type="button"
                  onClick={() => setBuying(null)}
                  style={{ ...buyBtnStyle, background: '#6b7280' }}
                >
                  취소
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div data-testid="perk-shop" style={{ padding: 24, color: '#eee', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>⚡ 퍽 상점</h2>
        <button type="button" data-testid="btn-perk-back" onClick={onBack} style={backBtnStyle}>← 돌아가기</button>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14 }}>
        JP 잔고: <span data-testid="perk-jp-balance" style={{ color: '#fbbf24', fontWeight: 'bold' }}>{jp}</span>
      </div>

      {reaction && (
        <div data-testid="perk-reaction-quote" style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 6,
          color: '#fef08a',
          fontSize: 12,
          fontStyle: 'italic',
        }}>
          💬 "{reaction}"
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <h3 data-testid="section-tier-1" style={{ fontSize: 14, color: '#818cf8', marginBottom: 8 }}>🌱 Tier 1 — 기본 퍽</h3>
        {renderPerkGrid(tier1Perks)}
      </section>

      <section style={{ marginBottom: 16 }}>
        <h3 data-testid="section-tier-2" style={{ fontSize: 14, color: '#f59e0b', marginBottom: 4 }}>⭐ Tier 2 — 심화 퍽</h3>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>선행 퍽을 보유하면 해금되는 강력한 특화 퍽입니다.</div>
        {renderPerkGrid(tier2Perks)}
      </section>
    </div>
  );
}

const perkCardStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  background: '#0f172a',
};
const buyBtnStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '4px 12px',
  fontSize: 11,
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const backBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
};
