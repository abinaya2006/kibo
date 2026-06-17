import { useEffect } from 'react';
import { petControllerSingleton } from '../controllers/PetController';
import { useAnimationFrame } from './useAnimationFrame';
import { usePetStore } from '../state/usePetStore';

/**
 * Orchestrates the React lifecycle mapping of PetController loops
 */
export function usePetController() {
  const isLoaded = usePetStore((s) => s.isLoaded);

  useEffect(() => {
    // Initialize controller and load saved state
    petControllerSingleton.init();

    return () => {
      petControllerSingleton.destroy();
    };
  }, []);

  // Frame update ticks running at up to 120/144fps depending on hardware
  useAnimationFrame(() => {
    petControllerSingleton.update(Date.now());
  }, isLoaded);

  return petControllerSingleton;
}
