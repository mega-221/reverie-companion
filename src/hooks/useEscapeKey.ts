import { useEffect, useRef } from 'react';

/**
 * Registers a window keydown listener that invokes `onEscape` when Escape is pressed.
 */
export function useEscapeKey(
  enabled: boolean,
  onEscape: () => void,
  capture = false
): void {
  const callbackRef = useRef(onEscape);
  callbackRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callbackRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown, capture);
    return () => window.removeEventListener('keydown', handleKeyDown, capture);
  }, [enabled, capture]);
}
