import { useGameStore } from '../store/gameStore';
import { getDungeonById } from '../data/dungeons';
import { ForgeButton } from '@/components/ui/forge-button';
import { ForgePanel } from '@/components/ui/forge-panel';

export function DungeonFinalClearedModal() {
  const pendingId = useGameStore((s) => s.meta.pendingFinalClearedId);
  const setPendingFinalCleared = useGameStore((s) => s.setPendingFinalCleared);

  if (!pendingId) return null;

  const dungeon = getDungeonById(pendingId);
  const nameKR = dungeon?.nameKR ?? pendingId;
  const emoji = dungeon?.emoji ?? '⭐';

  const onClose = () => setPendingFinalCleared(null);

  return (
    <div
      data-testid="final-cleared-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <ForgePanel
        style={{
          maxWidth: 320,
          width: '100%',
          padding: 24,
          textAlign: 'center',
          border: '2px solid #ffd700',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 8 }}>⭐</div>
        <h2 style={{ color: '#ffd700', marginTop: 0 }}>정복 완료</h2>
        <p style={{ color: 'var(--forge-text-primary)', margin: '12px 0' }}>
          {emoji} <strong>{nameKR}</strong> 의 최종 보스를 처치했다.
        </p>
        <p style={{ color: 'var(--forge-text-secondary)', fontSize: 12, margin: '12px 0' }}>
          "정복자" 칭호를 획득. 이 던전의 final 보상은 1회 영구 마킹됨.
        </p>
        <ForgeButton
          variant="primary"
          onClick={onClose}
          data-testid="final-cleared-close"
          style={{ marginTop: 16 }}
        >
          확인
        </ForgeButton>
      </ForgePanel>
    </div>
  );
}
