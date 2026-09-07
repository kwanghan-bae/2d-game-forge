import { useEffect, useRef } from 'react';

/**
 * Gives keyboard and assistive-technology users a stable landmark after a
 * V4 route replaces the previous screen.
 */
export function useV4ScreenHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}
