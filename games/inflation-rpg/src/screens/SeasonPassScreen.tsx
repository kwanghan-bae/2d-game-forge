import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENT_CATALOG, ALL_ACHIEVEMENT_IDS } from '../data/achievementsCatalog';
import { getClaimableCount } from '../data/achievementsSelectors';
import { pickClaimNarration } from '../data/claimNarrationVariants';
import {
  getActiveSeasonModifier,
  getSeasonTimeRemainingMs,
  msToDays,
} from '../data/seasonalModifierSelector';
import { cosmeticTintToHex } from '../data/seasonalCosmeticTint';
import { getClaimerTier, getTierUnlockBonus } from '../data/claimerTier';

interface Props {
  onClose: () => void;
}

/**
 * Cycle 130 N5 SeasonPassScreen — player-facing UI for N5 Live Ops.
 *
 * - 5 starter achievement list (claimed / progress / locked)
 * - tokens 잔액 + 환전 (redeemTokens 3:1, cycle 157 재조정 — cycle 151 5:1 → 3:1)
 * - empty state placeholder
 */
export function SeasonPassScreen({ onClose }: Props) {
  const achievements = useGameStore(s => s.meta.achievements);
  const tokens = useGameStore(s => s.meta.tokens ?? 0);
  const tokensRedeemed = useGameStore(s => s.meta.tokensRedeemed ?? 0);
  const crackStones = useGameStore(s => s.meta.crackStones);
  const seasonStartedAt = useGameStore(s => s.meta.seasonStartedAt ?? 0);
  const totalClaims = useGameStore(s => s.meta.totalClaimsCount ?? 0);
  // Cycle 174 — 마지막 saga 의 finalRealm 으로 claim narration 의 sub-pool 합류.
  //   cycle 165 의 realm-aware narration sub-pool 의 wire 채우기 (story-writer #3 의 마무리).
  const lastFinalRealm = useGameStore(s => {
    const sagas = s.meta.sagaHistory;
    if (!sagas || sagas.length === 0) return null;
    return sagas[sagas.length - 1]?.finalRealm ?? null;
  });
  const redeem = useGameStore(s => s.redeemTokens);
  const claim = useGameStore(s => s.claimAchievement);
  const activeSeason = getActiveSeasonModifier(seasonStartedAt);
  // Cycle 173 — 다음 시즌 회전까지 남은 일 (sp-active-season chip suffix).
  const daysRemaining = msToDays(getSeasonTimeRemainingMs(seasonStartedAt));
  // Cycle 183 — cosmetic 시즌이면 chip 의 left border 를 token 색으로.
  //   wire chain 의 visualization 을 modal header 에서도 인지.
  const cosmeticTintHex = (() => {
    const tint = activeSeason.applyRule.cosmeticTint;
    if (!tint) return null;
    const firstToken = Object.values(tint)[0];
    return firstToken ? cosmeticTintToHex(firstToken) : null;
  })();
  const claimerTier = getClaimerTier(totalClaims);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [redeemAmount, setRedeemAmount] = useState(3);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Cycle 162 — tier 진입 시 feedback 시각 강도 부스트 + 표시 timer 2× 확장.
  // 평생 4 회 milestone 이벤트가 일반 claim 과 같은 fontSize 11 / 2500ms 로
  // 송출되던 cycle 154 toast 의 강도 부족 해소 (ui-ux-designer #2 분할 1/2).
  const [tierFlash, setTierFlash] = useState(false);

  function handleClaim(id: typeof ALL_ACHIEVEMENT_IDS[number]) {
    // Cycle 154: tier 진입 감지를 위해 호출 전 count 캡처.
    const countBefore = totalClaims;
    const result = claim(id);
    if (result.ok) {
      const narration = pickClaimNarration(undefined, claimerTier, lastFinalRealm);
      // Cycle 154: store 갱신 후 count 가 +1 됐으므로 unlock bonus 재계산.
      const tier = getTierUnlockBonus(countBefore, countBefore + 1);
      const tierMsg = tier.newTier ? ` ★ ${tier.newTier} 등급 달성!` : '';
      setFeedback(`${narration} (+${result.tokenDelta} 🎫)${tierMsg}`);
      setPulseId(id);
      setTimeout(() => setPulseId(null), 600);
      // Cycle 162 — tier 진입 (newTier 발화) 시 toast 시각 강화 + 표시 timer 2×.
      if (tier.newTier) {
        setTierFlash(true);
        setTimeout(() => setTierFlash(false), 5000);
        setTimeout(() => setFeedback(null), 5000);
        return;
      }
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

  /** Cycle 176 — focus 관리 분할 1/n (ui-ux-designer 의 cycle 156 권고 #2):
   *   modal 열릴 때 close button 에 첫 focus + 닫을 때 직전 포커스 복원.
   *   Tab cycle trap 자체는 cycle 184 에서 추가 (focus 분할 2/n). */
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    closeBtnRef.current?.focus();
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  /** Cycle 184 — focus 분할 2/n: Tab cycle trap. modal 내 첫/마지막 focusable
   *  element 간 trap. Tab @ 마지막 → 첫, Shift+Tab @ 첫 → 마지막. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusables = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        ref={modalRef}
        data-testid="season-pass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-modal-title"
        style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .sp-feedback-tier-flash {
              transition: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong id="sp-modal-title">도전과제 + 토큰</strong>
            <span data-testid="sp-active-season" data-cosmetic-tint={cosmeticTintHex ?? undefined} style={{ fontSize: 11, color: '#9aa3b2', fontWeight: 400, borderLeft: cosmeticTintHex ? `3px solid ${cosmeticTintHex}` : undefined, paddingLeft: cosmeticTintHex ? 6 : 0 }} title={activeSeason.description}>
              ✨ 현재 시즌: <span style={{ color: '#ffd700' }}>{activeSeason.nameKR}</span>
              {daysRemaining > 0 && (
                <span data-testid="sp-season-remaining" style={{ color: '#888', marginLeft: 6 }}>
                  · 남은 {daysRemaining} 일
                </span>
              )}
              {daysRemaining === 0 && (
                <span data-testid="sp-season-remaining" style={{ color: '#888', marginLeft: 6 }}>
                  · 곧 회전
                </span>
              )}
            </span>
          </div>
          <button ref={closeBtnRef} type="button" data-testid="season-pass-close" aria-label="도전과제 모달 닫기" onClick={onClose} style={{ minHeight: 44, minWidth: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
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
            min={3}
            step={3}
            data-testid="sp-redeem-input"
            value={redeemAmount}
            onChange={e => setRedeemAmount(Math.max(3, Math.floor(Number(e.target.value) || 3)))}
            style={{ width: 80, padding: '6px 8px', background: '#262830', color: '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 13 }}
          />
          <button
            type="button"
            data-testid="sp-redeem-btn"
            onClick={handleRedeem}
            disabled={tokens < redeemAmount}
            style={{ minHeight: 44, padding: '8px 14px', background: tokens < redeemAmount ? '#262830' : '#3b4252', color: tokens < redeemAmount ? '#666' : '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 13, cursor: tokens < redeemAmount ? 'not-allowed' : 'pointer' }}
          >
            환전 (3:1)
          </button>
          {feedback && (
            <span
              data-testid="sp-feedback"
              data-tier-flash={tierFlash ? 'true' : undefined}
              role="status"
              aria-live="polite"
              className={tierFlash ? 'sp-feedback-tier-flash' : undefined}
              style={
                tierFlash
                  ? {
                      fontSize: 16,
                      color: '#ffd700',
                      fontWeight: 700,
                      marginLeft: 8,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 215, 0, 0.12)',
                      boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                      letterSpacing: '0.02em',
                      transition: 'box-shadow 0.6s ease-out',
                    }
                  : { fontSize: 11, color: '#aaa', marginLeft: 8 }
              }
            >
              {feedback}
            </span>
          )}
        </div>

        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px' }}>
          {[...ALL_ACHIEVEMENT_IDS]
            .sort((a, b) => {
              // claimable 우선 → completed 두 번째 → locked 마지막 — 카탈로그 순서 보조 키.
              const score = (id: typeof a) => {
                const p = achievements.byId[id];
                if (p?.completed && !p.claimedAt) return 2;
                if (p?.completed) return 1;
                return 0;
              };
              return score(b) - score(a);
            })
            .map(id => {
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
                        minHeight: 44,
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
