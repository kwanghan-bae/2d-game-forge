import React, { useEffect, useState } from 'react';
import { getEventToastLabel } from './EventChoiceToastLogic';

interface Props {
  eventSubType: string | null;
  onDone?: () => void;
}

export function EventChoiceToast({ eventSubType, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!eventSubType) return;
    const text = getEventToastLabel(eventSubType);
    if (!text) return;
    setLabel(text);
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [eventSubType, onDone]);

  if (!visible || !label) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)', color: '#fff',
      padding: '6px 12px', borderRadius: 6, fontSize: 13,
      whiteSpace: 'nowrap', transition: 'opacity 0.3s',
    }}>
      {label}
    </div>
  );
}
