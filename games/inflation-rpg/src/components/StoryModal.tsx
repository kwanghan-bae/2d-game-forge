import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

interface StoryModalProps {
  title: string;
  emoji?: string;
  textKR: string;
  onClose: () => void;
}

export function StoryModal({ title, emoji, textKR, onClose }: StoryModalProps) {
  return (
    <div
      data-testid="story-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
    >
      <ForgePanel variant="elevated" style={{ maxWidth: 380, width: '100%' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--forge-accent)',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          {emoji && <span style={{ marginRight: 8 }}>{emoji}</span>}
          {title}
        </div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--forge-text-primary)',
            margin: '14px 0 18px',
          }}
        >
          {textKR}
        </p>
        <ForgeButton variant="primary" style={{ width: '100%' }} onClick={onClose}>
          확인
        </ForgeButton>
      </ForgePanel>
    </div>
  );
}
