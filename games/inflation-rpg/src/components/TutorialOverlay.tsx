import { useGameStore } from '../store/gameStore';
import { getTutorialStep } from '../data/tutorial';
import { ForgePanel } from '@/components/ui/forge-panel';
import { ForgeButton } from '@/components/ui/forge-button';

export function TutorialOverlay() {
  const meta = useGameStore((s) => s.meta);
  const screen = useGameStore((s) => s.screen);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);

  if (meta.tutorialDone) return null;
  if (meta.tutorialStep < 0) return null;
  const step = getTutorialStep(meta.tutorialStep);
  if (!step) return null;
  if (step.screen !== screen) return null;

  return (
    <div
      data-testid="tutorial-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <ForgePanel variant="elevated" style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 12, color: 'var(--forge-text-muted)', marginBottom: 6 }}>
          튜토리얼 {meta.tutorialStep + 1} / 7
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, margin: '8px 0 18px' }}>{step.textKR}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <ForgeButton variant="primary" style={{ flex: 1 }} onClick={advanceTutorial}>
            {step.ctaKR}
          </ForgeButton>
          <ForgeButton variant="secondary" onClick={skipTutorial}>
            건너뛰기
          </ForgeButton>
        </div>
      </ForgePanel>
    </div>
  );
}
