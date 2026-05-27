import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENT_CATALOG, ALL_ACHIEVEMENT_IDS } from '../data/achievementsCatalog';
import { getClaimableCount } from '../data/achievementsSelectors';
import { pickClaimNarration } from '../data/claimNarrationVariants';
import { getActiveSeasonModifier } from '../data/seasonalModifierSelector';

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
  const seasonStartedAt = useGameStore(s => s.meta.seasonStartedAt ?? 0);
  const redeem = useGameStore(s => s.redeemTokens);
  const claim = useGameStore(s => s.claimAchievement);
  const activeSeason = getActiveSeasonModifier(seasonStartedAt);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [redeemAmount, setRedeemAmount] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleClaim(id: typeof ALL_ACHIEVEMENT_IDS[number]) {
    const result = claim(id);
    if (result.ok) {
      const narration = pickClaimNarration();
      setFeedback(`${narration} (+${result.tokenDelta} 🎫)`);
      setPulseId(id);
      setTimeout(() => setPulseId(null), 600);
    } else {
      const msg =
        result.reason === 'already-claimed' ? '이미 수령했습니다'
          : result.reason === 'not-completed' ? '도전과제가 아직 완료되지 않았습니다'
          : '잘못된 도전과제 id';
      setFeedback(msg);
    }
    setTimeout(() => setFeedback(null), 2500);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const completedCount = ALL_ACHIEVEMENT_IDS.filter(id => achievements.byId[id]?.completedAt != null).length;
  const claimableCount = getClaimableCount(achievements);

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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong>도전과제 + 토큰</strong>
            <span data-testid="sp-active-season" style={{ fontSize: 11, color: '#9aa3b2', fontWeight: 400 }} title={activeSeason.description}>
              ✨ 현재 시즌: <span style={{ color: '#ffd700' }}>{activeSeason.nameKR}</span>
            </span>
          </div>
          <button type="button" data-testid="season-pass-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
          <div data-testid="sp-tokens">🎫 토큰: <strong style={{ color: '#ffd700' }}>{tokens}</strong></div>
          <div data-testid="sp-redeemed">누적 환전: {tokensRedeemed}</div>
          <div data-testid="sp-stones">💎 균열석: {crackStones}</div>
          {claimableCount > 0 && (
            <div data-testid="sp-claimable-count" style={{ color: '#ffd700', fontWeight: 600 }}>🎁 수령 가능: {claimableCount}</div>
          )}
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
            const claimed = progress?.claimedAt != null;
            const claimable = completed && !claimed;
            const state = !completed ? 'locked' : claimed ? 'claimed' : 'claimable';
            return (
              <div key={id} data-testid={`sp-ach-${id}`} style={{ padding: '8px 0', borderBottom: '1px solid #2a2d38', opacity: completed ? 1 : 0.85 }}>
                <div style={{ fontSize: 13, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{claimed ? '✅' : completed ? '🎁' : '◯'}</span>
                  <span style={{ flex: 1, fontWeight: completed ? 600 : 400 }}>{def.nameKR}</span>
                  <span style={{ fontSize: 11, color: '#ffd700' }}>+{def.reward.tokens} 🎫</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{def.description}</div>
                {!completed && progress && progress.progress > 0 && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>진행도: {progress.progress}</div>
                )}
                {completed && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      data-testid={`sp-claim-btn-${id}`}
                      data-claim-state={state}
                      data-claim-pulse={pulseId === id ? 'true' : undefined}
                      aria-label={claimable ? `${def.nameKR} 수령` : '수령 완료'}
                      onClick={() => claimable && handleClaim(id)}
                      disabled={!claimable}
                      className={pulseId === id ? 'sp-claim-pulse' : undefined}
                      style={{
                        minHeight: claimable ? 44 : 36,
                        padding: '6px 14px',
                        background: claimable ? '#ffd700' : '#3b4252',
                        color: claimable ? '#1a1d28' : '#666',
                        border: '1px solid',
                        borderColor: claimable ? '#ffd700' : '#555',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: claimable ? 700 : 400,
                        cursor: claimable ? 'pointer' : 'not-allowed',
                        opacity: claimable ? 1 : 0.6,
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                        transform: pulseId === id ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: pulseId === id ? '0 0 16px 4px rgba(255, 215, 0, 0.6)' : 'none',
                      }}
                    >
                      {claimable ? `수령 (+${def.reward.tokens} 🎫)` : '수령 완료'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
