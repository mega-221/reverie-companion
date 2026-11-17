import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Character, CharacterData } from './types';
import { useCompendium } from './CompendiumContext';
import { 
  ORIGIN_EFFECTS, ORIGIN_CHOICES, CORE_SKILLS, SPECIAL_SKILL_ATTRIBUTES, 
  getMinSkillRank, SKILL_XP_COSTS, getMaxAttribute, SKILL_GROUPS, 
  getMaxAttributePoints, getSpentAttributePoints,
  type Tab, type LevelUpTarget 
} from './components/sheet/utils';

import Header from './components/sheet/Header';
import ClassSection from './components/sheet/ClassSection';
import AbilitiesSection from './components/sheet/AbilitiesSection';
import NarrativeSection from './components/sheet/NarrativeSection';
import Footer from './components/sheet/Footer';
import InventoryModal from './components/sheet/InventoryModal';
import { LevelUpModal, OriginModal, ClassModal, SpecialSkillModal, AbilityModal, PathModal, DisciplineModal } from './components/sheet/Modals';

import StatsCard from './components/sheet/StatsCard';
import VitalsCard from './components/sheet/VitalsCard';
import CoreSkillsCard from './components/sheet/CoreSkillsCard';
import LoadoutCard from './components/sheet/LoadoutCard';
import InjuriesCard from './components/sheet/InjuriesCard';
import SpecialSkillsCard from './components/sheet/SpecialSkillsCard';

export default function CharacterSheet({ id, onBack }: { id: string, onBack: () => void }) {
  const { getAbilities, getEntryByName } = useCompendium();
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
          progression: {
            tier: fetchedChar.data.progression?.tier || 2,
            level: fetchedChar.data.progression?.level || 5,
            xp: fetchedChar.data.progression?.xp ?? 0
          },
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
            eva: fetchedChar.data.bonus?.eva || 0
          },
          trackers: {
            vigor: fetchedChar.data.trackers?.vigor ?? 6,
            strain: fetchedChar.data.trackers?.strain ?? 0,
            dp: fetchedChar.data.trackers?.dp ?? 3,
            ap: fetchedChar.data.trackers?.ap ?? 0,
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

        setChar({ ...fetchedChar, data: safeData });
      });
  }, [id]);

  if (!char) return <p className="text-gray-400 p-8 text-center font-cinzel text-xl h-screen flex items-center justify-center bg-gray-900">Loading character...</p>;

  const baseStrainMax = 5 + (char.data.progression.tier - 1) + char.data.bonus.sl;
  const isCritical = char.data.trackers.strain > baseStrainMax || char.data.trackers.vigor < 1;

  const showFilter = isCritical || pulseState !== 'none';

  function patch(p: Partial<CharacterData>) {
    setChar(c => c && { ...c, data: { ...c.data, ...p } });
    setSaved(false);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp' | 'ap' | 'acc', amount: number) {
    if (!char) return;
    const current = char.data.trackers[key];
    let max = Infinity;
    let min = 0; 
    
    if (key === 'vigor') {
      const baseMax = 5 + (char.data.progression.tier - 1) + char.data.bonus.vm;
      max = baseMax * 2; 
      min = -baseMax; 
    }
    if (key === 'strain') max = (5 + (char.data.progression.tier - 1) + char.data.bonus.sl) * 2;
    if (key === 'dp') max = 2 + (char.data.progression.tier - 1) + char.data.bonus.dp;
    
    const nextVal = Math.max(min, Math.min(max, current + amount));
    
    if (key === 'strain' && nextVal >= max) {
      setPulseState('active');
      const endurance = char.data.skills.Endurance || 0;
      const targetVigor = 1 + endurance;
      
      const newVigor = char.data.trackers.vigor < targetVigor ? char.data.trackers.vigor : targetVigor;
      const baseStrainMax = max / 2;
      
      patch({
        trackers: {
          ...char.data.trackers,
          vigor: newVigor,
          strain: baseStrainMax
        }
      });
      
      setTimeout(() => setPulseState('fading'), 2000);
      setTimeout(() => setPulseState('none'), 3000); 
      return; 
    }

    patch({ trackers: { ...char.data.trackers, [key]: nextVal } });
  }

  async function save() {
    if (!char) return;
    setSaving(true);
    await supabase.from('characters').update({ data: char.data }).eq('id', char.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
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
      const max = Math.min(8, char.data.attributes[attr] * 2);
      if (current < max) {
        let cost = SKILL_XP_COSTS[current];
        const isInspired = char.data.identity.inspirations?.includes(levelUpTarget.key);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (char.data.progression.xp >= cost) {
          patch({ 
            skills: { ...char.data.skills, [levelUpTarget.key]: current + 1 }, 
            progression: { ...char.data.progression, xp: char.data.progression.xp - cost } 
          });
        }
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; 
      const max = Math.min(8, char.data.attributes[skill.attribute as keyof typeof char.data.attributes] * 2);
      if (skill.rank < max) {
        let cost = SKILL_XP_COSTS[skill.rank];
        const isInspired = char.data.identity.inspirations?.includes(skill.name);
        if (isInspired) cost = Math.max(0, cost - 1);

        if (char.data.progression.xp >= cost) {
          const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank + 1 };
          patch({ specialSkills: next, progression: { ...char.data.progression, xp: char.data.progression.xp - cost } });
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
        let refund = SKILL_XP_COSTS[current - 1];
        const isInspired = char.data.identity.inspirations?.includes(levelUpTarget.key);
        if (isInspired) refund = Math.max(0, refund - 1);

        patch({ 
          skills: { ...char.data.skills, [levelUpTarget.key]: current - 1 }, 
          progression: { ...char.data.progression, xp: char.data.progression.xp + refund } 
        });
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; 
      const min = getMinSkillRank(skill.name, char);
      if (skill.rank > min) {
        let refund = SKILL_XP_COSTS[skill.rank - 1];
        const isInspired = char.data.identity.inspirations?.includes(skill.name);
        if (isInspired) refund = Math.max(0, refund - 1);

        const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank - 1 };
        patch({ specialSkills: next, progression: { ...char.data.progression, xp: char.data.progression.xp + refund } });
      }
    }
  };

  const availableAttrPts = getMaxAttributePoints(char.data.progression.tier) - getSpentAttributePoints(char.data.attributes);

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
        <Header char={char} onBack={onBack} onSave={save} saving={saving} saved={saved} onNameSave={(name) => { setChar({ ...char, name }); handleNameSave(name); }} updateTracker={updateTracker} showPulse={pulseState !== 'none'} />
        <main className="w-full px-4 sm:px-6 pt-6 relative z-10">
          
          {activeTab === 'gameplay' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200 items-start">
              
              <div className="lg:col-span-4 h-full order-1 lg:order-none">
                <StatsCard char={char} updateTracker={updateTracker} patch={patch} />
              </div>
              <div className="lg:col-span-4 h-full order-2 lg:order-none">
                <VitalsCard char={char} updateTracker={updateTracker} />
              </div>
              <div className="lg:col-span-4 h-full order-3 lg:order-none">
                <CoreSkillsCard char={char} setLevelUpTarget={setLevelUpTarget} />
              </div>

              <div className="lg:col-span-4 h-full order-6 lg:order-none">
                <LoadoutCard char={char} patch={patch} onOpenInventory={() => setIsInventoryModalOpen(true)} />
              </div>
              <div className="lg:col-span-4 h-full order-5 lg:order-none">
                <InjuriesCard char={char} patch={patch} />
              </div>
              <div className="lg:col-span-4 h-full order-4 lg:order-none">
                <SpecialSkillsCard char={char} patch={patch} setLevelUpTarget={setLevelUpTarget} setIsSpecialSkillModalOpen={setIsSpecialSkillModalOpen} setModalSpecialSkillIndex={setModalSpecialSkillIndex} setExpandedSpecialSkill={() => {}} />
              </div>

              <div className="lg:col-span-4 h-full order-7 lg:order-none">
                <ClassSection 
                  char={char} 
                  patch={patch} 
                  setIsClassModalOpen={setIsClassModalOpen} 
                  setIsPathModalOpen={setIsPathModalOpen} 
                  setIsDisciplineModalOpen={setIsDisciplineModalOpen} 
                  setModalDisciplineIndex={setModalDisciplineIndex} 
                />
              </div>
              <div className="lg:col-span-8 order-8 lg:order-none">
                <AbilitiesSection char={char} patch={patch} setModalAbilityIndex={setModalAbilityIndex} setIsAbilityModalOpen={setIsAbilityModalOpen} setModalDiscipline={() => {}} setExpandedModalAbility={() => {}} />
              </div>

            </div>
          )}

          {activeTab === 'narrative' && <NarrativeSection char={char} patch={patch} openOriginModal={() => setIsOriginModalOpen(true)} onRemoveOrigin={() => applyOrigin('', {})} />}
          
          {activeTab === 'progression' && (
            <div className="w-full max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
              <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
                <h2 className="text-xl mb-4 border-b border-gray-700 pb-2 font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200 shrink-0">Progression</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
                  <label className="flex flex-col text-sm font-bold text-gray-300">Tier
                    <input type="number" min={1} max={6} className="border border-gray-700 bg-black/40 p-2 rounded mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.tier} onChange={e => patch({ progression: { ...char.data.progression, tier: +e.target.value } })} />
                  </label>
                  
                  <label className="flex flex-col text-sm font-bold text-gray-300">Level
                    <input type="number" min={1} className="border border-gray-700 bg-black/40 p-2 rounded mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.level} onChange={e => patch({ progression: { ...char.data.progression, level: +e.target.value } })} />
                  </label>
                  
                  <label className="flex flex-col text-sm font-bold text-gray-300">XP
                    <input type="number" min={0} className="border border-gray-700 bg-black/40 p-2 rounded mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.xp} onChange={e => patch({ progression: { ...char.data.progression, xp: +e.target.value } })} />
                  </label>

                  <div className="flex flex-col text-sm font-bold text-gray-300">
                    <span>Attribute Points</span>
                    <div className={`border border-gray-700 bg-black/40 p-2 rounded mt-1 font-normal shadow-inner text-center flex items-center justify-center h-[42px] ${availableAttrPts > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {availableAttrPts} <span className="text-gray-500 mx-1">/</span> {getMaxAttributePoints(char.data.progression.tier)}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Modals rendered OUTSIDE the filtered wrapper so fixed positioning is viewport-relative */}
      <LevelUpModal char={char} levelUpTarget={levelUpTarget} setLevelUpTarget={setLevelUpTarget} handleAdvance={handleAdvance} handleRegress={handleRegress} />
      <OriginModal char={char} isOpen={isOriginModalOpen} onClose={() => setIsOriginModalOpen(false)} applyOrigin={applyOrigin} />
      <ClassModal char={char} isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} patch={patch} />
      <SpecialSkillModal char={char} isOpen={isSpecialSkillModalOpen} onClose={() => setIsSpecialSkillModalOpen(false)} patch={patch} modalIndex={modalSpecialSkillIndex} />
      <AbilityModal char={char} isOpen={isAbilityModalOpen} onClose={() => setIsAbilityModalOpen(false)} patch={patch} modalIndex={modalAbilityIndex} />
      <InventoryModal char={char} isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} patch={patch} />

      <PathModal char={char} isOpen={isPathModalOpen} onClose={() => setIsPathModalOpen(false)} patch={patch} classData={getEntryByName(char.data.identity.className)} />
      <DisciplineModal char={char} isOpen={isDisciplineModalOpen} onClose={() => setIsDisciplineModalOpen(false)} patch={patch} modalIndex={modalDisciplineIndex} />

      <Footer activeTab={activeTab} setActiveTab={setActiveTab} showFilter={showFilter} />
    </>
  );
}