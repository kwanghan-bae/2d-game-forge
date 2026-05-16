import React from 'react';
import { useGameStore } from '../store/gameStore';
import { DUNGEONS, getDungeonById } from '../data/dungeons';
import { canFreeSelect, hasAnyFreeSelect, getDungeonWeight } from '../systems/compass';
import { isDungeonUnlocked } from '../systems/dungeons';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';

interface Props {
  onClose: () => void;
}

export function DungeonPickModal({ onClose }: Props) {
  const meta = useGameStore((s) => s.meta);
  const pickAndSelect = useGameStore((s) => s.pickAndSelectDungeon);
  const selectFree = useGameStore((s) => s.selectDungeonFree);
  const selectDungeon = useGameStore((s) => s.selectDungeon);
  const setScreen = useGameStore((s) => s.setScreen);

  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [freeMode, setFreeMode] = React.useState(false);
  const [freelyPicked, setFreelyPicked] = React.useState(false);

  React.useEffect(() => {
    setPickedId(pickAndSelect());
  }, [pickAndSelect]);

  const picked = pickedId ? getDungeonById(pickedId) : null;
  const canAnyFree = hasAnyFreeSelect(meta);

  const enter = () => {
    onClose();
    setScreen('class-select');
  };

  // 취소 / 모달 dismiss 시 추첨된 currentDungeonId 잔존 방지.
  const cancel = () => {
    selectDungeon(null);
    onClose();
  };

  const onPickFree = (id: string) => {
    selectFree(id);
    setPickedId(id);
    setFreelyPicked(true);
    setFreeMode(false);
  };

  return (
    <div
      role="dialog"
      data-testid="dungeon-pick-modal"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        padding: 'var(--forge-space-4)',
      }}
    >
      <ForgePanel style={{ maxWidth: 480, width: '100%', padding: 'var(--forge-space-6)' }}>
        {!freeMode && picked && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>
              {freelyPicked ? '자유 선택 완료' : '차원 추첨'}
            </h2>
            <div data-testid="pick-result" style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>
              <div style={{ fontSize: '3rem' }}>{picked.emoji}</div>
              <div style={{ fontSize: 'var(--forge-font-lg)', fontWeight: 600 }}>{picked.nameKR}</div>
              {!freelyPicked && (
                <div data-testid="pick-weight" style={{ fontSize: 'var(--forge-font-sm)', color: 'var(--forge-text-secondary)' }}>
                  가중치 {getDungeonWeight(meta, picked.id)} 적용됨
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--forge-space-2)' }}>
              <ForgeButton variant="primary" onClick={enter} data-testid="pick-enter">
                입장
              </ForgeButton>
              {canAnyFree && (
                <ForgeButton
                  variant="secondary"
                  onClick={() => setFreeMode(true)}
                  data-testid="pick-free-mode"
                >
                  🗺️ 자유 선택 (나침반)
                </ForgeButton>
              )}
              <ForgeButton variant="secondary" onClick={cancel} data-testid="pick-cancel">
                취소
              </ForgeButton>
            </div>
          </>
        )}

        {freeMode && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>자유 선택</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--forge-space-2)', marginBottom: 'var(--forge-space-4)' }}>
              {DUNGEONS.map((d) => {
                const unlocked = isDungeonUnlocked(meta, d);
                const canFree = unlocked && canFreeSelect(meta, d.id);
                const hint = !unlocked && d.unlockGate.type === 'asc-tier'
                  ? `🔒 Tier ${d.unlockGate.tier} 도달 시 해제`
                  : null;
                return (
                  <ForgeButton
                    key={d.id}
                    variant={canFree ? 'primary' : 'secondary'}
                    disabled={!canFree}
                    onClick={() => canFree && onPickFree(d.id)}
                    data-testid={`free-card-${d.id}`}
                    style={{ opacity: !unlocked ? 0.35 : (canFree ? 1 : 0.6) }}
                  >
                    <span>{d.emoji} {d.nameKR}</span>
                    {hint && (
                      <span
                        data-testid={`free-card-hint-${d.id}`}
                        style={{ display: 'block', fontSize: 11, color: '#888' }}
                      >
                        {hint}
                      </span>
                    )}
                  </ForgeButton>
                );
              })}
            </div>
            <ForgeButton
              variant="secondary"
              onClick={() => setFreeMode(false)}
              data-testid="pick-back-to-random"
            >
              ← 추첨으로
            </ForgeButton>
          </>
        )}
      </ForgePanel>
    </div>
  );
}
