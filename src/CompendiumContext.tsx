import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import type { CompendiumEntry } from './types';

type CompendiumContextType = {
  entries: CompendiumEntry[];
  loading: boolean;
  getDisciplines: () => CompendiumEntry[];
  getAbilities: () => CompendiumEntry[];
  getClasses: () => CompendiumEntry[];
  getSpecialSkills: () => CompendiumEntry[];
  getConvictions: () => CompendiumEntry[];
  getFailings: () => CompendiumEntry[];
  getAspects: () => CompendiumEntry[];
  getEntryByName: (name: string) => CompendiumEntry | undefined;
};

const CompendiumContext = createContext<CompendiumContextType | undefined>(undefined);

export function CompendiumProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CompendiumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('compendium').select('*').then(({ data }) => {
      if (data) setEntries(data as CompendiumEntry[]);
      setLoading(false);
    });
  }, []);

  const indexes = useMemo(() => {
    const byType = new Map<string, CompendiumEntry[]>();
    const byName = new Map<string, CompendiumEntry>();
    for (const entry of entries) {
      const matching = byType.get(entry.type);
      if (matching) matching.push(entry);
      else byType.set(entry.type, [entry]);
      byName.set(entry.name, entry);
    }
    return { byType, byName };
  }, [entries]);

  const getEntriesByType = useCallback(
    (type: string) => indexes.byType.get(type) || [],
    [indexes]
  );
  const getDisciplines = useCallback(() => getEntriesByType('discipline'), [getEntriesByType]);
  const getAbilities = useCallback(() => getEntriesByType('ability'), [getEntriesByType]);
  const getClasses = useCallback(() => getEntriesByType('class'), [getEntriesByType]);
  const getSpecialSkills = useCallback(() => getEntriesByType('special_skill'), [getEntriesByType]);
  const getConvictions = useCallback(() => getEntriesByType('conviction'), [getEntriesByType]);
  const getFailings = useCallback(() => getEntriesByType('failing'), [getEntriesByType]);
  const getAspects = useCallback(() => getEntriesByType('aspect'), [getEntriesByType]);
  const getEntryByName = useCallback(
    (name: string) => indexes.byName.get(name),
    [indexes]
  );

  return (
    <CompendiumContext.Provider value={{ 
      entries, loading, getDisciplines, getAbilities, getClasses, 
      getSpecialSkills, getConvictions, getFailings, getAspects, getEntryByName 
    }}>
      {children}
    </CompendiumContext.Provider>
  );
}

export function useCompendium() {
  const ctx = useContext(CompendiumContext);
  if (!ctx) throw new Error('useCompendium must be used within CompendiumProvider');
  return ctx;
}