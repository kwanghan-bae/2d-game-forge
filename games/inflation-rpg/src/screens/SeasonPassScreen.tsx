import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENT_CATALOG, ALL_ACHIEVEMENT_IDS } from '../data/achievementsCatalog';

interface Props {
  onClose: () => void;
}

/**
 * Cycle 130 N5 SeasonPassScreen — player-facing UI for N5 Live Ops.
 *
 * - 5 starter achievement list (claimed / progress / locked)
 * - tokens 잔액 + 환전 (redeemTokens 10:1)
 * - empty state placeholder
 */
export function SeasonPassScreen({ onClose }: Props) {
  const achievements = useGameStore(s => s.meta.achievements);
  const tokens = useGameStore(s => s.meta.tokens ?? 0);
  const tokensRedeemed = useGameStore(s => s.meta.tokensRedeemed ?? 0);
  const crackStones = useGameStore(s => s.meta.crackStones);
  const redeem = useGameStore(s => s.redeemTokens);
  const [redeemAmount, setRedeemAmount] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const completedCount = ALL_ACHIEVEMENT_IDS.filter(id => achievements.byId[id]?.completedAt != null).length;

  function handleRedeem() {
    const result = redeem(redeemAmount);
    if (result.ok) {
      setFeedback(`환전 성공: -${result.tokenDelta} tokens / +${result.crackDelta} 균열석`);
    } else {
      setFeedback(result.reason === 'invalid' ? '잘못된 수량' : 'tokens 부족');
    }
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <div
      data-testid="season-pass-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        data-testid="season-pass-modal"
        style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>도전과제 + 토큰</strong>
          <button type="button" data-testid="season-pass-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 16, fontSize: 12 }}>
          <div data-testid="sp-tokens">🎫 토큰: <strong style={{ color: '#ffd700' }}>{tokens}</strong></div>
          <div data-testid="sp-redeemed">누적 환전: {tokensRedeemed}</div>
          <div data-testid="sp-stones">💎 균열석: {crackStones}</div>
          <div style={{ marginLeft: 'auto' }}>{completedCount}/{ALL_ACHIEVEMENT_IDS.length} 완료</div>
        </div>

        <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min={10}
            step={10}
            data-testid="sp-redeem-input"
            value={redeemAmount}
            onChange={e => setRedeemAmount(Math.max(10, Math.floor(Number(e.target.value) || 10)))}
            style={{ width: 80, padding: '6px 8px', background: '#262830', color: '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 13 }}
          />
          <button
            type="button"
            data-testid="sp-redeem-btn"
            onClick={handleRedeem}
            disabled={tokens < redeemAmount}
            style={{ minHeight: 36, padding: '6px 12px', background: tokens < redeemAmount ? '#262830' : '#3b4252', color: tokens < redeemAmount ? '#666' : '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 13, cursor: tokens < redeemAmount ? 'not-allowed' : 'pointer' }}
          >
            환전 (10:1)
          </button>
          {feedback && <span data-testid="sp-feedback" style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>{feedback}</span>}
        </div>

        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px' }}>
          {ALL_ACHIEVEMENT_IDS.map(id => {
            const def = ACHIEVEMENT_CATALOG[id];
            const progress = achievements.byId[id];
            const completed = progress?.completedAt != null;
            return (
              <div key={id} data-testid={`sp-ach-${id}`} style={{ padding: '8px 0', borderBottom: '1px solid #2a2d38', opacity: completed ? 1 : 0.85 }}>
                <div style={{ fontSize: 13, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{completed ? '✅' : '◯'}</span>
                  <span style={{ flex: 1, fontWeight: completed ? 600 : 400 }}>{def.nameKR}</span>
                  <span style={{ fontSize: 11, color: '#ffd700' }}>+{def.reward.tokens} 🎫</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{def.description}</div>
                {!completed && progress && progress.progress > 0 && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>진행도: {progress.progress}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
