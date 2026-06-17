import { useEffect, useRef } from 'react';

/**
 * Custom hook wrapping requestAnimationFrame for high-performance updates
 */
export function useAnimationFrame(callback: (timestamp: number) => void, active = true) {
  const callbackRef = useRef(callback);
  const frameId = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current);
        frameId.current = null;
      }
      return;
    }

    const loop = (timestamp: number) => {
      callbackRef.current(timestamp);
      frameId.current = requestAnimationFrame(loop);
    };

    frameId.current = requestAnimationFrame(loop);

    return () => {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [active]);
}
