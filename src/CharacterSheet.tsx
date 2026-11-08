import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Character } from './types';
import { useCompendium } from './CompendiumContext';
import { 
  ORIGIN_EFFECTS, ORIGIN_CHOICES, CORE_SKILLS, SPECIAL_SKILL_ATTRIBUTES, 
  getMinSkillRank, SKILL_XP_COSTS, getMaxAttribute, SKILL_GROUPS, 
  type Tab, type LevelUpTarget 
} from './components/sheet/utils';

import Header from './components/sheet/Header';
import VitalsSection from './components/sheet/VitalsSection';
import SkillsSection from './components/sheet/SkillsSection';
import ClassSection from './components/sheet/ClassSection';
import AbilitiesSection from './components/sheet/AbilitiesSection';
import InventorySection from './components/sheet/InventorySection';
import NarrativeSection from './components/sheet/NarrativeSection';
import Footer from './components/sheet/Footer';
import { LevelUpModal, OriginModal, ClassModal, SpecialSkillModal, AbilityModal } from './components/sheet/Modals';

export default function CharacterSheet({ id, onBack }: { id: string, onBack: () => void }) {
  const { getAbilities } = useCompendium();
  const [char, setChar] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');

  // Modal states
  const [levelUpTarget, setLevelUpTarget] = useState<LevelUpTarget | null>(null);
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSpecialSkillModalOpen, setIsSpecialSkillModalOpen] = useState(false);
  const [modalSpecialSkillIndex, setModalSpecialSkillIndex] = useState<number | null>(null);
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [modalAbilityIndex, setModalAbilityIndex] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('characters').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        const fetchedChar = data as Character;
        
        // --- DATA SANITIZER (Prevents blank page crashes) ---
        if (!fetchedChar.data.abilities) fetchedChar.data.abilities = [];
        else if (fetchedChar.data.abilities.length > 0 && typeof fetchedChar.data.abilities[0] === 'string') {
          fetchedChar.data.abilities = (fetchedChar.data.abilities as unknown as string[]).map(name => ({ name, equipped: true }));
        }
        
        if (!fetchedChar.data.convictions) fetchedChar.data.convictions = [];
        if (!fetchedChar.data.failings) fetchedChar.data.failings = [];
        if (!fetchedChar.data.specialSkills) fetchedChar.data.specialSkills = [];
        if (!fetchedChar.data.items) fetchedChar.data.items = [];
        if (!fetchedChar.data.disciplines) fetchedChar.data.disciplines = [];
        if (!fetchedChar.data.notes) fetchedChar.data.notes = '';
        
        if (!fetchedChar.data.trackers) fetchedChar.data.trackers = { vigor: 6, strain: 0, dp: 3, ap: 0, injuries: [] };
        if (!fetchedChar.data.trackers.injuries) fetchedChar.data.trackers.injuries = [];
        
        if (!fetchedChar.data.identity) fetchedChar.data.identity = { origin: '', className: '', path: '', quote: '', inspirations: [], originChoices: {} };
        if (!fetchedChar.data.identity.inspirations) fetchedChar.data.identity.inspirations = [];
        if (!fetchedChar.data.identity.originChoices) fetchedChar.data.identity.originChoices = {};
        
        if (!fetchedChar.data.progression) fetchedChar.data.progression = { tier: 2, level: 5, xp: 0 };
        if (!fetchedChar.data.bonus) fetchedChar.data.bonus = { vm: 0, sl: 0, dp: 0, eva: 0 };
        
        setChar(fetchedChar);
      });
  }, [id]);

  if (!char) return <p className="text-gray-400 p-8 text-center font-cinzel text-xl h-screen flex items-center justify-center bg-gray-900">Loading character...</p>;

  function patch(p: Partial<Character['data']>) {
    setChar(c => c && { ...c, data: { ...c.data, ...p } });
    setSaved(false);
  }

  function updateTracker(key: 'vigor' | 'strain' | 'dp' | 'ap', amount: number) {
    if (!char) return;
    const current = char.data.trackers[key];
    let max = Infinity;
    if (key === 'vigor') max = 5 + (char.data.progression.tier - 1) + char.data.bonus.vm;
    if (key === 'strain') max = (5 + (char.data.progression.tier - 1) + char.data.bonus.sl) * 2; 
    if (key === 'dp') max = 2 + (char.data.progression.tier - 1) + char.data.bonus.dp;
    const nextVal = Math.max(0, Math.min(max, current + amount));
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
      const current = char.data.attributes[levelUpTarget.key]; const max = getMaxAttribute(char.data.progression.tier);
      if (current < max) patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current + 1 } });
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0;
      const attr = Object.keys(SKILL_GROUPS).find(a => (SKILL_GROUPS[a as keyof typeof SKILL_GROUPS].skills as readonly string[]).includes(levelUpTarget.key)) as keyof typeof char.data.attributes;
      const max = Math.min(8, char.data.attributes[attr] * 2);
      if (current < max) {
        const cost = SKILL_XP_COSTS[current];
        if (char.data.progression.xp >= cost) patch({ skills: { ...char.data.skills, [levelUpTarget.key]: current + 1 }, progression: { ...char.data.progression, xp: char.data.progression.xp - cost } });
      }
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; const max = Math.min(8, char.data.attributes[skill.attribute as keyof typeof char.data.attributes] * 2);
      if (skill.rank < max) {
        const cost = SKILL_XP_COSTS[skill.rank];
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
      const current = char.data.attributes[levelUpTarget.key]; if (current > 1) patch({ attributes: { ...char.data.attributes, [levelUpTarget.key]: current - 1 } });
    } else if (levelUpTarget.type === 'skill') {
      const current = char.data.skills[levelUpTarget.key] ?? 0; const min = getMinSkillRank(levelUpTarget.key, char);
      if (current > min) patch({ skills: { ...char.data.skills, [levelUpTarget.key]: current - 1 }, progression: { ...char.data.progression, xp: char.data.progression.xp + SKILL_XP_COSTS[current - 1] } });
    } else if (levelUpTarget.type === 'specialSkill') {
      const skill = char.data.specialSkills[levelUpTarget.index]; const min = getMinSkillRank(skill.name, char);
      if (skill.rank > min) {
        const next = [...char.data.specialSkills]; next[levelUpTarget.index] = { ...next[levelUpTarget.index], rank: skill.rank - 1 };
        patch({ specialSkills: next, progression: { ...char.data.progression, xp: char.data.progression.xp + SKILL_XP_COSTS[skill.rank - 1] } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20 font-sans text-gray-200">
      <Header char={char} onBack={onBack} onSave={save} saving={saving} saved={saved} onNameSave={(name) => { setChar({ ...char, name }); handleNameSave(name); }} />
      <main className="w-full px-4 sm:px-6 pt-6">
        {activeTab === 'gameplay' && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
            <VitalsSection char={char} updateTracker={updateTracker} patch={patch} openOriginModal={() => setIsOriginModalOpen(true)} />
            <SkillsSection char={char} patch={patch} setLevelUpTarget={setLevelUpTarget} setIsSpecialSkillModalOpen={setIsSpecialSkillModalOpen} setModalSpecialSkillIndex={setModalSpecialSkillIndex} setExpandedSpecialSkill={() => {}} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
              <ClassSection char={char} patch={patch} setIsClassModalOpen={setIsClassModalOpen} />
              <AbilitiesSection char={char} patch={patch} setModalAbilityIndex={setModalAbilityIndex} setIsAbilityModalOpen={setIsAbilityModalOpen} setModalDiscipline={() => {}} setExpandedModalAbility={() => {}} />
            </div>
            <InventorySection char={char} patch={patch} />
          </div>
        )}
        {activeTab === 'narrative' && <NarrativeSection char={char} patch={patch} />}
        {activeTab === 'progression' && (
          <div className="w-full max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
            <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
              <h2 className="text-xl mb-4 border-b border-gray-700 pb-2 font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200 shrink-0">Progression</h2>
              <div className="grid grid-cols-3 gap-6 max-w-xl">
                <label className="flex flex-col text-sm font-bold text-gray-300">Tier<input type="number" min={1} max={6} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.tier} onChange={e => patch({ progression: { ...char.data.progression, tier: +e.target.value } })} /></label>
                <label className="flex flex-col text-sm font-bold text-gray-300">Level<input type="number" min={1} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.level} onChange={e => patch({ progression: { ...char.data.progression, level: +e.target.value } })} /></label>
                <label className="flex flex-col text-sm font-bold text-gray-300">XP<input type="number" min={0} className="border border-gray-600 bg-gray-900 p-2 rounded mt-1 font-normal shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={char.data.progression.xp} onChange={e => patch({ progression: { ...char.data.progression, xp: +e.target.value } })} /></label>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <LevelUpModal char={char} levelUpTarget={levelUpTarget} setLevelUpTarget={setLevelUpTarget} handleAdvance={handleAdvance} handleRegress={handleRegress} />
      <OriginModal char={char} isOpen={isOriginModalOpen} onClose={() => setIsOriginModalOpen(false)} applyOrigin={applyOrigin} />
      <ClassModal char={char} isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} patch={patch} />
      <SpecialSkillModal char={char} isOpen={isSpecialSkillModalOpen} onClose={() => setIsSpecialSkillModalOpen(false)} patch={patch} modalIndex={modalSpecialSkillIndex} />
      <AbilityModal char={char} isOpen={isAbilityModalOpen} onClose={() => setIsAbilityModalOpen(false)} patch={patch} modalIndex={modalAbilityIndex} />
    </div>
  );
}