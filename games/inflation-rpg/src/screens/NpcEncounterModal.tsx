import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { computeNpcOutcome } from '../npc/NpcInteraction';

interface Props {
  npcInstanceId: string;
  onClose: () => void;
}

export function NpcEncounterModal({ npcInstanceId, onClose }: Props) {
  const npc = useGameStore(s => s.run.npcs.find(n => n.instanceId === npcInstanceId));
  const updateNpc = useGameStore(s => s.updateNpc);
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!npc || !hero) return null;

  const outcome = computeNpcOutcome(npc, hero.personality.snapshot());
  const confirm = () => {
    updateNpc(npc.instanceId, { relationship: Math.max(0, Math.min(100, npc.relationship + outcome.relationshipDelta)) });
    onClose();
  };

  return (
    <div data-testid="npc-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div data-testid="npc-modal" style={{ width: 'min(360px, 92vw)', background: '#1a1d28', color: '#eee', borderRadius: 12, padding: 16, border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{npc.emoji} {npc.nameKR}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>{npc.age.toFixed(0)}세 · 관계 {npc.relationship}</div>
        <div style={{ fontSize: 14, marginBottom: 16 }}>{outcome.narrativeKR}</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>관계 변화: {outcome.relationshipDelta >= 0 ? '+' : ''}{outcome.relationshipDelta}</div>
        <button type="button" data-testid="npc-modal-confirm" onClick={confirm} style={{ minHeight: 44, padding: '8px 16px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13, width: '100%' }}>
          확인
        </button>
      </div>
    </div>
  );
}
