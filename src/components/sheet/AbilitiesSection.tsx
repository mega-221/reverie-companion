import { useState } from 'react';
import type { Character, CompendiumEntry } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { getSpeedData, getTypeStyle } from './utils';

export default function AbilitiesSection({ 
  char, patch, setModalAbilityIndex, setIsAbilityModalOpen, setModalDiscipline, setExpandedModalAbility 
}: { 
  char: Character, 
  patch: (p: any) => void, 
  setModalAbilityIndex: (i: number) => void, 
  setIsAbilityModalOpen: (b: boolean) => void, 
  setModalDiscipline: (d: string) => void, 
  setExpandedModalAbility: (s: string | null) => void 
}) {
  const { getAbilities, getEntryByName } = useCompendium();
  const [activeAbilityTab, setActiveAbilityTab] = useState<'discipline' | 'basic'>('discipline');
  const [expandedAbility, setExpandedAbility] = useState<number | null>(null);
  const [expandedBasicAbility, setExpandedBasicAbility] = useState<string | null>(null);
  const [expandedClassAbility, setExpandedClassAbility] = useState<string | null>(null);
  
  const [draggedAbilityIndex, setDraggedAbilityIndex] = useState<number | null>(null);
  const [dragOverAbilityIndex, setDragOverAbilityIndex] = useState<number | null>(null);

  const classRank = Math.max(0, Math.min(4, char.data.progression.tier - 1));
  
  const allClassFeatures = getAbilities().filter(a => a.data.source === char.data.identity.className || a.data.source === char.data.identity.path);
  const classActives = allClassFeatures.filter(a => a.data.feature_type === 'active').sort((a,b) => (a.data.class_rank || 0) - (b.data.class_rank || 0));
  
  const basicAbilities = getAbilities().filter(a => a.data.source === 'Basic').sort((a, b) => {
    const order = ['Cautious Attack', 'Reckless Attack', 'Dodge', 'Brace', 'Reload/Switch', 'Dash', 'Interact/Consumable'];
    return (order.indexOf(a.name) === -1 ? 1 : order.indexOf(a.name)) - (order.indexOf(b.name) === -1 ? 1 : order.indexOf(b.name));
  });

  const equippedAbilities = char.data.abilities.filter((a: any) => a.equipped).length;

  const handleDragStart = (e: React.DragEvent, index: number) => { 
    setDraggedAbilityIndex(index); 
    e.dataTransfer.effectAllowed = 'move'; 
    e.dataTransfer.setData('text/plain', index.toString()); 
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => { 
    e.preventDefault(); 
    if (draggedAbilityIndex !== null && dragOverAbilityIndex !== index) setDragOverAbilityIndex(index); 
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedAbilityIndex === null || draggedAbilityIndex === dropIndex) { 
      setDraggedAbilityIndex(null); 
      setDragOverAbilityIndex(null); 
      return; 
    }
    const newAbilities = [...char.data.abilities];
    const draggedItem = newAbilities[draggedAbilityIndex];
    newAbilities.splice(draggedAbilityIndex, 1);
    newAbilities.splice(dropIndex, 0, draggedItem);
    patch({ abilities: newAbilities });
    setDraggedAbilityIndex(null); 
    setDragOverAbilityIndex(null);
  };

  const renderStats = (entry: CompendiumEntry) => {
    const stats = [{ label: 'Strain', value: `${entry.data.sn_cost ?? 0} SN`, color: 'text-blue-400' }];
    if (entry.data.type === 'attack') stats.push({ label: 'Accuracy', value: entry.data.acc ?? '+0', color: 'text-green-400' }, { label: 'Damage', value: entry.data.dmg ?? '+0', color: 'text-red-400' });
    if (entry.data.type === 'defensive') stats.push({ label: 'Evasion', value: entry.data.eva ?? '+0', color: 'text-purple-400' });
    stats.push({ label: 'Requires', value: entry.data.requirement || 'None', color: 'text-gray-300' });
    return stats;
  };

  const renderSpeedTags = (speedData: any) => {
    if (!speedData) return null;
    return (
      <>
        <div className="relative group inline-flex items-center">
          <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600 cursor-help">
            {speedData.speedLabel}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
            {speedData.speedTooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        </div>
        {speedData.upkeepLabel && (
          <div className="relative group inline-flex items-center">
            <span className="bg-teal-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-700/50 cursor-help">
              {speedData.upkeepLabel}
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-gray-200 border border-gray-700 text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none text-center leading-tight normal-case font-normal italic">
              {speedData.upkeepTooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <section className="sheet-panel p-6 w-full lg:col-span-2">
      <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
        <div className="flex gap-4">
          <button onClick={() => setActiveAbilityTab('discipline')} className={`text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 transition-colors ${activeAbilityTab === 'discipline' ? 'text-gray-200 border-b-2 border-red-500 pb-2 -mb-[10px]' : 'text-gray-500 hover:text-gray-300 pb-2'}`}>Learned Abilities</button>
          <button onClick={() => setActiveAbilityTab('basic')} className={`text-xl font-cinzel first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 transition-colors ${activeAbilityTab === 'basic' ? 'text-gray-200 border-b-2 border-red-500 pb-2 -mb-[10px]' : 'text-gray-500 hover:text-gray-300 pb-2'}`}>Basic Abilities</button>
        </div>
        {activeAbilityTab === 'discipline' && <span className="text-xs text-gray-300 font-bold bg-gray-900 px-2 py-0.5 rounded border border-gray-700">Active: {equippedAbilities}/6</span>}
      </div>
      
      {activeAbilityTab === 'discipline' && (
        <div className="space-y-6">
          {classActives.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Class Abilities</div>
              <div className="space-y-2">
                {classActives.map((ab) => {
                  const isLocked = (ab.data.class_rank || 0) > classRank;
                  const isExpanded = expandedClassAbility === ab.id;
                  const speedData = ab.data.speed ? getSpeedData(ab.data.speed, ab.data.upkeep) : null;
                  return (
                    <div key={ab.id} className={`bg-gray-900 border border-gray-700 rounded-lg transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''} ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                      <div className={`flex flex-wrap gap-3 items-center p-2 select-none transition-colors cursor-pointer hover:bg-gray-800/50 ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`} onClick={() => setExpandedClassAbility(isExpanded ? null : ab.id)}>
                        <div className="w-full sm:w-[240px] shrink-0 bg-gray-800 border border-gray-600 rounded-md py-1.5 px-2 text-sm font-bold text-gray-200 flex justify-between items-center ml-1"><span className="truncate">{ab.name}</span></div>
                        <div className="flex flex-wrap gap-1.5 items-center mr-2 flex-1">
                          {ab.data.type && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(ab.data.type)}`}>{ab.data.type}</span>}
                          {renderSpeedTags(speedData)}
                          {ab.data.range && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{ab.data.range}</span>}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isLocked ? 'bg-gray-800 text-gray-500 border-gray-600' : 'bg-gray-800 text-gray-300 border-gray-600'}`}>{isLocked ? `Rank ${ab.data.class_rank} Req` : 'Class'}</span>
                        </div>
                        <div className="flex items-center shrink-0 ml-auto"><span className="px-2 text-gray-500 hover:text-white font-bold">{isExpanded ? '▲' : '▼'}</span></div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-800 bg-black/40 text-sm text-gray-300 rounded-b-lg">
                          <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                            {renderStats(ab).map((stat, idx) => <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== renderStats(ab).length - 1 ? 'border-r border-gray-700' : ''}`}><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span><span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span></div>)}
                          </div>
                          <div className="italic text-gray-200 border-l-2 border-gray-700 pl-3 mt-4">
                            {ab.data.description?.split(/\r?\n|\\n/).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Discipline Abilities</div>
            <div className="space-y-2">
              {char.data.abilities.map((a: any, i: number) => {
                const compendiumEntry = getEntryByName(a.name);
                const isExpanded = expandedAbility === i;
                const speedData = compendiumEntry?.data?.speed ? getSpeedData(compendiumEntry.data.speed, compendiumEntry.data.upkeep) : null;
                const isLocked = (compendiumEntry?.data?.class_rank || 0) > classRank;
                const isInactive = !a.equipped;
                
                return (
                  <div 
                    key={i} 
                    className={`bg-gray-900 border border-gray-700 rounded-lg transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''} ${draggedAbilityIndex === i ? 'opacity-40 border-dashed border-gray-500' : ''} ${dragOverAbilityIndex === i && draggedAbilityIndex !== i ? (draggedAbilityIndex! < i ? 'border-b-2 border-b-red-500' : 'border-t-2 border-t-red-500') : ''} ${isLocked ? 'opacity-50 grayscale' : ''} ${isInactive && !isLocked ? 'opacity-60' : ''}`} 
                    onDragOver={(e) => handleDragOver(e, i)} 
                    onDrop={(e) => handleDrop(e, i)}
                  >
                    <div 
                      className={`flex flex-wrap gap-2 items-center p-2 select-none transition-colors cursor-pointer hover:bg-gray-800/50 ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`} 
                      onClick={() => setExpandedAbility(isExpanded ? null : i)}
                    >
                      <div 
                        draggable={!isLocked} 
                        onDragStart={(e) => handleDragStart(e, i)} 
                        onDragEnd={() => { setDraggedAbilityIndex(null); setDragOverAbilityIndex(null); }} 
                        className={`px-1 shrink-0 ${isLocked ? 'cursor-not-allowed text-gray-600' : 'cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300'}`} 
                        onClick={(e) => e.stopPropagation()} 
                        title={isLocked ? "Locked by Rank" : "Drag to reorder"}
                      >
                        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><path d="M4 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" /></svg>
                      </div>
                      <input 
                        type="checkbox" 
                        className={`w-5 h-5 shrink-0 ml-1 ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer accent-red-600'}`} 
                        checked={!isLocked && a.equipped} 
                        disabled={isLocked || (!a.equipped && equippedAbilities >= 6)} 
                        onClick={(e) => e.stopPropagation()} 
                        onChange={e => { const next = [...char.data.abilities]; next[i] = { ...next[i], equipped: e.target.checked }; patch({ abilities: next }); }} 
                      />
                      <div 
                        className={`w-full sm:w-[240px] shrink-0 bg-gray-800 border border-gray-600 rounded-md py-1.5 px-2 text-sm font-bold text-gray-200 flex justify-between items-center ml-1 cursor-pointer hover:border-gray-500 transition-colors`} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setModalAbilityIndex(i); 
                          setModalDiscipline(''); 
                          setExpandedModalAbility(null); 
                          setIsAbilityModalOpen(true); 
                        }}
                      >
                        <span className="truncate">{a.name || "— Select Ability —"}</span>
                        <span className="text-gray-500 text-[10px]">▼</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center mr-2 flex-1">
                        {compendiumEntry?.data?.type && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(compendiumEntry.data.type)}`}>{compendiumEntry.data.type}</span>}
                        {renderSpeedTags(speedData)}
                        {compendiumEntry?.data?.range && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{compendiumEntry.data.range}</span>}
                        
                        {compendiumEntry?.data?.class_rank !== undefined && (
                          <span className={`bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isLocked ? 'text-gray-500 border-gray-600' : 'text-gray-300 border-gray-600'}`}>
                            {isLocked ? `Rank ${compendiumEntry.data.class_rank} Req` : `Rank ${compendiumEntry.data.class_rank}`}
                          </span>
                        )}
                        
                        {compendiumEntry?.data?.source && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{compendiumEntry.data.source}</span>}
                      </div>
                      <div className="flex items-center shrink-0 ml-auto">
                        <span className="px-2 text-gray-500 hover:text-white font-bold">{isExpanded ? '▲' : '▼'}</span>
                        <button 
                          className="px-2 text-red-500 font-bold text-lg hover:text-red-400 border-l border-gray-700 pl-3" 
                          onClick={(e) => { e.stopPropagation(); patch({ abilities: char.data.abilities.filter((_: any, j: number) => j !== i) }); }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {isExpanded && compendiumEntry && (
                      <div className="p-4 border-t border-gray-800 bg-black/40 text-sm text-gray-300 rounded-b-lg">
                        <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                          {renderStats(compendiumEntry).map((stat, idx) => <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== renderStats(compendiumEntry).length - 1 ? 'border-r border-gray-700' : ''}`}><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span><span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span></div>)}
                        </div>
                        <div className="italic text-gray-200 border-l-2 border-gray-700 pl-3 mt-4">
                          {compendiumEntry.data.description?.split(/\r?\n|\\n/).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 w-full mt-2 text-gray-400 font-medium transition-colors" onClick={() => patch({ abilities: [...char.data.abilities, { name: '', equipped: false }] })}>+ add ability</button>
            </div>
          </div>
        </div>
      )}

      {activeAbilityTab === 'basic' && (
        <div className="space-y-2">
          {basicAbilities.map((ab) => {
            const isExpanded = expandedBasicAbility === ab.id;
            const speedData = ab.data.speed ? getSpeedData(ab.data.speed, ab.data.upkeep) : null;
            return (
              <div key={ab.id} className={`bg-gray-900 border border-gray-700 rounded-lg transition-all duration-200 ${isExpanded ? 'ring-1 ring-red-900 shadow-md' : ''}`}>
                <div className={`flex flex-wrap gap-3 items-center p-2 cursor-pointer select-none hover:bg-gray-800/50 transition-colors ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`} onClick={() => setExpandedBasicAbility(isExpanded ? null : ab.id)}>
                  <div className="w-full sm:w-[240px] shrink-0 bg-gray-800 border border-gray-600 rounded-md py-1.5 px-2 text-sm font-bold text-gray-200 flex justify-between items-center ml-1"><span className="truncate">{ab.name}</span></div>
                  <div className="flex flex-wrap gap-1.5 items-center mr-2 flex-1">
                    {ab.data.type && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(ab.data.type)}`}>{ab.data.type}</span>}
                    {renderSpeedTags(speedData)}
                    {ab.data.range && <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">{ab.data.range}</span>}
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">Basic</span>
                  </div>
                  <div className="flex items-center shrink-0 ml-auto"><span className="px-2 text-gray-500 hover:text-white font-bold">{isExpanded ? '▲' : '▼'}</span></div>
                </div>
                {isExpanded && (
                  <div className="p-4 border-t border-gray-800 bg-black/40 text-sm text-gray-300 rounded-b-lg">
                    <div className="flex flex-wrap justify-between gap-2 mb-3 bg-gray-900/50 p-2 rounded border border-gray-800 shadow-inner text-center">
                      {renderStats(ab).map((stat, idx) => <div key={idx} className={`flex-1 flex flex-col items-center justify-center min-w-[80px] ${idx !== renderStats(ab).length - 1 ? 'border-r border-gray-700' : ''}`}><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{stat.label}</span><span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span></div>)}
                    </div>
                    <div className="italic text-gray-200 border-l-2 border-gray-700 pl-3 mt-4">
                      {ab.data.description?.split(/\r?\n|\\n/).map((line: string, idx: number) => <span key={idx} className="block mb-1 last:mb-0">{line}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}