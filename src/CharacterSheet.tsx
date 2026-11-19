import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import type { Character, CharacterData } from './types';
import { useCompendium } from './CompendiumContext';
import { 
  ORIGIN_EFFECTS, ORIGIN_CHOICES, CORE_SKILLS, SPECIAL_SKILL_ATTRIBUTES, 
  getMinSkillRank, SKILL_XP_COSTS, getMaxAttribute, SKILL_GROUPS, 
  getMaxAttributePoints, getSpentAttributePoints,
  type Tab, type LevelUpTarget 
} from './components/sheet/utils';
import { vigorMax, strainMax, dpMax, apMax } from './calc';
import {
  calculateTierFromLevel,
  getMaxAccessibleAbilityRank,
  isSkillInspired,
  getSkillMaxRank,
  getSpendableXp,
  type AbilityPickTask,
} from './components/sheet/progression/progressionData';

import Header from './components/sheet/Header';
import GameplaySection from './components/sheet/GameplaySection';
import NarrativeSection from './components/sheet/NarrativeSection';
import ProgressionSection from './components/sheet/ProgressionSection';
import Footer from './components/sheet/Footer';
import InventoryModal from './components/sheet/modals/InventoryModal';
import { LevelUpModal, OriginModal, ClassModal, SpecialSkillModal, AbilityModal, PathModal, DisciplineModal } from './components/sheet/modals/Modals';

export default function CharacterSheet({ id, onBack }: { id: string, onBack: () => void }) {
  const { getAbilities, getEntryByName, loading: compendiumLoading } = useCompendium();
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');
  
  const [pulseState, setPulseState] = useState<'none' | 'active' | 'fading'>('none');

  const [levelUpTarget, setLevelUpTarget] = useState<LevelUpTarget | null>(null);
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [modalDisciplineIndex, setModalDisciplineIndex] = useState<number | null>(null);
  const [isSpecialSkillModalOpen, setIsSpecialSkillModalOpen] = useState(false);
  const [modalSpecialSkillIndex, setModalSpecialSkillIndex] = useState<number | null>(null);
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [modalAbilityIndex, setModalAbilityIndex] = useState<number | null>(null);
  const [abilityPickQueue, setAbilityPickQueue] = useState<AbilityPickTask[]>([]);
  const [abilityPickTotal, setAbilityPickTotal] = useState(0);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  useEffect(() => {
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        const fetchedChar = data as Character;

        const rawItems: any[] = Array.isArray(fetchedChar.data.items) ? fetchedChar.data.items : [];
        const migratedItems = rawItems.map((i: any) =>
          typeof i === 'string'
            ? { id: crypto.randomUUID(), name: i, qty: 1 }
            : { ...i, id: i.id || crypto.randomUUID() }
        );

        const resolveEq = (val: string): string => {
          if (!val) return '';
          if (val.length > 30) return val; 
          const existing = migratedItems.find((i: any) => i.name === val);
          if (existing) return existing.id;
          const newId = crypto.randomUUID();
          migratedItems.push({ id: newId, name: val, qty: 0 }); 
          return newId;
        };

        const rawEq = fetchedChar.data.equipment || ({} as any);
        const migratedEq = {
          mainHand: resolveEq(rawEq.mainHand || ''),
          mainHandMode: (rawEq.mainHandMode || (rawEq.mainHand ? '1H' : '')) as '1H' | '2H' | '',
          offHand: resolveEq(rawEq.offHand || ''),
          armour: resolveEq(rawEq.armour || ''),
          extra: Array.isArray(rawEq.extra) ? rawEq.extra.map((id: string) => resolveEq(id)) : []
        };

        const oldNotes = fetchedChar.data.notes || '';
        let migratedJournal = fetchedChar.data.journal || [];
        if (oldNotes && migratedJournal.length === 0) {
          migratedJournal = [{ 
            id: crypto.randomUUID(), 
            date: new Date().toISOString(), 
            title: 'Imported Notes', 
            content: oldNotes 
          }];
        }

        const safeData: CharacterData = {
          ...fetchedChar.data,
          identity: {
            origin: fetchedChar.data.identity?.origin || '',
            className: fetchedChar.data.identity?.className || '',
            path: fetchedChar.data.identity?.path || '',
            quote: fetchedChar.data.identity?.quote || '',
            inspirations: fetchedChar.data.identity?.inspirations || [],
            originChoices: fetchedChar.data.identity?.originChoices || {}
          },
          progression: (() => {
            const rawLevel = Math.max(0, fetchedChar.data.progression?.level ?? 0);
            const derivedTier = calculateTierFromLevel(rawLevel);
            const rawXp = Math.max(0, fetchedChar.data.progression?.xp ?? 0);
            const totalXp =
              rawXp < rawLevel * 5
                ? rawLevel * 5 + Math.min(4, rawXp)
                : rawXp;
            return {
              tier: fetchedChar.data.progression?.tier ?? derivedTier,
              level: rawLevel,
              xp: totalXp,
              spendableXp: totalXp,
              advancements: Array.isArray(fetchedChar.data.progression?.advancements)
                ? fetchedChar.data.progression.advancements
                : []
            };
          })(),
          attributes: {
            grt: fetchedChar.data.attributes?.grt || 1,
            ref: fetchedChar.data.attributes?.ref || 1,
            int: fetchedChar.data.attributes?.int || 1,
            psy: fetchedChar.data.attributes?.psy || 1
          },
          bonus: {
            vm: fetchedChar.data.bonus?.vm || 0,
            sl: fetchedChar.data.bonus?.sl || 0,
            dp: fetchedChar.data.bonus?.dp || 0,
            eva: fetchedChar.data.bonus?.eva || 0,
            ap: fetchedChar.data.bonus?.ap || 0,
          },
          trackers: {
            vigor: fetchedChar.data.trackers?.vigor ?? 5,
            strain: fetchedChar.data.trackers?.strain ?? 0,
            dp: fetchedChar.data.trackers?.dp ?? 2,
            ap: fetchedChar.data.trackers?.ap ?? 0,
            apInitialized: Boolean(fetchedChar.data.trackers?.apInitialized),
            acc: fetchedChar.data.trackers?.acc ?? 0,
            injuries: (fetchedChar.data.trackers?.injuries || []).map((inj: any) => ({
              name: inj.name || inj.part || 'Unknown Injury',
              affectedAttributes: Array.isArray(inj.affectedAttributes) 
                ? inj.affectedAttributes 
                : (inj.affectedAttributes ? inj.affectedAttributes.split(',').map((s:string) => s.trim()) : []),
              severity: inj.severity ?? 1,
              treatment: inj.treatment || 'none',
              weeksLeft: inj.weeksLeft ?? (inj.severity ?? 1) * 4
            }))
          },
          equipment: migratedEq,
          abilities: Array.isArray(fetchedChar.data.abilities)
            ? fetchedChar.data.abilities.map((a: any) => typeof a === 'string' ? { name: a, equipped: true } : a)
            : [],
          convictions: fetchedChar.data.convictions || [],
          failings: fetchedChar.data.failings || [],
          aspects: Array.isArray(fetchedChar.data.aspects)
            ? fetchedChar.data.aspects.map((a: any) =>
                typeof a === 'string'
                  ? { id: crypto.randomUUID(), name: a, abandoned: false }
                  : { id: a?.id || crypto.randomUUID(), name: a?.name || '', abandoned: Boolean(a?.abandoned) }
              )
            : [],
          specialSkills: fetchedChar.data.specialSkills || [],
          items: migratedItems,
          possessions: (fetchedChar.data.possessions || []).map((i: any) => ({ ...i, id: i.id || crypto.randomUUID() })),
          disciplines: fetchedChar.data.disciplines || [],
          skills: fetchedChar.data.skills || {},
          journal: migratedJournal,
          relationships: fetchedChar.data.relationships || [],
          notes: oldNotes
        };

        const initialApMax = apMax(safeData, getEntryByName);
        if (!safeData.trackers.apInitialized && safeData.trackers.ap === 0 && initialApMax > 0) {
          safeData.trackers.ap = initialApMax;
          safeData.trackers.apInitialized = true;
        }

        safeData.progression.spendableXp = getSpendableXp(safeData);
        setChar({ ...fetchedChar, data: safeData });
        setHasUnsavedChanges(false);
        setSaved(false);
      });
  }, [id]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (compendiumLoading || !char) return;
    const targetMaxAp = apMax(char.data, getEntryByName);
    if (!char.data.trackers.apInitialized && (char.data.trackers.ap ?? 0) === 0 && targetMaxAp > 0) {
      setChar(prev => {
        if (!prev) return prev;
        if (prev.data.trackers.apInitialized || (prev.data.trackers.ap ?? 0) !== 0) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            trackers: {
              ...prev.data.trackers,
              ap: targetMaxAp,
              apInitialized: true,
            },
          },
        };
      });
    }
  }, [compendiumLoading, char?.id]);

  if (!char) return <p className="text-gray-400 p-8 text-center font-cinzel text-xl h-screen flex items-center justify-center bg-gray-900">Loading character...</p>;

  const baseStrainMax = strainMax(char.data);
  const isCritical = char.data.trackers.strain > baseStrainMax || char.data.trackers.vigor < 1;

  const showFilter = isCritical || pulseState !== 'none';

  function patch(p: Partial<CharacterData>) {
    setChar(c => {
      if (!c) return c;
      const merged: CharacterData = { ...c.data, ...p };

      if (!p.trackers) {
        const prevVigorMax = vigorMax(c.data);
        const nextVigorMax = vigorMax(merged);
        const deltaVigorMax = nextVigorMax - prevVigorMax;

        const prevDpMax = dpMax(c.data);
        const nextDpMax = dpMax(merged);
        const deltaDpMax = nextDpMax - prevDpMax;

        const prevArmourId = c.data.equipment?.armour || '';
        const nextArmourId = merged.equipment?.armour || '';
        const equippedNewArmour = Boolean(nextArmourId && nextArmourId !== prevArmourId);
        const prevApMax = apMax(c.data, getEntryByName);
        const nextApMax = apMax(merged, getEntryByName);
        const deltaApMax = nextApMax - prevApMax;

        if (deltaVigorMax !== 0 || deltaDpMax !== 0 || deltaApMax !== 0 || equippedNewArmour) {
          const nextVigor =
            deltaVigorMax !== 0
              ? Math.max(
                  -nextVigorMax,
                  Math.min(nextVigorMax * 2, merged.trackers.vigor + deltaVigorMax)
                )
              : merged.trackers.vigor;

          const nextDp =
            deltaDpMax !== 0
              ? Math.max(0, Math.min(nextDpMax, merged.trackers.dp + deltaDpMax))
              : merged.trackers.dp;

          const nextAp = equippedNewArmour
            ? nextApMax
            : deltaApMax !== 0
            ? Math.max(0, (merged.trackers.ap ?? 0) + deltaApMax)
            : merged.trackers.ap;

          merged.trackers = {
            ...merged.trackers,
            vigor: nextVigor,
            dp: nextDp,
            ap: nextAp,
            apInitialized:
              equippedNewArmour || deltaApMax !== 0 ? true : merged.trackers.apInitialized,
          };
        }
      }

      return {
        ...c,
        data: {
          ...merged,
          progression: {
            ...merged.progression,
            spendableXp: getSpendableXp(merged),
          },
        },
      };
    });
    setSaved(false);
    setHasUnsavedChanges(true);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) {
    if (!char) return;
    const current = char.data.trackers[key];
    let max = Infinity;
    let min = 0; 
    
    if (key === 'vigor') {
      const baseMax = vigorMax(char.data);
      max = baseMax * 2; 
      min = -baseMax; 
    }
    if (key === 'strain') max = strainMax(char.data) * 2;
    if (key === 'dp') max = dpMax(char.data);
    
    const nextVal = Math.max(min, Math.min(max, current + amount));
    
    if (key === 'strain' && nextVal >= max) {
      setPulseState('active');
      const endurance = char.data.skills.Endurance || 0;
      const targetVigor = 1 + endurance;
      
      const newVigor = char.data.trackers.vigor < targetVigor ? char.data.trackers.vigor : targetVigor;
      const halfMax = max / 2;
      
      patch({
        trackers: {
          ...char.data.trackers,
          vigor: newVigor,
          strain: halfMax
        }
      });
      
      setTimeout(() => setPulseState('fading'), 2000);
      setTimeout(() => setPulseState('none'), 3000); 
      return; 
    }

    patch({
      trackers: {
        ...char.data.trackers,
        [key]: nextVal,
        ...(key === 'ap' ? { apInitialized: true } : {}),
      },
    });
  }

  async function save(): Promise<boolean> {
    if (!char) return false;
    setSaving(true);
    const { error } = await supabase.from('characters').update({ data: char.data }).eq('id', char.id);
    setSaving(false);
    if (!error) {
      setHasUnsavedChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    }
    return false;
  }

  function handleRequestBack() {
    if (hasUnsavedChanges) {
      setIsExitConfirmOpen(true);
    } else {
      onBack();
    }
  }

  async function handleNameSave(newName: string) {
    if (!char) return;
    await supabase.from('characters').update({ name: newName }).eq('id', char.id);
  }

  function applyOrigin(originName: string, choices: Record<string, string>) {
    const oldOriginName = char?.data.identity.origin;
    let newSkills = { ...char?.data.skills };
    let newSpecialSkills = [...(char?.data.specialSkills || [])];
    let newInspirations = [...(char?.data.identity.inspirations || [])];
    let newAbilities = [...(char?.data.abilities || [])];

    if (oldOriginName && oldOriginName !== originName) {
      const oldEffects = ORIGIN_EFFECTS[oldOriginName];
      if (oldEffects) {
        if (oldEffects.starting) Object.entries(oldEffects.starting).forEach(([skill, rank]) => { newSkills[skill] = Math.max(0, (newSkills[skill] || 0) - rank); newSpecialSkills = newSpecialSkills.filter(s => s.name !== skill); });
        if (oldEffects.inspiration) oldEffects.inspiration.forEach(insp => { newInspirations = newInspirations.filter(i => i !== insp); });
        if (oldEffects.specialAbilities) oldEffects.specialAbilities.forEach(disc => { const abilitiesToRemove = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1); newAbilities = newAbilities.filter(ab => !abilitiesToRemove.find(x => x.name === ab.name)); });
      }
      const oldChoices = char?.data.identity.originChoices || {};
      Object.entries(oldChoices).forEach(([choiceId, skillName]) => {
        const choice = ORIGIN_CHOICES[oldOriginName]?.find(c => c.id === choiceId);
        if (choice) {
          if (choice.type === 'inspiration') newInspirations = newInspirations.filter(i => i !== skillName);
          else if (choice.type === 'starting') { newSkills[skillName] = Math.max(0, (newSkills[skillName] || 0) - (choice.rank || 0)); newSpecialSkills = newSpecialSkills.filter(s => s.name !== skillName); }
        }
      });
    }

    const effects = ORIGIN_EFFECTS[originName];
    if (effects) {
      if (effects.starting) Object.entries(effects.starting).forEach(([skill, rank]) => {
        if (CORE_SKILLS.includes(skill)) newSkills[skill] = Math.max(newSkills[skill] || 0, rank);
        else {
          const existing = newSpecialSkills.find(s => s.name === skill);
          if (existing) existing.rank = Math.max(existing.rank, rank);
          else newSpecialSkills.push({ name: skill, rank, attribute: SPECIAL_SKILL_ATTRIBUTES[skill] || 'grt' });
        }
      });
      if (effects.inspiration) effects.inspiration.forEach(insp => { if (!newInspirations.includes(insp)) newInspirations.push(insp); });
      if (effects.specialAbilities) effects.specialAbilities.forEach(disc => {
        const abilitiesToAdd = getAbilities().filter(a => a.data.source === disc && (a.data.class_rank || 0) <= 1);
        abilitiesToAdd.forEach(ab => { if (newAbilities.length < 6 && !newAbilities.find(x => x.name === ab.name)) newAbilities.push({ name: ab.name, equipped: true }); });
      });
    }

    if (choices) Object.entries(choices).forEach(([choiceId, skillName]) => {
      const choice = ORIGIN_CHOICES[originName]?.find(c => c.id === choiceId);
      if (choice) {
        if (choice.type === 'inspiration') { if (!newInspirations.includes(skillName)) newInspirations.push(skillName); }
        else if (choice.type === 'starting') {
          if (CORE_SKILLS.includes(skillName)) newSkills[skillName] = Math.max(newSkills[skillName] || 0, choice.rank || 0);
          else {
            const existing = newSpecialSkills.find(s => s.name === skillName);
            if (existing) existing.rank = Math.max(existing.rank, choice.rank || 0);
            else newSpecialSkills.push({ name: skillName, rank: choice.rank || 0, attribute: SPECIAL_SKILL_ATTRIBUTES[skillName] || 'grt' });
          }
        }
      }
    });

    patch({ identity: { ...char!.data.identity, origin: originName, inspirations: newInspirations, originChoices: choices }, skills: newSkills, specialSkills: newSpecialSkills, abilities: newAbilities });
  }

  const handleAdvance = () => {
    if (!char || !levelUpTarget) return;
    const currentSpendable = getSpendableXp(char.data);

    if (levelUpTarget.type === 'attribute') {
      const current = char.data.attributes[levelUpTarget.key]; 
      const max = getMaxAttribute(char.data.progression.tier);
      const availablePts = getMaxAttributePoints(char.data.progression.tier) - getSpentAttributePoints(char.data.attributes);
      
      if (current < max && availablePts > 0) {
        patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current + 1 } });
      }
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0;
      const attr = Object.keys(SKILL_GROUPS).find(a => (SKILL_GROUPS[a as keyof typeof SKILL_GROUPS].skills as readonly string[]).includes(levelUpTarget.key)) as keyof typeof char.data.attributes;
      const originMin = getMinSkillRank(levelUpTarget.key, char);
      const max = getSkillMaxRank(levelUpTarget.key, char.data.attributes[attr], originMin, char.data);
      if (current < max) {
        let cost = SKILL_XP_COSTS[current];
        const isInspired = isSkillInspired(levelUpTarget.key, char.data);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (currentSpendable >= cost) {
          patch({ 
            skills: { ...char.data.skills, [levelUpTarget.key]: current + 1 }, 
          });
        }
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; 
      const compendiumAttr = getEntryByName(skill.name)?.data?.attribute;
      const attr = (compendiumAttr || skill.attribute || 'grt') as keyof typeof char.data.attributes;
      const originMin = getMinSkillRank(skill.name, char);
      const max = getSkillMaxRank(skill.name, char.data.attributes[attr], originMin, char.data);
      if (skill.rank < max) {
        let cost = SKILL_XP_COSTS[skill.rank];
        const isInspired = isSkillInspired(skill.name, char.data);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (currentSpendable >= cost) {
          const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank + 1 };
          patch({ specialSkills: next });
        }
      }
    }
  };

  const handleRegress = () => {
    if (!char || !levelUpTarget) return;

    if (levelUpTarget.type === 'attribute') {
      const current = char.data.attributes[levelUpTarget.key]; 
      if (current > 1) patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current - 1 } });
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0; 
      const min = getMinSkillRank(levelUpTarget.key, char);
      if (current > min) {
        patch({ 
          skills: { ...char.data.skills, [levelUpTarget.key]: current - 1 }, 
        });
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; 
      const min = getMinSkillRank(skill.name, char);
      if (skill.rank > min) {
        const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank - 1 };
        patch({ specialSkills: next });
      }
    }
  };

  return (
    <>
      {pulseState !== 'none' && (
        <div className={`fixed inset-0 z-[100] pointer-events-none backdrop-blur-[2px] bg-cyan-950/10 transition-opacity duration-1000 ease-in-out ${
          pulseState === 'fading' ? 'opacity-0' : 'opacity-100'
        }`}>
          <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(34,211,238,0.5)] critical-heartbeat" />
        </div>
      )}

      <div className={`min-h-screen bg-gray-900 pb-20 font-sans text-gray-200 transition-all duration-1000 ${showFilter ? 'grayscale-[60%] contrast-[1.1]' : ''}`}>
        <Header
          char={char}
          onBack={handleRequestBack}
          onSave={save}
          saving={saving}
          saved={saved}
          hasUnsavedChanges={hasUnsavedChanges}
          onNameSave={(name) => { setChar({ ...char, name }); handleNameSave(name); }}
          updateTracker={updateTracker}
          showPulse={pulseState !== 'none'}
        />
        <main className="w-full px-4 sm:px-6 pt-6 relative z-10">
          
          {activeTab === 'gameplay' && (
            <GameplaySection
              char={char}
              patch={patch}
              updateTracker={updateTracker}
              setLevelUpTarget={setLevelUpTarget}
              setIsClassModalOpen={setIsClassModalOpen}
              setIsPathModalOpen={setIsPathModalOpen}
              setIsDisciplineModalOpen={setIsDisciplineModalOpen}
              setModalDisciplineIndex={setModalDisciplineIndex}
              setIsSpecialSkillModalOpen={setIsSpecialSkillModalOpen}
              setModalSpecialSkillIndex={setModalSpecialSkillIndex}
              setIsAbilityModalOpen={setIsAbilityModalOpen}
              setModalAbilityIndex={setModalAbilityIndex}
              onOpenInventory={() => setIsInventoryModalOpen(true)}
            />
          )}

          {activeTab === 'narrative' && <NarrativeSection char={char} patch={patch} openOriginModal={() => setIsOriginModalOpen(true)} onRemoveOrigin={() => applyOrigin('', {})} />}
          
          {activeTab === 'progression' && (
            <ProgressionSection
              char={char}
              patch={patch}
              onQueueAbilityPicks={(tasks) => {
                if (tasks.length === 0) return;
                setAbilityPickQueue(tasks);
                setAbilityPickTotal(tasks.length);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals rendered OUTSIDE the filtered wrapper so fixed positioning is viewport-relative */}
      <LevelUpModal char={char} levelUpTarget={levelUpTarget} setLevelUpTarget={setLevelUpTarget} handleAdvance={handleAdvance} handleRegress={handleRegress} />
      <OriginModal char={char} isOpen={isOriginModalOpen} onClose={() => setIsOriginModalOpen(false)} applyOrigin={applyOrigin} />
      <ClassModal char={char} isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} patch={patch} />
      <SpecialSkillModal char={char} isOpen={isSpecialSkillModalOpen} onClose={() => setIsSpecialSkillModalOpen(false)} patch={patch} modalIndex={modalSpecialSkillIndex} />
      <AbilityModal
        char={char}
        isOpen={isAbilityModalOpen}
        onClose={() => setIsAbilityModalOpen(false)}
        patch={patch}
        modalIndex={modalAbilityIndex}
        guidedQueue={abilityPickQueue}
        guidedTotal={abilityPickTotal}
        onGuidedSelect={(abilityName) => {
          patch({
            abilities: [...char.data.abilities, { name: abilityName, equipped: false }],
          });
          setAbilityPickQueue(prev => {
            const next = prev.slice(1);
            if (next.length === 0) setAbilityPickTotal(0);
            return next;
          });
        }}
        onGuidedSkip={() => {
          setAbilityPickQueue(prev => {
            const next = prev.slice(1);
            if (next.length === 0) setAbilityPickTotal(0);
            return next;
          });
        }}
        onGuidedSkipAll={() => {
          setAbilityPickQueue([]);
          setAbilityPickTotal(0);
        }}
      />
      <InventoryModal char={char} isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} patch={patch} />

      <PathModal char={char} isOpen={isPathModalOpen} onClose={() => setIsPathModalOpen(false)} patch={patch} classData={getEntryByName(char.data.identity.className)} />
      <DisciplineModal
        char={char}
        isOpen={isDisciplineModalOpen}
        onClose={() => setIsDisciplineModalOpen(false)}
        patch={patch}
        modalIndex={modalDisciplineIndex}
        onDisciplineSelected={(discName: string) => {
          const maxRank = getMaxAccessibleAbilityRank(char.data.progression.tier);
          const allAbilities = getAbilities();
          const ownedNames = new Set((char.data.abilities || []).map(a => a.name));
          const tasks: AbilityPickTask[] = [];

          // Rank 0: 2 abilities
          const ownedRank0 = (char.data.abilities || []).filter(ab => {
            const entry = getEntryByName(ab.name);
            return entry?.data?.source === discName && Number(entry?.data?.class_rank ?? 0) === 0;
          }).length;
          const availRank0 = allAbilities.filter(
            ab => ab.data?.source === discName && Number(ab.data?.class_rank ?? 0) === 0 && !ownedNames.has(ab.name)
          ).length;
          const rank0ToPick = Math.min(availRank0, Math.max(0, 2 - ownedRank0));
          for (let k = 0; k < rank0ToPick; k++) {
            tasks.push({
              discipline: discName,
              rank: 0,
              promptDetail:
                rank0ToPick > 1
                  ? `Select Rank 0 ability from ${discName} (${k + 1} of ${rank0ToPick}).`
                  : `Select 1 Rank 0 ability from ${discName}.`,
            });
          }

          // Upper ranks 1 .. (tier - 1): 1 ability each
          for (let rank = 1; rank <= maxRank; rank++) {
            const ownedAtRank = (char.data.abilities || []).filter(ab => {
              const entry = getEntryByName(ab.name);
              return entry?.data?.source === discName && Number(entry?.data?.class_rank ?? 0) === rank;
            }).length;
            const availAtRank = allAbilities.filter(
              ab => ab.data?.source === discName && Number(ab.data?.class_rank ?? 0) === rank && !ownedNames.has(ab.name)
            ).length;
            if (ownedAtRank < 1 && availAtRank > 0) {
              tasks.push({
                discipline: discName,
                rank,
                promptDetail: `Select 1 Rank ${rank} ability from ${discName}.`,
              });
            }
          }

          if (tasks.length > 0) {
            setAbilityPickQueue(tasks);
            setAbilityPickTotal(tasks.length);
          }
        }}
      />

      <Footer activeTab={activeTab} setActiveTab={setActiveTab} showFilter={showFilter} />

      {isExitConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsExitConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-modal max-w-sm animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
              <h3 className="font-cinzel font-bold text-lg text-gray-200 truncate pr-2">Unsaved Changes</h3>
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-2xl leading-none px-2 shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              <p className="text-sm text-gray-300 leading-relaxed">
                You have unsaved changes on <strong className="text-gray-100">{char.name || 'this character'}</strong>. Would you like to save before exiting?
              </p>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await save();
                    if (ok) {
                      setIsExitConfirmOpen(false);
                      onBack();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-sm border bg-red-900 hover:bg-red-800 border-red-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Exit'}
                </button>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setIsExitConfirmOpen(false)}
                    className="flex-1 py-2 px-3 rounded-lg font-bold text-sm border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasUnsavedChanges(false);
                      setIsExitConfirmOpen(false);
                      onBack();
                    }}
                    className="flex-1 py-2 px-3 rounded-lg font-bold text-sm border border-red-900/80 text-red-300 bg-red-950/40 hover:bg-red-900/50 transition-colors"
                  >
                    Discard & Exit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}