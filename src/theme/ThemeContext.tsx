import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyThemeToDocument,
  getStoredThemeId,
  getThemeById,
  storeThemeId,
  THEME_PRESETS,
  type ThemeId,
  type ThemePreset,
} from './themes';

type ThemeContextValue = {
  /** User's saved global app theme preference */
  themeId: ThemeId;
  /** Currently active preset (including any temporary sheet override) */
  theme: ThemePreset;
  /** Temporary sheet-level theme override ID, or null */
  overrideThemeId: ThemeId | null;
  presets: ThemePreset[];
  setThemeId: (id: ThemeId) => void;
  setOverrideThemeId: (id: ThemeId | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Apply initial theme synchronously before first render to avoid flash
const initialTheme = getThemeById(getStoredThemeId());
applyThemeToDocument(initialTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appThemeId, setAppThemeIdState] = useState<ThemeId>(initialTheme.id);
  const [overrideThemeId, setOverrideThemeIdState] = useState<ThemeId | null>(null);

  const effectiveTheme = getThemeById(overrideThemeId ?? appThemeId);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    storeThemeId(appThemeId);
  }, [appThemeId]);

  const setThemeId = useCallback((id: ThemeId) => {
    const resolved = getThemeById(id);
    storeThemeId(resolved.id);
    setAppThemeIdState(resolved.id);
    if (!overrideThemeId) {
      applyThemeToDocument(resolved);
    }
  }, [overrideThemeId]);

  const setOverrideThemeId = useCallback((id: ThemeId | null) => {
    setOverrideThemeIdState(prev => (prev === id ? prev : id));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeId: appThemeId,
        theme: effectiveTheme,
        overrideThemeId,
        presets: THEME_PRESETS,
        setThemeId,
        setOverrideThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}
