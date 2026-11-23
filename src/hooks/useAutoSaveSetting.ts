import { useCallback, useEffect, useState } from 'react';

export type AutoSaveMode = '3m' | '3s' | 'off';

export const AUTO_SAVE_STORAGE_KEY = 'reverie-autosave-mode';
export const DEFAULT_AUTO_SAVE_MODE: AutoSaveMode = '3m';
const AUTO_SAVE_CHANGE_EVENT = 'reverie-autosave-change';

function normalizeAutoSaveMode(raw: string | null): AutoSaveMode {
  if (raw === '3m' || raw === '3s' || raw === 'off') {
    return raw;
  }
  return DEFAULT_AUTO_SAVE_MODE;
}

export function getStoredAutoSaveMode(): AutoSaveMode {
  if (typeof window === 'undefined') return DEFAULT_AUTO_SAVE_MODE;
  try {
    return normalizeAutoSaveMode(window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY));
  } catch {
    return DEFAULT_AUTO_SAVE_MODE;
  }
}

export function storeAutoSaveMode(mode: AutoSaveMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent(AUTO_SAVE_CHANGE_EVENT, { detail: mode }));
  } catch {
    // ignore storage errors
  }
}

export function getAutoSaveDelayMs(mode: AutoSaveMode): number | null {
  switch (mode) {
    case '3m':
      return 180_000;
    case '3s':
      return 3_000;
    case 'off':
      return null;
  }
}

export function useAutoSaveSetting(): [AutoSaveMode, (next: AutoSaveMode) => void] {
  const [mode, setModeState] = useState<AutoSaveMode>(() => getStoredAutoSaveMode());

  useEffect(() => {
    const syncFromStorage = () => {
      setModeState(getStoredAutoSaveMode());
    };
    window.addEventListener(AUTO_SAVE_CHANGE_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(AUTO_SAVE_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const setMode = useCallback((next: AutoSaveMode) => {
    setModeState(next);
    storeAutoSaveMode(next);
  }, []);

  return [mode, setMode];
}
