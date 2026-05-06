import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ForgeScreen } from '@/components/ui/forge-screen';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';
import { formatNumber } from '../lib/format';

export function Ascension() {
  const meta = useGameStore((s) => s.meta);
  const setScreen = useGameStore((s) => s.setScreen);
  const ascend = useGameStore((s) => s.ascend);
  const canAscend = useGameStore((s) => s.canAscend);
  const result = canAscend();
  const [confirming, setConfirming] = React.useState(false);

  const currentMult = 1 + 0.1 * meta.ascTier;
  const nextMult = 1 + 0.1 * result.nextTier;

  const handleAscend = () => {
    const ok = ascend();
    if (ok) {
      setConfirming(false);
    }
  };

  return (
    <ForgeScreen>
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ForgeButton variant="secondary" onClick={() => setScreen('town')}>← 마을로</ForgeButton>
        <h2 style={{ color: 'var(--forge-accent)', margin: 0 }}>🌌 차원 제단</h2>
        <span />
      </div>

      <ForgePanel data-testid="ascension-status" style={{ margin: '8px 16px' }}>
        <div style={{ fontSize: 14 }}>
          현재 <strong>Tier {meta.ascTier}</strong> (×{currentMult.toFixed(2)})
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 4 }}>
          누적 균열석: <strong>{formatNumber(meta.crackStones)}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          던전 정복: <strong>{result.finalsCleared}</strong> / 총 3
        </div>
      </ForgePanel>

      <ForgePanel data-testid="ascension-next" style={{ margin: '16px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          다음: Tier {result.nextTier} (×{nextMult.toFixed(2)})
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)', marginTop: 6 }}>
          정복 던전 필요: {result.finalsCleared} / {result.finalsRequired}
        </div>
        <div style={{ fontSize: 12, color: 'var(--forge-text-secondary)' }}>
          균열석 필요: {formatNumber(meta.crackStones)} / {formatNumber(result.cost)}
        </div>

        {!result.ok && (
          <div data-testid="ascension-blocked" style={{ marginTop: 8, fontSize: 12, color: 'var(--forge-danger)' }}>
            {result.reason === 'finals' && '아직 정복한 던전이 부족하다.'}
            {result.reason === 'stones' && '균열석이 부족하다.'}
          </div>
        )}

        {result.ok && !confirming && (
          <ForgeButton
            data-testid="ascension-ascend"
            variant="primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setConfirming(true)}
          >
            초월 — Tier {result.nextTier}
          </ForgeButton>
        )}

        {confirming && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--forge-danger)', borderRadius: 4 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              진행 중인 모든 진척이 사라진다. (장착된 장비, 균열석, Asc Tier 는 보존)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ForgeButton
                data-testid="ascension-confirm"
                variant="primary"
                style={{ flex: 1 }}
                onClick={handleAscend}
              >
                확인
              </ForgeButton>
              <ForgeButton
                data-testid="ascension-cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirming(false)}
              >
                취소
              </ForgeButton>
            </div>
          </div>
        )}
      </ForgePanel>
    </ForgeScreen>
  );
}
