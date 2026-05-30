import React, { useEffect, useState } from 'react';

interface Props {
  result: { accepted: boolean; hpCost: number; goldReward: number } | null;
  onDone?: () => void;
}

/** C827: Toast that shows Risk Gambit outcome */
export function RiskGambitToast({ result, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const msg = result.accepted
      ? `⚡ 위험한 도박! HP -${result.hpCost} → Gold +${result.goldReward}`
      : `🛡️ 도박 거부 — 안전하게 통과`;
    setText(msg);
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [result, onDone]);

  if (!visible || !text) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 140, left: '50%', transform: 'translateX(-50%)',
      background: result?.accepted ? 'rgba(80,20,20,0.9)' : 'rgba(20,40,60,0.9)',
      color: result?.accepted ? '#ffa0a0' : '#a0d0ff',
      padding: '8px 16px', borderRadius: 8, fontSize: 13,
      whiteSpace: 'nowrap', transition: 'opacity 0.3s',
      border: `1px solid ${result?.accepted ? 'rgba(255,100,100,0.4)' : 'rgba(100,180,255,0.4)'}`,
      fontWeight: 600,
    }}>
      {text}
    </div>
  );
}
