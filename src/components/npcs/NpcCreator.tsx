import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CompendiumEntry, CustomNpc, NpcAbility, NpcItem } from '../../types';
import { useCompendium } from '../../CompendiumContext';
import { useConfirm } from '../sheet/ConfirmDialog';
import { KeywordText } from '../common/KeywordText';
import { SpeedTagPills } from '../common/SpeedTagPills';
import { getSpeedData, getTypeStyle } from '../sheet/utils';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_NAMES,
  CORE_SKILLS,
  SEASONS,
  SKILL_GROUPS,
  SPECIAL_SKILLS,
  getSeasonTextClass,
} from '../../constants/reverie';
import {
  createBlankNpc,
  deleteNpc,
  duplicateNpc,
  loadNpcs,
  normalizeNpc,
  saveNpcs,
  upsertNpc,
} from '../../utils/npcStorage';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function NpcCreator({ userId }: { userId: string }) {
  const { entries: compendiumEntries, getAbilities, getConvictions, getFailings } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();

  const [npcs, setNpcs] = useState<CustomNpc[]>(() => loadNpcs(userId));
  const [selectedId, setSelectedId] = useState<string | null>(() => loadNpcs(userId)[0]?.id ?? null);
  const [draft, setDraft] = useState<CustomNpc | null>(() => loadNpcs(userId)[0] ?? null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  // Pickers / Modals
  const [abilityPickerOpen, setAbilityPickerOpen] = useState(false);
  const [abilitySearch, setAbilitySearch] = useState('');
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showSkillsSection, setShowSkillsSection] = useState(false);
  const [showNarrativeSection, setShowNarrativeSection] = useState(false);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  useBodyScrollLock(abilityPickerOpen || itemPickerOpen);
  useEscapeKey(abilityPickerOpen, () => setAbilityPickerOpen(false));
  useEscapeKey(itemPickerOpen, () => setItemPickerOpen(false));

  useEffect(() => {
    const loaded = loadNpcs(userId);
    setNpcs(loaded);
    setSelectedId(loaded[0]?.id ?? null);
    setDraft(loaded[0] ?? null);
  }, [userId]);

  const selectNpc = (npc: CustomNpc) => {
    setSelectedId(npc.id);
    setDraft(normalizeNpc(npc));
    setShowSkillsSection(Object.values(npc.skills || {}).some((r) => Number(r) > 0));
    setShowNarrativeSection((npc.convictions?.length || 0) > 0 || (npc.failings?.length || 0) > 0);
  };

  const handleCreateNew = () => {
    const fresh = createBlankNpc();
    const nextList = upsertNpc(userId, fresh);
    setNpcs(nextList);
    selectNpc(fresh);
  };

  const handleSaveDraft = (nextDraft?: CustomNpc) => {
    const target = nextDraft || draft;
    if (!target) return;
    const nextList = upsertNpc(userId, target);
    setNpcs(nextList);
    setSelectedId(target.id);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1400);
  };

  const updateDraft = (updater: (prev: CustomNpc) => CustomNpc, immediateSave = false) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (immediateSave) {
        const nextList = upsertNpc(userId, next);
        setNpcs(nextList);
      }
      return next;
    });
  };

  const handleDeleteNpc = async (id: string, name: string) => {
    const ok = await askConfirm({
      title: 'Delete Creature',
      message: `Delete "${name}" from your NPC library?`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const nextList = deleteNpc(userId, id);
    setNpcs(nextList);
    if (selectedId === id) {
      const nextSel = nextList[0] ?? null;
      setSelectedId(nextSel?.id ?? null);
      setDraft(nextSel ? normalizeNpc(nextSel) : null);
    }
  };

  const handleDuplicate = (id: string) => {
    const { list, copy } = duplicateNpc(userId, id);
    setNpcs(list);
    if (copy) selectNpc(copy);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(npcs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reverie-npcs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = arr.map((item) =>
        normalizeNpc({
          ...item,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `npc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })
      );
      const merged = [...normalized, ...npcs];
      saveNpcs(userId, merged);
      setNpcs(merged);
      if (normalized[0]) selectNpc(normalized[0]);
    } catch {
      // ignore invalid json
    }
  };

  const filteredNpcs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return npcs;
    return npcs.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.role.toLowerCase().includes(q) ||
        n.className.toLowerCase().includes(q)
    );
  }, [npcs, searchTerm]);

  const compendiumAbilities = useMemo(() => {
    const q = abilitySearch.trim().toLowerCase();
    const list = getAbilities();
    if (!q) return list.slice(0, 60);
    return list
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          String(a.data?.source || '').toLowerCase().includes(q) ||
          String(a.data?.description || '').toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [getAbilities, abilitySearch]);

  const compendiumItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const list = compendiumEntries.filter((e) => e.type === 'item');
    if (!q) return list.slice(0, 60);
    return list
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          String(i.data?.category || '').toLowerCase().includes(q) ||
          String(i.data?.subtype || '').toLowerCase().includes(q) ||
          String(i.data?.effect || '').toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [compendiumEntries, itemSearch]);

  const addCompendiumAbility = (entry: CompendiumEntry) => {
    const newAb: NpcAbility = {
      id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: entry.name,
      type: entry.data?.type || 'utility',
      speed: entry.data?.speed || '>>',
      upkeep: entry.data?.upkeep || '',
      range: entry.data?.range || '',
      snCost: Number(entry.data?.sn_cost ?? 0) || 0,
      acc: entry.data?.acc ? String(entry.data.acc) : '',
      dmg: entry.data?.dmg ? String(entry.data.dmg) : '',
      eva: entry.data?.eva ? String(entry.data.eva) : '',
      effect: String(entry.data?.description || ''),
      sourceCompendiumName: entry.name,
    };
    updateDraft((prev) => ({ ...prev, abilities: [...prev.abilities, newAb] }), true);
    setAbilityPickerOpen(false);
  };

  const addCustomAbility = () => {
    const newAb: NpcAbility = {
      id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Creature Strike',
      type: 'attack',
      speed: '>>',
      range: 'Adjacent',
      snCost: 0,
      acc: '+0',
      dmg: '+0',
      eva: '',
      effect: '',
    };
    updateDraft((prev) => ({ ...prev, abilities: [...prev.abilities, newAb] }), true);
  };

  const addCompendiumItem = (entry: CompendiumEntry) => {
    const cat = String(entry.data?.category || '').toLowerCase();
    const slot: NpcItem['equippedSlot'] =
      cat === 'armour' || cat === 'armor'
        ? 'armour'
        : cat === 'weapon'
        ? 'mainHand'
        : 'extra';
    const newItem: NpcItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: entry.name,
      qty: 1,
      category: entry.data?.category || '',
      subtype: entry.data?.subtype || '',
      dmg: entry.data?.dmg ?? '',
      range: entry.data?.range ?? '',
      ap: entry.data?.ap ?? 0,
      resists: entry.data?.resists ?? '',
      effect: entry.data?.effect || entry.data?.description || '',
      equippedSlot: slot,
      mainHandMode: '1H',
    };
    updateDraft((prev) => ({ ...prev, items: [...prev.items, newItem] }), true);
    setItemPickerOpen(false);
  };

  const addCustomItem = () => {
    const newItem: NpcItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Custom Weapon',
      qty: 1,
      category: 'Weapon',
      subtype: 'Melee',
      dmg: '3',
      range: 'Adjacent',
      ap: 0,
      effect: '',
      equippedSlot: 'mainHand',
      mainHandMode: '1H',
    };
    updateDraft((prev) => ({ ...prev, items: [...prev.items, newItem] }), true);
  };

  return (
    <div className="w-full">
      {confirmDialog}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportJson}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b rev-divider pb-4 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-spectral font-bold" style={{ color: 'var(--rev-text)' }}>
            NPC &amp; Creature Creator
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--rev-text-muted)' }}>
            Build custom enemies, allies, and monsters for your party combat encounters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rev-btn-secondary px-3 py-2 text-xs font-bold"
          >
            Import JSON
          </button>
          {npcs.length > 0 && (
            <button
              type="button"
              onClick={handleExportJson}
              className="rev-btn-secondary px-3 py-2 text-xs font-bold"
            >
              Export JSON
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateNew}
            className="rev-btn-primary px-4 py-2 font-bold text-sm shadow-sm"
          >
            + New Creature
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Library Column */}
        <div className="lg:col-span-4 sheet-panel p-4 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
              Bestiary ({npcs.length})
            </span>
          </div>

          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter NPCs by name or role..."
            className="rev-input px-3 py-2 text-xs"
          />

          {filteredNpcs.length === 0 ? (
            <div className="rev-inset p-6 text-center text-xs italic" style={{ color: 'var(--rev-text-muted)' }}>
              {npcs.length === 0
                ? 'No custom creatures yet. Click "+ New Creature" to create one.'
                : 'No creatures match your filter.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[68vh] overflow-y-auto pr-1 custom-scrollbar">
              {filteredNpcs.map((npc) => {
                const isSelected = draft?.id === npc.id;
                return (
                  <div
                    key={npc.id}
                    onClick={() => selectNpc(npc)}
                    className="rev-card p-3 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                    style={{
                      borderColor: isSelected ? 'var(--rev-accent-border)' : undefined,
                      backgroundColor: isSelected ? 'var(--rev-accent-soft)' : undefined,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-spectral font-bold text-base truncate" style={{ color: 'var(--rev-text-bright)' }}>
                        {npc.name}
                      </div>
                      <div className="text-[11px] truncate tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                        {[npc.role, `Rank ${npc.classRank}`, `VG ${npc.stats.vigorMax}`, `EVA ${npc.stats.eva}`, npc.stats.apMax > 0 ? `AP ${npc.stats.apMax}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(npc.id)}
                        title="Duplicate creature"
                        aria-label="Duplicate creature"
                        className="rev-icon-btn rev-icon-btn-edit text-xs"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNpc(npc.id, npc.name)}
                        title="Delete creature"
                        aria-label="Delete creature"
                        className="rev-icon-btn rev-icon-btn-danger text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Creature Editor */}
        <div className="lg:col-span-8 min-w-0">
          {!draft ? (
            <div className="sheet-panel p-12 text-center flex flex-col items-center gap-3">
              <p className="text-sm italic" style={{ color: 'var(--rev-text-muted)' }}>
                Select a creature from your bestiary or create a new one.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="rev-btn-primary px-5 py-2.5 text-sm font-bold"
              >
                + Create First Creature
              </button>
            </div>
          ) : (
            <div className="sheet-panel p-5 flex flex-col gap-5">
              {/* Top Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b rev-divider pb-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-accent-text)' }}>
                    Creature Sheet
                  </span>
                  <h3 className="font-spectral font-bold text-2xl truncate" style={{ color: 'var(--rev-text-bright)' }}>
                    {draft.name || 'Unnamed Creature'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savedNotice && (
                    <span className="text-xs font-bold text-green-400 animate-in fade-in duration-150">
                      Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveDraft()}
                    className="rev-btn-primary px-4 py-2 text-xs sm:text-sm font-bold shadow-sm"
                  >
                    Save Creature
                  </button>
                </div>
              </div>

              {/* Section 1: Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider sm:col-span-2" style={{ color: 'var(--rev-text-muted)' }}>
                  Creature Name
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => updateDraft((p) => ({ ...p, name: e.target.value }))}
                    onBlur={() => handleSaveDraft()}
                    className="rev-input px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                  Role / Type
                  <input
                    type="text"
                    value={draft.role}
                    placeholder="e.g. Raider, Construct..."
                    onChange={(e) => updateDraft((p) => ({ ...p, role: e.target.value }))}
                    onBlur={() => handleSaveDraft()}
                    className="rev-input px-3 py-2 text-sm font-normal"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Tier
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={draft.tier}
                      onChange={(e) => updateDraft((p) => ({ ...p, tier: Math.max(0, Number(e.target.value) || 0) }))}
                      onBlur={() => handleSaveDraft()}
                      className="rev-input px-2 py-2 text-sm text-center tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Class Rank
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={draft.classRank}
                      onChange={(e) => updateDraft((p) => ({ ...p, classRank: Math.max(0, Number(e.target.value) || 0) }))}
                      onBlur={() => handleSaveDraft()}
                      className="rev-input px-2 py-2 text-sm text-center tabular-nums"
                    />
                  </label>
                </div>
              </div>

              {/* Section 2: Basic Combat Stats */}
              <div className="rev-inset p-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Vitals &amp; Combat Stats
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {(
                    [
                      { key: 'vigorMax', label: 'Vigor Max' },
                      { key: 'strainMax', label: 'Strain Max' },
                      { key: 'dpMax', label: 'DP Max' },
                      { key: 'apMax', label: 'Armour (AP)' },
                      { key: 'eva', label: 'Evasion' },
                      { key: 'acc', label: 'Base ACC' },
                      { key: 'mov', label: 'Movement' },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--rev-text-muted)' }}
                    >
                      {label}
                      <input
                        type="number"
                        value={draft.stats[key]}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          updateDraft((p) => ({
                            ...p,
                            stats: { ...p.stats, [key]: Number.isFinite(val) ? val : 0 },
                          }));
                        }}
                        onBlur={() => handleSaveDraft()}
                        className="rev-input px-2 py-1.5 text-sm font-bold text-center tabular-nums"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Resists (optional)
                    <input
                      type="text"
                      value={draft.stats.resists}
                      placeholder="e.g. Slash 2, Fire 1"
                      onChange={(e) => updateDraft((p) => ({ ...p, stats: { ...p.stats, resists: e.target.value } }))}
                      onBlur={() => handleSaveDraft()}
                      className="rev-input px-3 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                    Tactics / Notes (optional)
                    <input
                      type="text"
                      value={draft.notes}
                      placeholder="Combat behavior, traits, or lore..."
                      onChange={(e) => updateDraft((p) => ({ ...p, notes: e.target.value }))}
                      onBlur={() => handleSaveDraft()}
                      className="rev-input px-3 py-1.5 text-xs font-normal"
                    />
                  </label>
                </div>
              </div>

              {/* Section 3: Attributes */}
              <div className="rev-inset p-4 flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                  Attributes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ATTRIBUTE_KEYS.map((attr) => (
                    <div key={attr} className="bg-black/25 border border-gray-700/60 rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <span className={`font-cinzel font-bold text-xs uppercase tracking-wider ${SKILL_GROUPS[attr].color}`}>
                        {ATTRIBUTE_NAMES[attr]}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateDraft((p) => ({
                            ...p,
                            attributes: { ...p.attributes, [attr]: Math.max(-2, p.attributes[attr] - 1) },
                          }), true)}
                          className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-sm tabular-nums text-white">
                          {draft.attributes[attr]}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDraft((p) => ({
                            ...p,
                            attributes: { ...p.attributes, [attr]: Math.min(10, p.attributes[attr] + 1) },
                          }), true)}
                          className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Optional Skills */}
              <div className="rev-inset p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Optional Skills ({Object.values(draft.skills).filter((v) => v > 0).length} ranked)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSkillsSection((prev) => !prev)}
                    className="rev-btn-secondary px-2.5 py-1 text-[11px] font-bold"
                  >
                    {showSkillsSection ? 'Hide Skill Grid' : 'Edit Skills'}
                  </button>
                </div>

                {!showSkillsSection ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(draft.skills).filter(([, r]) => r > 0).length === 0 ? (
                      <span className="text-xs italic" style={{ color: 'var(--rev-text-faint)' }}>
                        No skill ranks configured (click &ldquo;Edit Skills&rdquo; to add if needed).
                      </span>
                    ) : (
                      Object.entries(draft.skills)
                        .filter(([, r]) => r > 0)
                        .map(([skill, rank]) => (
                          <span key={skill} className="px-2 py-0.5 rounded bg-black/30 border border-gray-700 text-xs font-semibold tabular-nums">
                            {skill} <strong>+{rank}</strong>
                          </span>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--rev-text-faint)' }}>
                        Core Skills
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {CORE_SKILLS.map((skill) => {
                          const val = draft.skills[skill] ?? 0;
                          return (
                            <div key={skill} className="flex items-center justify-between bg-black/25 px-2.5 py-1.5 rounded border border-gray-700/50 text-xs">
                              <span className="truncate">{skill}</span>
                              <input
                                type="number"
                                min={0}
                                max={8}
                                value={val}
                                onChange={(e) => {
                                  const next = Math.max(0, Math.min(8, Number.parseInt(e.target.value, 10) || 0));
                                  updateDraft((p) => ({
                                    ...p,
                                    skills: { ...p.skills, [skill]: next },
                                  }));
                                }}
                                onBlur={() => handleSaveDraft()}
                                className="w-10 rev-input px-1 py-0.5 text-center font-bold tabular-nums"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--rev-text-faint)' }}>
                        Special Skills
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {SPECIAL_SKILLS.map((skill) => {
                          const val = draft.skills[skill] ?? 0;
                          return (
                            <div key={skill} className="flex items-center justify-between bg-black/25 px-2.5 py-1.5 rounded border border-gray-700/50 text-xs">
                              <span className="truncate">{skill}</span>
                              <input
                                type="number"
                                min={0}
                                max={8}
                                value={val}
                                onChange={(e) => {
                                  const next = Math.max(0, Math.min(8, Number.parseInt(e.target.value, 10) || 0));
                                  updateDraft((p) => ({
                                    ...p,
                                    skills: { ...p.skills, [skill]: next },
                                  }));
                                }}
                                onBlur={() => handleSaveDraft()}
                                className="w-10 rev-input px-1 py-0.5 text-center font-bold tabular-nums"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Optional Convictions & Failings */}
              <div className="rev-inset p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Optional Convictions &amp; Failings ({draft.convictions.length} / {draft.failings.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNarrativeSection((prev) => !prev)}
                    className="rev-btn-secondary px-2.5 py-1 text-[11px] font-bold"
                  >
                    {showNarrativeSection ? 'Collapse' : 'Manage'}
                  </button>
                </div>

                {showNarrativeSection && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Convictions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-faint)' }}>
                          Convictions
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDraft((p) => ({
                            ...p,
                            convictions: [...p.convictions, { season: 'Vamor', name: 'New Conviction', statement: '', rank: 1 }],
                          }), true)}
                          className="text-xs font-bold hover:underline"
                          style={{ color: 'var(--rev-accent-text)' }}
                        >
                          + Add Conviction
                        </button>
                      </div>
                      {draft.convictions.map((c, idx) => (
                        <div key={idx} className="bg-black/25 border border-gray-700/60 rounded p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={c.season}
                              onChange={(e) => {
                                const season = e.target.value;
                                updateDraft((p) => ({
                                  ...p,
                                  convictions: p.convictions.map((it, i) => (i === idx ? { ...it, season } : it)),
                                }), true);
                              }}
                              className={`rev-input px-2 py-1 text-xs font-bold ${getSeasonTextClass(c.season)}`}
                            >
                              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input
                              type="text"
                              value={c.name}
                              list="npc-compendium-convictions"
                              onChange={(e) => {
                                const val = e.target.value;
                                const match = getConvictions().find((entry) => entry.name.toLowerCase() === val.toLowerCase());
                                updateDraft((p) => ({
                                  ...p,
                                  convictions: p.convictions.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          name: val,
                                          ...(match ? { season: match.data?.season || it.season, statement: match.data?.statement || it.statement } : {}),
                                        }
                                      : it
                                  ),
                                }));
                              }}
                              onBlur={() => handleSaveDraft()}
                              placeholder="Conviction name..."
                              className="flex-1 min-w-0 rev-input px-2 py-1 text-xs"
                            />
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={c.rank}
                              onChange={(e) => {
                                const rank = Math.max(1, Math.min(5, Number(e.target.value) || 1));
                                updateDraft((p) => ({
                                  ...p,
                                  convictions: p.convictions.map((it, i) => (i === idx ? { ...it, rank } : it)),
                                }), true);
                              }}
                              className="w-12 rev-input px-1 py-1 text-xs text-center tabular-nums"
                              title="Rank"
                            />
                            <button
                              type="button"
                              onClick={() => updateDraft((p) => ({
                                ...p,
                                convictions: p.convictions.filter((_, i) => i !== idx),
                              }), true)}
                              className="rev-icon-btn rev-icon-btn-danger text-sm"
                            >
                              ×
                            </button>
                          </div>
                          <input
                            type="text"
                            value={c.statement}
                            onChange={(e) => {
                              const statement = e.target.value;
                              updateDraft((p) => ({
                                ...p,
                                convictions: p.convictions.map((it, i) => (i === idx ? { ...it, statement } : it)),
                              }));
                            }}
                            onBlur={() => handleSaveDraft()}
                            placeholder="Statement..."
                            className="w-full rev-input px-2 py-1 text-[11px]"
                          />
                        </div>
                      ))}
                      <datalist id="npc-compendium-convictions">
                        {getConvictions().map((c) => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>

                    {/* Failings */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-faint)' }}>
                          Failings
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDraft((p) => ({
                            ...p,
                            failings: [...p.failings, { name: 'New Failing', statement: '', rank: 1 }],
                          }), true)}
                          className="text-xs font-bold hover:underline"
                          style={{ color: 'var(--rev-accent-text)' }}
                        >
                          + Add Failing
                        </button>
                      </div>
                      {draft.failings.map((f, idx) => (
                        <div key={idx} className="bg-black/25 border border-gray-700/60 rounded p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={f.name}
                              list="npc-compendium-failings"
                              onChange={(e) => {
                                const val = e.target.value;
                                const match = getFailings().find((entry) => entry.name.toLowerCase() === val.toLowerCase());
                                updateDraft((p) => ({
                                  ...p,
                                  failings: p.failings.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          name: val,
                                          ...(match ? { statement: match.data?.statement || it.statement } : {}),
                                        }
                                      : it
                                  ),
                                }));
                              }}
                              onBlur={() => handleSaveDraft()}
                              placeholder="Failing name..."
                              className="flex-1 min-w-0 rev-input px-2 py-1 text-xs"
                            />
                            <input
                              type="number"
                              min={1}
                              max={4}
                              value={f.rank}
                              onChange={(e) => {
                                const rank = Math.max(1, Math.min(4, Number(e.target.value) || 1));
                                updateDraft((p) => ({
                                  ...p,
                                  failings: p.failings.map((it, i) => (i === idx ? { ...it, rank } : it)),
                                }), true);
                              }}
                              className="w-12 rev-input px-1 py-1 text-xs text-center tabular-nums"
                              title="Rank"
                            />
                            <button
                              type="button"
                              onClick={() => updateDraft((p) => ({
                                ...p,
                                failings: p.failings.filter((_, i) => i !== idx),
                              }), true)}
                              className="rev-icon-btn rev-icon-btn-danger text-sm"
                            >
                              ×
                            </button>
                          </div>
                          <input
                            type="text"
                            value={f.statement}
                            onChange={(e) => {
                              const statement = e.target.value;
                              updateDraft((p) => ({
                                ...p,
                                failings: p.failings.map((it, i) => (i === idx ? { ...it, statement } : it)),
                              }));
                            }}
                            onBlur={() => handleSaveDraft()}
                            placeholder="Failing description..."
                            className="w-full rev-input px-2 py-1 text-[11px]"
                          />
                        </div>
                      ))}
                      <datalist id="npc-compendium-failings">
                        {getFailings().map((f) => <option key={f.id} value={f.name} />)}
                      </datalist>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Combat Abilities */}
              <div className="rev-inset p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Combat Abilities ({draft.abilities.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setAbilitySearch(''); setAbilityPickerOpen(true); }}
                      className="rev-btn-secondary px-3 py-1 text-xs font-bold"
                    >
                      + From Compendium
                    </button>
                    <button
                      type="button"
                      onClick={addCustomAbility}
                      className="rev-btn-primary px-3 py-1 text-xs font-bold"
                    >
                      + Custom Ability
                    </button>
                  </div>
                </div>

                {draft.abilities.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--rev-text-faint)' }}>
                    No abilities added yet. Basic combat actions can still be used in combat, or add creature abilities above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {draft.abilities.map((ab, idx) => {
                      const speedData = ab.speed ? getSpeedData(ab.speed, ab.upkeep) : null;
                      return (
                        <div key={ab.id} className="bg-black/25 border border-gray-700/70 rounded-lg p-3 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={ab.name}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              className="flex-1 min-w-[160px] rev-input px-2.5 py-1 text-sm font-bold"
                              placeholder="Ability Name"
                            />
                            <select
                              value={ab.type}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, type: e.target.value as any } : x)),
                              }), true)}
                              className="rev-input px-2 py-1 text-xs font-bold"
                            >
                              <option value="attack">Attack</option>
                              <option value="defensive">Defensive</option>
                              <option value="utility">Utility</option>
                              <option value="passive">Passive</option>
                            </select>
                            <select
                              value={ab.speed}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, speed: e.target.value as any } : x)),
                              }), true)}
                              className="rev-input px-2 py-1 text-xs font-bold"
                            >
                              <option value=">>>">&gt;&gt;&gt; Slow (3)</option>
                              <option value=">>">&gt;&gt; Avg (2)</option>
                              <option value=">">&gt; Swift (1)</option>
                              <option value="|">| Instant (0)</option>
                              <option value="<">&lt; Reaction</option>
                              <option value="">No Speed</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.filter((_, i) => i !== idx),
                              }), true)}
                              className="rev-icon-btn rev-icon-btn-danger text-base"
                              aria-label="Remove ability"
                            >
                              ×
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <input
                              type="text"
                              value={ab.range || ''}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, range: e.target.value } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              placeholder="Range (e.g. Adjacent)"
                              className="rev-input px-2 py-1 text-xs"
                            />
                            <input
                              type="number"
                              min={0}
                              value={ab.snCost}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, snCost: Math.max(0, Number(e.target.value) || 0) } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              placeholder="SN Cost"
                              className="rev-input px-2 py-1 text-xs text-center tabular-nums"
                            />
                            <input
                              type="text"
                              value={ab.acc || ''}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, acc: e.target.value } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              placeholder="ACC (e.g. +1)"
                              className="rev-input px-2 py-1 text-xs text-center"
                            />
                            <input
                              type="text"
                              value={ab.dmg || ''}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, dmg: e.target.value } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              placeholder="DMG (e.g. +2)"
                              className="rev-input px-2 py-1 text-xs text-center"
                            />
                            <input
                              type="text"
                              value={ab.eva || ''}
                              onChange={(e) => updateDraft((p) => ({
                                ...p,
                                abilities: p.abilities.map((x, i) => (i === idx ? { ...x, eva: e.target.value } : x)),
                              }))}
                              onBlur={() => handleSaveDraft()}
                              placeholder="EVA (e.g. +2)"
                              className="rev-input px-2 py-1 text-xs text-center"
                            />
                          </div>

                          <textarea
                            rows={2}
                            value={ab.effect}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              abilities: p.abilities.map((x, i) => (i === idx ? { ...x, effect: e.target.value } : x)),
                            }))}
                            onBlur={() => handleSaveDraft()}
                            placeholder="Effect (keywords like Pierce 2, Break 1, Bleeding 2, Stun 1 auto-highlight)..."
                            className="w-full rev-input px-2.5 py-1.5 text-xs resize-y"
                          />

                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className={`rev-ability-pill ${getTypeStyle(ab.type)}`}>{ab.type}</span>
                            <SpeedTagPills speedData={speedData} />
                            {ab.effect && (
                              <span className="text-[11px] ml-1" style={{ color: 'var(--rev-text-secondary)' }}>
                                <KeywordText text={ab.effect} mode="effect" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 7: Equipment & Items */}
              <div className="rev-inset p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
                    Equipment &amp; Items ({draft.items.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setItemSearch(''); setItemPickerOpen(true); }}
                      className="rev-btn-secondary px-3 py-1 text-xs font-bold"
                    >
                      + From Compendium
                    </button>
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="rev-btn-primary px-3 py-1 text-xs font-bold"
                    >
                      + Custom Item
                    </button>
                  </div>
                </div>

                {draft.items.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--rev-text-faint)' }}>
                    No weapons, armour, or items assigned.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {draft.items.map((item, idx) => (
                      <div key={item.id} className="bg-black/25 border border-gray-700/70 rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              items: p.items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                            }))}
                            onBlur={() => handleSaveDraft()}
                            className="flex-1 min-w-[150px] rev-input px-2.5 py-1 text-sm font-bold"
                            placeholder="Item Name"
                          />
                          <select
                            value={item.equippedSlot || 'extra'}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              items: p.items.map((x, i) => (i === idx ? { ...x, equippedSlot: e.target.value as any } : x)),
                            }), true)}
                            className="rev-input px-2 py-1 text-xs font-bold"
                          >
                            <option value="mainHand">Main Hand</option>
                            <option value="offHand">Off Hand</option>
                            <option value="armour">Armour</option>
                            <option value="extra">Equipped / Carried</option>
                          </select>
                          <input
                            type="text"
                            value={item.dmg || ''}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              items: p.items.map((x, i) => (i === idx ? { ...x, dmg: e.target.value } : x)),
                            }))}
                            onBlur={() => handleSaveDraft()}
                            placeholder="DMG (e.g. 3 or 1H 3 / 2H 4)"
                            className="w-32 rev-input px-2 py-1 text-xs text-center"
                          />
                          <input
                            type="text"
                            value={item.range || ''}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              items: p.items.map((x, i) => (i === idx ? { ...x, range: e.target.value } : x)),
                            }))}
                            onBlur={() => handleSaveDraft()}
                            placeholder="Range"
                            className="w-24 rev-input px-2 py-1 text-xs text-center"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.ap ?? 0}
                            onChange={(e) => updateDraft((p) => ({
                              ...p,
                              items: p.items.map((x, i) => (i === idx ? { ...x, ap: Math.max(0, Number(e.target.value) || 0) } : x)),
                            }))}
                            onBlur={() => handleSaveDraft()}
                            placeholder="AP"
                            title="AP"
                            className="w-14 rev-input px-1.5 py-1 text-xs text-center tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => updateDraft((p) => ({
                              ...p,
                              items: p.items.filter((_, i) => i !== idx),
                            }), true)}
                            className="rev-icon-btn rev-icon-btn-danger text-base"
                            aria-label="Remove item"
                          >
                            ×
                          </button>
                        </div>

                        <input
                          type="text"
                          value={item.effect || ''}
                          onChange={(e) => updateDraft((p) => ({
                            ...p,
                            items: p.items.map((x, i) => (i === idx ? { ...x, effect: e.target.value } : x)),
                          }))}
                          onBlur={() => handleSaveDraft()}
                          placeholder="Item effect / traits (e.g. Pierce 1, Break 2)..."
                          className="w-full rev-input px-2.5 py-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compendium Ability Picker Modal */}
      {abilityPickerOpen && createPortal(
        <div
          className="fixed inset-0 z-[220] rev-backdrop flex items-center justify-center p-4"
          onClick={() => setAbilityPickerOpen(false)}
        >
          <div
            className="sheet-modal max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft">
              <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text-bright)' }}>
                Add Ability from Compendium
              </h3>
              <button type="button" onClick={() => setAbilityPickerOpen(false)} className="rev-icon-btn rev-icon-btn-edit text-xl" aria-label="Close">
                ×
              </button>
            </div>
            <div className="p-3 border-b rev-divider">
              <input
                type="search"
                value={abilitySearch}
                onChange={(e) => setAbilitySearch(e.target.value)}
                placeholder="Search abilities by name, discipline, or class..."
                className="rev-input w-full px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {compendiumAbilities.map((ab) => (
                <button
                  key={ab.id}
                  type="button"
                  onClick={() => addCompendiumAbility(ab)}
                  className="w-full text-left rev-card p-3 hover:border-[var(--rev-accent-border)] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--rev-text-bright)' }}>{ab.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-accent-text)' }}>
                      {ab.data?.source || 'Compendium'}
                    </span>
                  </div>
                  {ab.data?.description && (
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--rev-text-muted)' }}>
                      {ab.data.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Compendium Item Picker Modal */}
      {itemPickerOpen && createPortal(
        <div
          className="fixed inset-0 z-[220] rev-backdrop flex items-center justify-center p-4"
          onClick={() => setItemPickerOpen(false)}
        >
          <div
            className="sheet-modal max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft">
              <h3 className="font-spectral font-bold text-lg" style={{ color: 'var(--rev-text-bright)' }}>
                Add Item from Compendium
              </h3>
              <button type="button" onClick={() => setItemPickerOpen(false)} className="rev-icon-btn rev-icon-btn-edit text-xl" aria-label="Close">
                ×
              </button>
            </div>
            <div className="p-3 border-b rev-divider">
              <input
                type="search"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search weapons, armour, or gear..."
                className="rev-input w-full px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {compendiumItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => addCompendiumItem(it)}
                  className="w-full text-left rev-card p-3 hover:border-[var(--rev-accent-border)] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--rev-text-bright)' }}>{it.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-accent-text)' }}>
                      {[it.data?.category, it.data?.subtype].filter(Boolean).join(' · ') || 'Item'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--rev-text-muted)' }}>
                    {it.data?.dmg && <span>DMG: {it.data.dmg}</span>}
                    {it.data?.ap && <span>AP: {it.data.ap}</span>}
                    {it.data?.range && <span>Range: {it.data.range}</span>}
                    {it.data?.effect && <span className="truncate">{it.data.effect}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
