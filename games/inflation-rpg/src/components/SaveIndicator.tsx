import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * SaveIndicator — 상태 변경(=자동저장) 시 짧은 인디케이터 표시.
 * 500ms debounce 후 1.2초간 fade-in/out 표시.
 */
export function SaveIndicator() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useGameStore.subscribe(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 1200);
      }, 500);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        fontSize: '12px',
        color: '#8aaa88',
        opacity: 0.8,
        pointerEvents: 'none',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        animation: 'fadeInOut 1.2s ease-in-out',
      }}
    >
      💾 <span style={{ fontFamily: 'Galmuri11, monospace' }}>Saved</span>
    </div>
  );
}
