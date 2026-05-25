import { useEffect, useState } from 'react';
import type { BossIntroBuffId, BossIntroBuffTier } from '../buff/bossIntroCatalog';

/**
 * Cycle 109 F1 — Boss Intro Choice modal.
 *
 * Boss 전투 *직전* 3 buff 카드 중 1 택 surface. PRD §F2.
 *
 *   - 8 초 timeout (fate roll 5초 보다 길게 — boss 의 무거움 반영)
 *   - timeout 시 가장 첫 카드 (cards[0]) 자동 선택
 *   - 3 tier 시각 (small=회색 / mid=파랑 / big=보라+금)
 *   - keyboard 1/2/3 키도 cards[0/1/2] 선택 (a11y)
 *
 * cycle 108 FateRollModal 의 backdrop / countdown / data-testid 패턴 mirror.
 * 두 modal 의 공통점 추출 (`<MidCycleDecisionModal/>`) 은 cycle 110 prep 에서.
 */

const TIMEOUT_MS = 8000;

export interface BossIntroCard {
  id: BossIntroBuffId;
  nameKR: string;
  descKR: string;
  tier: BossIntroBuffTier;
}

interface Props {
  cards: ReadonlyArray<BossIntroCard>; // exactly 3
  onResolve: (idx: 0 | 1 | 2) => void;
}

const TIER_COLORS: Record<BossIntroBuffTier, { bg: string; border: string; accent: string }> = {
  small: { bg: '#2a2d38', border: '#555a6e', accent: '#9ca3af' },
  mid:   { bg: '#1e2a4a', border: '#4d6ab8', accent: '#7eb3ff' },
  big:   { bg: '#3a1f4a', border: '#a06ad0', accent: '#e8c060' },
};

export function BossIntroModal({ cards, onResolve }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TIMEOUT_MS / 1000));
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (resolved) return;
    const tick = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    const timeout = setTimeout(() => {
      if (!resolved) {
        setResolved(true);
        onResolve(0); // PRD §F1.동작(6): auto-choose cards[0] on timeout
      }
    }, TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [onResolve, resolved]);

  // Keyboard 1/2/3 shortcuts (a11y + speedrun).
  useEffect(() => {
    if (resolved) return;
    const onKey = (e: KeyboardEvent) => {
      if (resolved) return;
      if (e.key === '1') {
        setResolved(true);
        onResolve(0);
      } else if (e.key === '2') {
        setResolved(true);
        onResolve(1);
      } else if (e.key === '3') {
        setResolved(true);
        onResolve(2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResolve, resolved]);

  const choose = (idx: 0 | 1 | 2) => {
    if (resolved) return;
    setResolved(true);
    onResolve(idx);
  };

  return (
    <div
      data-testid="boss-intro-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        data-testid="boss-intro-modal"
        style={{
          width: 'min(520px, 96vw)',
          background: '#161a24',
          color: '#eee',
          borderRadius: 14,
          padding: 22,
          border: '1px solid #8b5cf6',
          boxShadow: '0 0 28px rgba(139, 92, 246, 0.5)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#fde68a' }}>
          보스의 그림자
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 14 }}>
          전투 직전 영웅에게 빛이 깃든다. 하나를 택하라.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map((card, idx) => {
            const palette = TIER_COLORS[card.tier];
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`boss-intro-card-${idx}`}
                data-card-id={card.id}
                data-card-tier={card.tier}
                onClick={() => choose(idx as 0 | 1 | 2)}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 56,
                  padding: '10px 14px',
                  background: palette.bg,
                  color: '#eee',
                  border: `1px solid ${palette.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: palette.accent }}>
                    {idx + 1}. {card.nameKR}
                  </span>
                  <span style={{ fontSize: 10, color: palette.accent, opacity: 0.8 }}>
                    {card.tier === 'small' ? '소량' : card.tier === 'mid' ? '중량' : '대량'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                  {card.descKR}
                </div>
              </button>
            );
          })}
        </div>
        <div
          data-testid="boss-intro-countdown"
          style={{
            marginTop: 14,
            fontSize: 11,
            color: '#888',
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          {secondsLeft}초 후 첫 카드 자동 선택
        </div>
      </div>
    </div>
  );
}
