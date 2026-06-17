import { useEffect, useRef } from 'react';
import { petControllerSingleton } from '../controllers/PetController';
import type { CursorData } from '../models/types';

/**
 * Custom hook to subscribe components to cursor tracking datasets
 */
export function useCursorTracker(onMove?: (data: CursorData) => void) {
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    const handleMove = () => {
      if (onMoveRef.current) {
        onMoveRef.current(petControllerSingleton.cursorTracker.getData());
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return {
    getCursorData: () => petControllerSingleton.cursorTracker.getData(),
  };
}
