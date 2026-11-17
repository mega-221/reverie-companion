import { createContext, useContext, useEffect, useState } from 'react';
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

  const getDisciplines = () => entries.filter(e => e.type === 'discipline');
  const getAbilities = () => entries.filter(e => e.type === 'ability');
  const getClasses = () => entries.filter(e => e.type === 'class');
  const getSpecialSkills = () => entries.filter(e => e.type === 'special_skill');
  const getConvictions = () => entries.filter(e => e.type === 'conviction');
  const getFailings = () => entries.filter(e => e.type === 'failing');
  const getAspects = () => entries.filter(e => e.type === 'aspect');
  
  const getEntryByName = (name: string) => entries.find(e => e.name === name);

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