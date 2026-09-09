import { useEffect, useRef } from 'react';

/**
 * Gives keyboard and assistive-technology users a stable landmark after a
 * Village route replaces the previous screen.
 */
export function useVillageScreenHeadingFocus() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}
