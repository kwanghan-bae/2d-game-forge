import React, { useEffect, useState } from 'react';

interface Props {
  flavor: string | null;
  onDone?: () => void;
}

/** C824: Toast that displays chain event narrative flavor text */
export function ChainFlavorToast({ flavor, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!flavor) return;
    setText(flavor);
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [flavor, onDone]);

  if (!visible || !text) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,10,40,0.9)', color: '#e0c0ff',
      padding: '8px 16px', borderRadius: 8, fontSize: 13,
      whiteSpace: 'nowrap', transition: 'opacity 0.3s',
      border: '1px solid rgba(180,120,255,0.4)',
      fontStyle: 'italic',
    }}>
      ⚔️ {text}
    </div>
  );
}
