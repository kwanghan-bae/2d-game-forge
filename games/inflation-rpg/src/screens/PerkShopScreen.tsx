import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { JP_PERKS, canPurchasePerk, purchasePerk, type JpPerkId, type JpPerkDef } from '../systems/jpPerks';

interface Props {
  onBack: () => void;
}

export function PerkShopScreen({ onBack }: Props) {
  const charId = useGameStore(s => s.run.characterId);
  const jp = useGameStore(s => s.meta.jp?.[charId] ?? 0);
  const ownedPerks = useGameStore(s => (s.meta.jpPerksOwned?.[charId] ?? []) as JpPerkId[]);
  const [buying, setBuying] = useState<JpPerkId | null>(null);

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
  };

  return (
    <div data-testid="perk-shop" style={{ padding: 24, color: '#eee', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>⚡ 퍽 상점</h2>
        <button type="button" data-testid="btn-perk-back" onClick={onBack} style={backBtnStyle}>← 돌아가기</button>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14 }}>
        JP 잔고: <span data-testid="perk-jp-balance" style={{ color: '#fbbf24', fontWeight: 'bold' }}>{jp}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {JP_PERKS.map((perk: JpPerkDef) => {
          const owned = ownedPerks.includes(perk.id);
          const { canBuy, reason } = canPurchasePerk(perk.id, ownedPerks, jp);
          const locked = reason === 'missing_prerequisite';

          return (
            <div
              key={perk.id}
              data-testid={`perk-node-${perk.id}`}
              style={{
                ...perkCardStyle,
                border: owned ? '2px solid #22c55e' : locked ? '1px solid #374151' : '1px solid #6366f1',
                opacity: locked ? 0.4 : 1,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{perk.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{perk.description}</div>
              <div style={{ fontSize: 11, marginTop: 6, color: owned ? '#22c55e' : jp < perk.cost ? '#ef4444' : '#a5b4fc' }}>
                {owned ? '✓ 보유' : `${perk.cost} JP`}
              </div>
              {perk.requires && !ownedPerks.includes(perk.requires) && (
                <div style={{ fontSize: 10, color: '#f97316', marginTop: 2 }}>
                  필요: {JP_PERKS.find(p => p.id === perk.requires)?.name}
                </div>
              )}
              {!owned && canBuy && (
                <button
                  type="button"
                  data-testid={`btn-buy-${perk.id}`}
                  onClick={() => handleBuy(perk.id)}
                  style={buyBtnStyle}
                >
                  구매
                </button>
              )}
            </div>
          );
        })}
      </div>

      {buying && (
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          구매 확인: {JP_PERKS.find(p => p.id === buying)?.name}
        </div>
      )}
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
