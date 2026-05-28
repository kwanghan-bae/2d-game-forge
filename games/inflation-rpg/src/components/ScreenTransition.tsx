import React, { useEffect, useState } from 'react';

interface ScreenTransitionProps {
  children: React.ReactNode;
  /** Unique key to trigger transition on change */
  transitionKey: string;
  duration?: number;
}

export function ScreenTransition({ children, transitionKey, duration = 300 }: ScreenTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [transitionKey]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms ease-in-out`,
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}
