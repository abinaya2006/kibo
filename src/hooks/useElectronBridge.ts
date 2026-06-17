import { useEffect, useState } from 'react';
import type { ElectronAPI } from '../models/types';

/**
 * Accesses safe contextBridge api values exposed from preload
 */
export function useElectronBridge(): ElectronAPI | null {
  const [bridge, setBridge] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      setBridge(window.electronAPI);
    }
  }, []);

  return bridge;
}
