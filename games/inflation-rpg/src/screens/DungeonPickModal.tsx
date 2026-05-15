import React from 'react';
import { useGameStore } from '../store/gameStore';
import { DUNGEONS, getDungeonById } from '../data/dungeons';
import { canFreeSelect, hasAnyFreeSelect, getDungeonWeight } from '../systems/compass';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';

interface Props {
  onClose: () => void;
}

export function DungeonPickModal({ onClose }: Props) {
  const meta = useGameStore((s) => s.meta);
  const pickAndSelect = useGameStore((s) => s.pickAndSelectDungeon);
  const selectFree = useGameStore((s) => s.selectDungeonFree);
  const setScreen = useGameStore((s) => s.setScreen);

  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [freeMode, setFreeMode] = React.useState(false);

  React.useEffect(() => {
    setPickedId(pickAndSelect());
  }, [pickAndSelect]);

  const picked = pickedId ? getDungeonById(pickedId) : null;
  const canAnyFree = hasAnyFreeSelect(meta);

  const enter = () => {
    onClose();
    setScreen('class-select');
  };

  const onPickFree = (id: string) => {
    selectFree(id);
    setPickedId(id);
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
              차원 추첨
            </h2>
            <div data-testid="pick-result" style={{ textAlign: 'center', marginBottom: 'var(--forge-space-4)' }}>
              <div style={{ fontSize: '3rem' }}>{picked.emoji}</div>
              <div style={{ fontSize: 'var(--forge-font-lg)', fontWeight: 600 }}>{picked.nameKR}</div>
              <div style={{ fontSize: 'var(--forge-font-sm)', color: 'var(--forge-text-secondary)' }}>
                가중치 {getDungeonWeight(meta, picked.id)} 적용됨
              </div>
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
              <ForgeButton variant="secondary" onClick={onClose} data-testid="pick-cancel">
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
                const free = canFreeSelect(meta, d.id);
                return (
                  <ForgeButton
                    key={d.id}
                    variant={free ? 'primary' : 'secondary'}
                    disabled={!free}
                    onClick={() => onPickFree(d.id)}
                    data-testid={`free-card-${d.id}`}
                  >
                    {d.emoji} {d.nameKR}
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
