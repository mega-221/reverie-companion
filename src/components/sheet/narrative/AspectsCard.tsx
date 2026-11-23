import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character, CompendiumEntry } from '../../../types';
import { useCompendium } from '../../../CompendiumContext';
import { dpMax, aspectSlotMax } from '../../../calc';
import { useConfirm } from '../ConfirmDialog';
import { SKILL_GROUPS } from '../utils';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import { splitLines } from '../../../constants/reverie';

const ASPECT_CATEGORY_ORDER = [
  'Grit',
  'Reflex',
  'Intellect',
  'Psyche',
  'Comfort',
  'Tactics',
  'Virtue',
  'Degradation',
] as const;

type CategoryStyle = {
  headerBg: string;
  headerText: string;
  headerBorder: string;
  cardBorder: string;
  quoteBorder: string;
  badgeClass: string;
  dotClass: string;
  filterActiveClass: string;
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Attribute-dependent aspects mirror SKILL_GROUPS attribute font colors
  Grit: {
    headerBg: 'bg-red-950/80',
    headerText: SKILL_GROUPS.grt.color,
    headerBorder: 'border-red-900',
    cardBorder: 'border-red-900/60',
    quoteBorder: 'border-l-red-500',
    badgeClass: 'rev-dark-card bg-red-950/70 text-red-500 border-red-900',
    dotClass: 'bg-red-500',
    filterActiveClass: 'rev-dark-card bg-red-950/80 text-red-500 border-red-700',
  },
  Reflex: {
    headerBg: 'bg-green-950/80',
    headerText: SKILL_GROUPS.ref.color,
    headerBorder: 'border-green-900',
    cardBorder: 'border-green-900/60',
    quoteBorder: 'border-l-green-500',
    badgeClass: 'rev-dark-card bg-green-950/70 text-green-500 border-green-900',
    dotClass: 'bg-green-500',
    filterActiveClass: 'rev-dark-card bg-green-950/80 text-green-500 border-green-700',
  },
  Intellect: {
    headerBg: 'bg-blue-950/80',
    headerText: SKILL_GROUPS.int.color,
    headerBorder: 'border-blue-900',
    cardBorder: 'border-blue-900/60',
    quoteBorder: 'border-l-blue-500',
    badgeClass: 'rev-dark-card bg-blue-950/70 text-blue-500 border-blue-900',
    dotClass: 'bg-blue-500',
    filterActiveClass: 'rev-dark-card bg-blue-950/80 text-blue-500 border-blue-700',
  },
  Psyche: {
    headerBg: 'bg-purple-950/80',
    headerText: SKILL_GROUPS.psy.color,
    headerBorder: 'border-purple-900',
    cardBorder: 'border-purple-900/60',
    quoteBorder: 'border-l-purple-500',
    badgeClass: 'rev-dark-card bg-purple-950/70 text-purple-500 border-purple-900',
    dotClass: 'bg-purple-500',
    filterActiveClass: 'rev-dark-card bg-purple-950/80 text-purple-500 border-purple-700',
  },
  // Tactics: Dark Magenta 2 (#741b47)
  Tactics: {
    headerBg: 'bg-[#741b47]',
    headerText: 'text-fuchsia-100',
    headerBorder: 'border-[#992b61]',
    cardBorder: 'border-[#741b47]/80',
    quoteBorder: 'border-l-[#a64d79]',
    badgeClass: 'rev-dark-card bg-[#741b47]/90 text-fuchsia-100 border-[#992b61]',
    dotClass: 'bg-[#a64d79]',
    filterActiveClass: 'rev-dark-card bg-[#741b47] text-fuchsia-100 border-[#a64d79]',
  },
  // Virtue: Dark Orange 2 (#b45f06)
  Virtue: {
    headerBg: 'bg-[#b45f06]',
    headerText: 'text-amber-50',
    headerBorder: 'border-[#d47514]',
    cardBorder: 'border-[#b45f06]/80',
    quoteBorder: 'border-l-[#e69138]',
    badgeClass: 'rev-dark-card bg-[#b45f06]/90 text-amber-50 border-[#d47514]',
    dotClass: 'bg-[#e69138]',
    filterActiveClass: 'rev-dark-card bg-[#b45f06] text-amber-50 border-[#e69138]',
  },
  // Comfort: Dark Cyan 2 (#134f5c)
  Comfort: {
    headerBg: 'bg-[#134f5c]',
    headerText: 'text-cyan-50',
    headerBorder: 'border-[#1d6e80]',
    cardBorder: 'border-[#134f5c]/80',
    quoteBorder: 'border-l-[#45818e]',
    badgeClass: 'rev-dark-card bg-[#134f5c]/90 text-cyan-50 border-[#1d6e80]',
    dotClass: 'bg-[#45818e]',
    filterActiveClass: 'rev-dark-card bg-[#134f5c] text-cyan-50 border-[#45818e]',
  },
  // Degradation: Black (#000000)
  Degradation: {
    headerBg: 'bg-black',
    headerText: 'text-gray-200',
    headerBorder: 'border-zinc-700',
    cardBorder: 'border-zinc-700',
    quoteBorder: 'border-l-zinc-500',
    badgeClass: 'rev-dark-card bg-black text-gray-200 border-zinc-700',
    dotClass: 'bg-zinc-400',
    filterActiveClass: 'rev-dark-card bg-black text-gray-100 border-zinc-500',
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  headerBg: 'bg-gray-900',
  headerText: 'text-gray-200',
  headerBorder: 'border-gray-700',
  cardBorder: 'border-[#374151]',
  quoteBorder: 'border-l-gray-500',
  badgeClass: 'rev-dark-card rev-keep-color bg-gray-800 text-gray-300 border-gray-600',
  dotClass: 'bg-gray-400',
  filterActiveClass: 'rev-dark-card rev-keep-color bg-red-900/50 text-red-200 border-red-700',
};

function cleanCategoryLabel(raw?: string): string {
  if (!raw) return 'General';
  return raw.replace(/\s*aspects?\s*$/i, '').trim() || 'General';
}

function getCategoryStyle(category?: string): CategoryStyle {
  const clean = cleanCategoryLabel(category);
  return CATEGORY_STYLES[clean] || DEFAULT_CATEGORY_STYLE;
}

function normalizeRequirements(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|\\n|•/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function AspectSelectorModal({
  isOpen,
  onClose,
  onSelect,
  existingNames,
  currentName,
  isAdoption,
  dpCost,
  availableDp,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entry: CompendiumEntry) => void;
  existingNames: string[];
  currentName?: string;
  isAdoption: boolean;
  dpCost: number;
  availableDp: number;
}) {
  const { getAspects } = useCompendium();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useBodyScrollLock(Boolean(isOpen));

  useEscapeKey(Boolean(isOpen), onClose);

  if (!isOpen) return null;

  const allAspects = getAspects();

  const extraCategories = Array.from(
    new Set(
      allAspects
        .map((a) => cleanCategoryLabel(a.data?.category))
        .filter((cat) => !ASPECT_CATEGORY_ORDER.includes(cat as any))
    )
  ).sort();

  const filterCategories = ['All', ...ASPECT_CATEGORY_ORDER, ...extraCategories];

  const filteredAspects =
    selectedCategory === 'All'
      ? allAspects
      : allAspects.filter((a) => cleanCategoryLabel(a.data?.category) === selectedCategory);

  const groupedCategories = (selectedCategory === 'All'
    ? [...ASPECT_CATEGORY_ORDER, ...extraCategories]
    : [selectedCategory]
  )
    .map((cat) => ({
      category: cat,
      items: filteredAspects
        .filter((a) => cleanCategoryLabel(a.data?.category) === cat)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sheet-modal animate-in zoom-in-95 duration-200 max-w-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-black/20 shrink-0">
          <h2 className="font-bold text-xl text-gray-200">Select Aspect</h2>
          <div className="flex items-center gap-3">
            {isAdoption && (
              <div className="text-xs font-bold tabular-nums bg-black/40 border border-gray-700 rounded px-2.5 py-1 text-gray-300">
                Cost: <span className="text-cyan-400">{dpCost} DP</span> · Available:{' '}
                <span className={availableDp >= dpCost ? 'text-cyan-400' : 'text-red-400'}>
                  {availableDp} / {dpCost}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded font-bold text-2xl leading-none px-2 py-0.5 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Category Filter Bar — mirrors AbilityModal */}
        <div className="p-4 border-b border-gray-700 bg-black/10 shrink-0">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            Filter by Category
          </label>
          <div className="flex flex-wrap gap-2">
            {filterCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const style = cat === 'All' ? DEFAULT_CATEGORY_STYLE : getCategoryStyle(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setExpandedId(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors border ${
                    isSelected
                      ? style.filterActiveClass
                      : 'bg-black/30 text-gray-400 border-gray-700 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspects List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
          {allAspects.length === 0 ? (
            <p className="text-center text-gray-500 italic py-8">
              No aspects found in compendium.
            </p>
          ) : groupedCategories.length === 0 ? (
            <p className="text-center text-gray-500 italic py-8">
              No aspects found in {selectedCategory}.
            </p>
          ) : (
            groupedCategories.map(({ category, items }) => {
              const style = getCategoryStyle(category);
              return (
                <div key={category}>
                  <div
                    className={`rev-aspect-card bg-black/20 text-xs font-bold uppercase tracking-widest py-2 border-b border-gray-700 mb-2 px-2 rounded-t ${style.headerText}`}
                  >
                    {category}
                  </div>
                  <div className="space-y-2">
                    {items.map((aspect) => {
                      const isExpanded = expandedId === aspect.id;
                      const isCurrent = currentName === aspect.name;
                      const isAlreadyOwned =
                        !isCurrent && existingNames.includes(aspect.name);
                      const reqs = normalizeRequirements(aspect.data?.requirements);
                      const primaryReq = reqs[0];
                      const upside = aspect.data?.upside;
                      const downside = aspect.data?.downside;
                      const lore = aspect.data?.description;

                      return (
                        <div
                          key={aspect.id}
                          className={`rev-aspect-card bg-black/20 border rounded-lg overflow-hidden transition-all duration-200 ${
                            isExpanded
                              ? 'ring-1 ring-red-900 shadow-md border-gray-600'
                              : isCurrent
                              ? 'border-red-700/70'
                              : 'border-gray-700'
                          } ${isAlreadyOwned ? 'opacity-60' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : aspect.id)
                            }
                            className="w-full text-left p-3 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                          >
                            <span className="font-bold text-gray-200 group-hover:text-white truncate">
                              {aspect.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.badgeClass}`}
                              >
                                {category}
                              </span>
                              {primaryReq && (
                                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 border border-gray-600">
                                  {primaryReq}
                                </span>
                              )}
                              {isAlreadyOwned && (
                                <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-400 border border-gray-600">
                                  Adopted
                                </span>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-4 border-t border-gray-700 bg-black/40 space-y-3">
                              {lore && (
                                <div
                                  className={`text-sm italic text-gray-200 border-l-2 pl-3 leading-relaxed ${style.quoteBorder}`}
                                >
                                  {splitLines(lore).map((line: string, idx: number) => (
                                      <span key={idx} className="block mb-1 last:mb-0">
                                        {line}
                                      </span>
                                    ))}
                                </div>
                              )}

                              <div className="space-y-2">
                                {upside && (
                                  <div className="rev-keep-color flex items-start gap-2.5 bg-emerald-950/20 border border-emerald-900/50 rounded-md px-3 py-2">
                                    <span className="shrink-0 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/70 text-emerald-300">
                                      [+]
                                    </span>
                                    <span className="text-xs text-emerald-100/90 leading-relaxed pt-0.5">
                                      {upside}
                                    </span>
                                  </div>
                                )}

                                {downside && (
                                  <div className="rev-keep-color flex items-start gap-2.5 bg-red-950/20 border border-red-900/50 rounded-md px-3 py-2">
                                    <span className="shrink-0 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-700/70 text-red-300">
                                      [-]
                                    </span>
                                    <span className="text-xs text-red-100/90 leading-relaxed pt-0.5">
                                      {downside}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {reqs.length > 0 && (
                                <div className="bg-black/30 border border-gray-800 rounded-md px-3 py-2">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                    Requirements
                                  </div>
                                  <ul className="space-y-0.5 text-xs text-gray-300">
                                    {reqs.map((req, rIdx) => (
                                      <li key={rIdx} className="flex items-start gap-2">
                                        <span className="text-gray-500">•</span>
                                        <span>{req}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={isAlreadyOwned || (isAdoption && availableDp < dpCost)}
                                onClick={() => {
                                  onSelect(aspect);
                                  onClose();
                                }}
                                className={`w-full py-2 font-bold text-sm rounded transition-colors ${
                                  isAlreadyOwned || (isAdoption && availableDp < dpCost)
                                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                                    : 'bg-red-900 hover:bg-red-800 text-white'
                                }`}
                              >
                                {isAlreadyOwned
                                  ? 'Already Adopted'
                                  : isAdoption
                                  ? availableDp < dpCost
                                    ? `Insufficient DP (${availableDp} / ${dpCost})`
                                    : `Adopt Aspect (${dpCost} DP)`
                                  : 'Confirm Swap'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AspectsCard({
  char,
  patch,
}: {
  char: Character;
  patch: (p: any) => void;
}) {
  const { getEntryByName } = useCompendium();
  const { askConfirm, confirmDialog } = useConfirm();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [expandedLore, setExpandedLore] = useState<Record<string, boolean>>({});
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null);

  const aspects = char.data.aspects || [];
  const safeMobileIndex = aspects.length > 0 ? Math.min(mobileIndex, aspects.length - 1) : 0;

  const stepMobileAspect = (delta: -1 | 1) => {
    if (aspects.length <= 1) return;
    const current = Math.min(mobileIndex, aspects.length - 1);
    const nextIndex = (current + delta + aspects.length) % aspects.length;
    setLeavingIndex(current);
    setSlideDir(delta > 0 ? 'next' : 'prev');
    setMobileIndex(nextIndex);
  };
  const maxAspectSlots = aspectSlotMax(char.data);
  const canAddAspect = aspects.length < maxAspectSlots;
  const existingNames = aspects.map((a) => a.name).filter(Boolean);
  const dpCost = dpMax(char.data);
  const availableDp = char.data.trackers.dp;
  const canAffordDp = availableDp >= dpCost;
  const isPickerAdoption =
    pickerIndex !== null &&
    (pickerIndex >= aspects.length || !aspects[pickerIndex]?.name);

  const toggleLore = (key: string) => {
    setExpandedReqs((prev) => ({ ...prev, [key]: false }));
    setExpandedLore((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleReqs = (key: string) => {
    setExpandedLore((prev) => ({ ...prev, [key]: false }));
    setExpandedReqs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...aspects];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    patch({ aspects: next });
    setDraggedIndex(null);
    setDragOverIndex(null);
    setEditingIndex(null);
  };

  const moveAspect = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= aspects.length) return;
    const next = [...aspects];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    patch({ aspects: next });
    setEditingIndex(targetIndex);
  };

  const abandonAspect = (index: number) => {
    const next = [...aspects];
    next[index] = { ...next[index], abandoned: true };
    patch({ aspects: next });
    setEditingIndex(null);
  };

  const restoreAspect = (index: number) => {
    if (availableDp < dpCost) return;
    const next = [...aspects];
    next[index] = { ...next[index], abandoned: false };
    patch({
      aspects: next,
      trackers: { ...char.data.trackers, dp: availableDp - dpCost },
    });
    setEditingIndex(null);
  };

  const eraseAspect = async (index: number, name: string) => {
    const ok = await askConfirm({
      title: 'Erase Aspect',
      message: `Permanently erase ${name || 'this aspect'}?`,
      confirmLabel: 'Erase',
      tone: 'danger',
    });
    if (!ok) return;
    patch({ aspects: aspects.filter((_, idx) => idx !== index) });
    setEditingIndex(null);
  };

  return (
    <section className="sheet-panel p-3.5 sm:p-5 w-full min-h-[385px] sm:min-h-[405px] flex flex-col">
      {confirmDialog}

      {/* Header matching ConvictionsCard */}
      <div className="flex flex-wrap justify-between items-end mb-4 sm:mb-6 border-b border-gray-700 pb-2 gap-3 shrink-0">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-xl font-spectral first-letter:font-cinzelDeco first-letter:text-[1.2em] first-letter:text-red-500 truncate text-gray-200">
            Aspects
          </h2>
          <span
            className={`text-[11px] font-bold uppercase tracking-widest tabular-nums shrink-0 ${
              aspects.length > maxAspectSlots ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {aspects.length} / {maxAspectSlots}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!canAddAspect) return;
            setPickerIndex(aspects.length);
          }}
          disabled={!canAddAspect}
          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
            canAddAspect
              ? 'text-cyan-400 border-cyan-800 hover:bg-cyan-950/40 hover:text-cyan-300'
              : 'text-gray-600 border-gray-700 cursor-not-allowed'
          }`}
          title={
            canAddAspect
              ? 'Add new aspect'
              : maxAspectSlots === 0
              ? 'Unlock Aspect Slots via Tier Advancements in Progression'
              : `All ${maxAspectSlots} unlocked Aspect slot(s) filled`
          }
        >
          + Add
        </button>
      </div>

      {/* Empty State */}
      {aspects.length === 0 && (
        <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 text-center gap-1.5">
          <p className="text-gray-500 italic text-sm">No aspects adopted yet.</p>
          {maxAspectSlots === 0 && (
            <p className="text-xs text-gray-500/80 italic">
              Unlock Aspect Slots in the Progression tab to adopt aspects.
            </p>
          )}
        </div>
      )}

      {/* Centered, Standardized, Rearrangeable Card Grid (buttons-only stepper on mobile, centered wrap on sm+) */}
      {aspects.length > 0 && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="relative flex flex-wrap justify-center items-stretch gap-4 sm:gap-5 w-full py-2 sm:py-0 overflow-visible">
            {aspects.map((slot, i) => {
              const slotKey = slot.id || `${slot.name}-${i}`;
              const entry = slot.name ? getEntryByName(slot.name) : undefined;
              const category = cleanCategoryLabel(entry?.data?.category);
              const style = getCategoryStyle(category);
              const lore = entry?.data?.description || '';
              const upside = entry?.data?.upside || '';
              const downside = entry?.data?.downside || '';
              const requirements = normalizeRequirements(entry?.data?.requirements);
              const isEditing = editingIndex === i;
              const isAbandoned = Boolean(slot.abandoned);
              const isLoreOpen = Boolean(expandedLore[slotKey]);
              const isReqsOpen = Boolean(expandedReqs[slotKey]);
              const isDragging = draggedIndex === i;
              const isDragTarget = dragOverIndex === i && draggedIndex !== i;
              const isMobileActive = i === safeMobileIndex;
              const isMobileLeaving = slideDir !== null && i === leavingIndex && i !== safeMobileIndex;

              return (
                <div
                  key={slotKey}
                  draggable={!isEditing}
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onAnimationEnd={(e) => {
                    if (e.target === e.currentTarget && isMobileActive) {
                      setSlideDir(null);
                      setLeavingIndex(null);
                    }
                  }}
                  className={`rev-aspect-card w-[290px] h-[355px] sm:h-auto sm:min-h-[330px] shrink-0 bg-gray-900 border rounded-xl overflow-hidden flex-col shadow-md transition-colors duration-200 ${
                    isMobileActive
                      ? `relative flex ${
                          slideDir === 'next'
                            ? 'animate-deck-in-next sm:animate-none'
                            : slideDir === 'prev'
                            ? 'animate-deck-in-prev sm:animate-none'
                            : ''
                        }`
                      : isMobileLeaving
                      ? `flex absolute top-2 inset-x-0 mx-auto pointer-events-none sm:static sm:pointer-events-auto ${
                          slideDir === 'next'
                            ? 'animate-deck-out-next sm:animate-none'
                            : 'animate-deck-out-prev sm:animate-none'
                        }`
                      : 'hidden sm:flex relative'
                  } ${
                    isAbandoned ? 'border-zinc-700' : style.cardBorder
                  } ${isDragging ? 'opacity-40 border-dashed border-gray-500 scale-[0.98]' : ''} ${
                    isDragTarget
                      ? draggedIndex! < i
                        ? 'ring-2 ring-red-500/80 border-r-4 border-r-red-500'
                        : 'ring-2 ring-red-500/80 border-l-4 border-l-red-500'
                      : ''
                  }`}
                >
                {/* ZONE 1: Category Header Band (fixed height, standardized across all cards) */}
                <div
                  className={`rev-dark-card grid grid-cols-3 items-center px-3.5 h-9 border-b shrink-0 ${
                    isAbandoned
                      ? 'bg-zinc-900 border-zinc-700'
                      : `${style.headerBg} ${style.headerBorder}`
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedLore((prev) => ({ ...prev, [slotKey]: false }));
                      setExpandedReqs((prev) => ({ ...prev, [slotKey]: false }));
                      setEditingIndex(i);
                    }}
                    className="justify-self-start text-gray-200/90 hover:text-white hover:bg-white/10 rounded transition-colors text-xs p-1 leading-none"
                    title="Edit Aspect"
                  >
                    ✎
                  </button>
                  <span
                    className={`justify-self-center text-[10px] font-bold uppercase tracking-[0.2em] truncate ${
                      isAbandoned ? 'text-zinc-400' : style.headerText
                    }`}
                  >
                    {slot.name ? category : 'Empty'}
                  </span>
                  <div
                    className="justify-self-end text-gray-300/70 hover:text-white cursor-grab active:cursor-grabbing px-1"
                    title="Drag card to reorder"
                  >
                    <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor">
                      <path d="M4 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>
                </div>

                {/* Greyed-out content wrapper when Abandoned */}
                <div
                  className={`flex-1 flex flex-col transition-all duration-200 ${
                    isAbandoned ? 'grayscale opacity-50' : ''
                  }`}
                >
                  {slot.name ? (
                    <>
                      {/* ZONE 2: Fixed-height Centered Aspect Name & "Read more" cue */}
                      <div className="px-3.5 h-[5rem] flex flex-col items-center justify-center gap-1 border-b border-gray-800/80 shrink-0 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleLore(slotKey)}
                          className="w-full text-center group flex flex-col items-center justify-center gap-1 focus:outline-none"
                          title={isLoreOpen ? 'Close lore' : 'Read more'}
                        >
                          <h3
                            className={`font-bold text-base leading-tight text-center line-clamp-2 transition-colors ${
                              isAbandoned
                                ? 'text-gray-400 line-through group-hover:text-gray-200'
                                : 'text-gray-100 group-hover:text-white'
                            }`}
                          >
                            {slot.name}
                          </h3>
                          <div className="flex items-center justify-center gap-1.5">
                            {isAbandoned && (
                              <span className="inline-block text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200">
                                Abandoned
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 group-hover:text-gray-300 transition-colors">
                              {isLoreOpen ? 'Show less ▲' : 'Read more ▼'}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* ZONE 3: Standardized Mechanics Zone ([+] & [-]) */}
                      <div className="px-4 py-3 flex-1 flex flex-col overflow-y-auto no-scrollbar">
                        <div className="my-auto flex flex-col gap-2.5">
                          {/* Positive [+] slot */}
                          <div className="rev-keep-color flex items-start gap-2 bg-emerald-950/20 border border-emerald-900/45 rounded-md px-2.5 py-2 min-h-[3.25rem]">
                            <span
                              className="shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-700/70 text-emerald-300"
                              title="Positive effect"
                            >
                              [+]
                            </span>
                            <span className="text-xs text-emerald-100/90 leading-snug pt-0.5">
                              {upside || '—'}
                            </span>
                          </div>

                          {/* Negative [-] slot */}
                          {downside && (
                            <div className="rev-keep-color flex items-start gap-2 bg-red-950/20 border border-red-900/45 rounded-md px-2.5 py-2 min-h-[3.25rem]">
                              <span
                                className="shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/90 border border-red-700/70 text-red-300"
                                title="Negative effect"
                              >
                                [-]
                              </span>
                              <span className="text-xs text-red-100/90 leading-snug pt-0.5">
                                {downside}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Spacer reserving height for the single bottom-anchored Requirements drawer */}
                      <div className="h-10 shrink-0" aria-hidden="true" />
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center min-h-[240px]">
                      <span className="text-xs uppercase tracking-widest text-gray-500 italic">
                        No aspect selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickerIndex(i)}
                        className="px-3 py-1.5 text-xs font-bold border border-dashed border-gray-600 rounded-md text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
                      >
                        + Select Aspect
                      </button>
                    </div>
                  )}
                </div>

                {/* Upward-Expanding Requirements Drawer (exact mirror of Lore drawer transition) */}
                {slot.name && (
                  <>
                    <div
                      aria-hidden={!isReqsOpen || isEditing || isLoreOpen}
                      className={`absolute inset-x-0 top-9 bottom-10 z-20 flex flex-col justify-end overflow-hidden ${
                        isReqsOpen && !isEditing && !isLoreOpen
                          ? 'pointer-events-auto'
                          : 'pointer-events-none'
                      }`}
                    >
                      <div
                        className={`w-full bg-gray-950 flex flex-col overflow-hidden transition-[height] duration-300 ease-out ${
                          isReqsOpen && !isEditing && !isLoreOpen
                            ? 'h-full border-t border-gray-700'
                            : 'h-0 border-t-0'
                        }`}
                      >
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col justify-center">
                          {requirements.length > 0 ? (
                            <ul className="space-y-1.5 text-xs text-gray-200">
                              {requirements.map((req, rIdx) => (
                                <li key={rIdx} className="flex items-start gap-2 leading-snug">
                                  <span className="text-gray-500 select-none">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-gray-500 italic text-center">None</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => toggleReqs(slotKey)}
                        className={`absolute inset-x-0 bottom-0 z-[22] w-full h-10 px-4 bg-gray-950 hover:bg-black/90 border-t flex items-center justify-between text-left transition-colors ${
                          isAbandoned && !isReqsOpen ? 'grayscale opacity-50' : ''
                        } ${isReqsOpen && !isLoreOpen ? 'border-gray-700' : 'border-gray-800'}`}
                        title={isReqsOpen ? 'Collapse requirements' : 'Click to view requirements'}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Requirements
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {isReqsOpen ? '▼' : '▲'}
                        </span>
                      </button>
                    )}
                  </>
                )}

                {/* Animated Downward-Expanding Lore Drawer (rolls down below Name Zone, solid opaque) */}
                {slot.name && (
                  <div
                    aria-hidden={!isLoreOpen || isEditing}
                    className={`absolute inset-x-0 top-[7.25rem] bottom-0 z-[25] flex flex-col justify-start overflow-hidden ${
                      isLoreOpen && !isEditing ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                  >
                    <div
                      className={`w-full bg-gray-900 flex flex-col overflow-hidden transition-[height] duration-300 ease-out ${
                        isLoreOpen && !isEditing ? 'h-full' : 'h-0'
                      }`}
                    >
                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col justify-center">
                        {lore ? (
                          <blockquote
                            className={`bg-black/30 border-l-2 rounded-r-md pl-3 pr-2.5 py-2.5 text-xs italic text-gray-200 leading-relaxed ${style.quoteBorder}`}
                          >
                            {splitLines(lore).map((line: string, idx: number) => (
                                <span key={idx} className="block mb-1.5 last:mb-0">
                                  {line}
                                </span>
                              ))}
                          </blockquote>
                        ) : (
                          <div className="text-xs italic text-gray-500 text-center">
                            {entry ? 'No lore recorded.' : 'Not found in compendium.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Overlay — mirrors ConvictionsCard */}
                {isEditing && (
                  <div className="absolute inset-0 z-30 bg-gray-900/95 backdrop-blur-sm p-4 flex flex-col gap-3.5 overflow-y-auto no-scrollbar animate-in fade-in duration-150">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2 shrink-0">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Edit Aspect {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="text-green-500 hover:text-green-400 text-sm font-bold"
                      >
                        Done
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Selected Aspect
                      </label>
                      <div className="flex items-center justify-between gap-2 bg-black/30 border border-gray-700 rounded-lg px-3 py-2.5">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rotate-45 shrink-0 ${
                              isAbandoned ? 'bg-zinc-500' : style.dotClass
                            }`}
                          />
                          <span className="text-sm font-bold text-gray-100 truncate">
                            {slot.name || 'Empty Slot'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickerIndex(i)}
                          className="text-gray-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold border-l border-gray-700 pl-2.5 pr-1.5 py-1 shrink-0 transition-colors"
                          title="Change Aspect"
                        >
                          ✎ Swap
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Order
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveAspect(i, -1)}
                          className="flex-1 py-2 rounded border border-gray-700 bg-black/30 hover:bg-white/5 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-gray-200 transition-colors"
                        >
                          ← Move Left
                        </button>
                        <button
                          type="button"
                          disabled={i === aspects.length - 1}
                          onClick={() => moveAspect(i, 1)}
                          className="flex-1 py-2 rounded border border-gray-700 bg-black/30 hover:bg-white/5 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-gray-200 transition-colors"
                        >
                          Move Right →
                        </button>
                      </div>
                    </div>

                    {/* Abandon / Restore + Erase Controls */}
                    <div className="mt-auto flex flex-col gap-2 pt-2 shrink-0">
                      {slot.name && (
                        isAbandoned ? (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={!canAffordDp}
                              onClick={() => restoreAspect(i)}
                              className={`rev-keep-color w-full py-2 rounded border text-xs font-bold uppercase tracking-widest transition-colors ${
                                canAffordDp
                                  ? 'border-emerald-800/70 bg-emerald-950/35 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200'
                                  : 'border-gray-700 bg-gray-800/60 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Restore Aspect ({dpCost} DP)
                            </button>
                            <div className="text-[11px] text-center text-gray-400 tabular-nums">
                              Available DP:{' '}
                              <span
                                className={
                                  canAffordDp ? 'rev-keep-color text-cyan-400 font-bold' : 'rev-keep-color text-red-400 font-bold'
                                }
                              >
                                {availableDp} / {dpCost}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abandonAspect(i)}
                            className="w-full py-2 rounded border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                          >
                            Abandon Aspect
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => eraseAspect(i, slot.name)}
                        className="rev-keep-color w-full py-2 rounded border border-red-900/60 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                        Erase Aspect
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
          {aspects.length > 1 && (
            <div className="sm:hidden flex items-center justify-center gap-4 mt-3">
              <button
                type="button"
                onClick={() => stepMobileAspect(-1)}
                className="px-4 py-1.5 rounded bg-black/35 border border-gray-700 text-sm font-bold text-gray-300 hover:text-white active:bg-white/10 transition-colors"
                aria-label="Previous aspect card"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => stepMobileAspect(1)}
                className="px-4 py-1.5 rounded bg-black/35 border border-gray-700 text-sm font-bold text-gray-300 hover:text-white active:bg-white/10 transition-colors"
                aria-label="Next aspect card"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aspect Selector Modal */}
      <AspectSelectorModal
        isOpen={pickerIndex !== null}
        onClose={() => setPickerIndex(null)}
        existingNames={existingNames}
        currentName={
          pickerIndex !== null && pickerIndex < aspects.length
            ? aspects[pickerIndex]?.name
            : undefined
        }
        isAdoption={isPickerAdoption}
        dpCost={dpCost}
        availableDp={availableDp}
        onSelect={(entry) => {
          if (pickerIndex === null) return;
          const isAdoption =
            pickerIndex >= aspects.length || !aspects[pickerIndex]?.name;
          if (isAdoption && availableDp < dpCost) return;

          const next = [...aspects];
          if (pickerIndex >= next.length) {
            if (next.length >= maxAspectSlots) return;
            next.push({ id: crypto.randomUUID(), name: entry.name, abandoned: false });
          } else {
            next[pickerIndex] = {
              id: next[pickerIndex]?.id || crypto.randomUUID(),
              name: entry.name,
              abandoned: false,
            };
          }

          if (isAdoption) {
            patch({
              aspects: next,
              trackers: { ...char.data.trackers, dp: availableDp - dpCost },
            });
          } else {
            patch({ aspects: next });
          }
          setEditingIndex(null);
        }}
      />
    </section>
  );
}