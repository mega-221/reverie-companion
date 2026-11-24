import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import { defaultCharacterData } from './defaults';
import type { Character } from './types';
import { useConfirm } from './components/sheet/ConfirmDialog';
import { calculateTierFromLevel, getSpendableXp } from './components/sheet/progression/progressionData';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useEscapeKey } from './hooks/useEscapeKey';
import { saveAndMirrorCharacter, safeCharacterData } from './utils/characterSync';
import { useCompendium } from './CompendiumContext';
import { Tooltip } from './components/sheet/utils';
import {
  accuracyBonus,
  apMax,
  burdenMax,
  calculateBurden,
  dpMax,
  evasion,
  getBurdenPenalty,
  getEquippedArmourInfo,
  movementTiles,
  strainMax,
  vigorMax,
} from './calc';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_NAMES,
  SKILL_GROUPS,
  getSeasonTextClass,
} from './constants/reverie';

function CharacterIdentityShowcase({
  char,
  onOpenSheet,
  onRename,
  onDelete,
  onCloseMobile,
}: {
  char: Character;
  onOpenSheet: (id: string) => void;
  onRename: (e: React.MouseEvent, c: Character) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onCloseMobile?: () => void;
}) {
  const { getEntryByName } = useCompendium();
  const data = useMemo(() => safeCharacterData(char.data), [char.data]);

  const level = Math.max(0, data.progression.level ?? 0);
  const tier = calculateTierFromLevel(level);
  const spendableXp = getSpendableXp(data);

  const maxBurden = burdenMax(data);
  const currentBurden = calculateBurden(data, getEntryByName);
  const burdenPenalty = getBurdenPenalty(data, getEntryByName);
  const armourInfo = getEquippedArmourInfo(data, getEntryByName);
  const maxAp = apMax(data, getEntryByName);
  const currentAp = data.trackers.ap ?? 0;

  const baseAcc = (data.trackers.acc || 0) + accuracyBonus(data);
  const effectiveAcc = baseAcc - burdenPenalty - (armourInfo?.combatRollPenalty ?? 0);
  const effectiveEva = evasion(data);
  const effectiveMov = movementTiles(data, getEntryByName);

  const vMax = vigorMax(data);
  const vCur = data.trackers.vigor ?? 0;
  const sMax = strainMax(data);
  const sCur = data.trackers.strain ?? 0;
  const dMax = dpMax(data);
  const dCur = data.trackers.dp ?? 0;

  const rankedCoreSkills = Object.entries(data.skills || {})
    .filter(([, rank]) => Number(rank) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]));

  const rankedSpecialSkills = (data.specialSkills || [])
    .filter((s) => s.name && Number(s.rank) > 0)
    .sort((a, b) => Number(b.rank) - Number(a.rank) || a.name.localeCompare(b.name));

  return (
    <div className="sheet-panel p-5 flex flex-col gap-4 shadow-sm">
      {/* Top Action Bar for Mobile Close */}
      {onCloseMobile && (
        <div className="flex items-center justify-between border-b rev-divider pb-2.5 lg:hidden">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--rev-text-muted)' }}>
            Identity Showcase
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rev-icon-btn rev-icon-btn-edit text-xl"
            aria-label="Close showcase"
          >
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: Name, Origin & Quote (Matches StatsCard) */}
      <div className="pt-1">
        <h2
          className="text-3xl font-cinzel font-bold text-gray-100
          first-letter:text-[3.4rem] first-letter:font-cinzelDeco first-letter:text-red-500
          first-letter:float-left first-letter:mr-0.5 first-letter:-mt-1 first-letter:leading-[0.8]
          leading-tight break-words text-left"
        >
          {char.name || 'Unnamed Character'}&#8203;
        </h2>

        <div className="clear-both text-xs font-bold uppercase tracking-widest mt-3" style={{ color: 'var(--rev-text-faint)' }}>
          {data.identity.origin || 'Unknown Origin'}
        </div>

        {data.identity.quote?.trim() && (
          <div className="border-l-2 pl-3 mt-2.5" style={{ borderColor: 'var(--rev-border-strong)' }}>
            <p className="text-xs italic leading-snug line-clamp-3" style={{ color: 'var(--rev-text-secondary)' }}>
              {data.identity.quote}
            </p>
          </div>
        )}
      </div>

      <hr className="border-gray-700/70" />

      {/* SECTION 2: Progression & Class / Convictions & Failings */}
      <div className="flex flex-col gap-4">
        <div className="rev-stat-box flex justify-between items-center bg-black/20 p-2.5 rounded border border-gray-700/50 w-full">
          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Tier</span>
            <span className="text-gray-100 font-bold text-lg leading-none tabular-nums">{tier}</span>
          </div>
          <div className="rev-stat-divider w-px h-7 bg-gray-700" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Level</span>
            <span className="text-gray-100 font-bold text-lg leading-none tabular-nums">{level}</span>
          </div>
          <div className="rev-stat-divider w-px h-7 bg-gray-700" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">XP</span>
            <span className={`font-bold text-lg leading-none tabular-nums ${spendableXp < 0 ? 'rev-keep-color text-red-400' : 'text-gray-100'}`}>
              {spendableXp}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rev-inset p-2">
            <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px] mb-0.5">Class</span>
            <span className="text-gray-100 font-bold text-sm leading-tight truncate block">
              {data.identity.className || '—'}
            </span>
          </div>
          <div className="rev-inset p-2">
            <span className="text-gray-500 font-bold uppercase tracking-widest block text-[10px] mb-0.5">Path</span>
            <span className="text-gray-100 font-bold text-sm leading-tight truncate block">
              {data.identity.path || '—'}
            </span>
          </div>
        </div>

        {/* Convictions & Failings */}
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-3 text-center">
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Convictions</span>
            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Failings</span>
          </div>
          {data.convictions.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 text-center text-xs italic text-gray-600">
              <span>—</span>
              <span>—</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.convictions.map((c, i) => {
                const f = data.failings.find((fail) => fail.convictionIndex === i);
                const convStatement = c.name ? getEntryByName(c.name)?.data?.statement || '' : '';
                const failStatement = f?.name ? getEntryByName(f.name)?.data?.statement || '' : '';
                return (
                  <div key={i} className="grid grid-cols-2 gap-3 items-stretch text-center">
                    <div className="flex items-center justify-center min-w-0">
                      {c.name ? (
                        <Tooltip text={convStatement} className="w-auto" noBorder>
                          <span className={`${getSeasonTextClass(c.season)} h-7 flex items-center justify-center px-2 font-bold uppercase tracking-[0.16em] text-xs leading-tight cursor-help truncate`}>
                            {c.name}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-600 italic text-xs">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center min-w-0">
                      {f?.name ? (
                        <Tooltip text={failStatement} className="w-auto" noBorder>
                          <span className="rev-dark-card vital-keep-white bg-black text-white h-7 flex items-center justify-center font-bold uppercase tracking-[0.16em] text-[11px] leading-tight px-2 select-none shadow-sm cursor-help truncate">
                            {f.name}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-600 italic text-xs">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Core Combat Metrics (ACC, EVA, AP, MOV, BRD) */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">ACC</span>
          <span className={`font-bold text-base leading-none tabular-nums ${effectiveAcc < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
            {effectiveAcc}
          </span>
        </div>
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">EVA</span>
          <span className={`font-bold text-base leading-none tabular-nums ${effectiveEva < 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
            {effectiveEva}
          </span>
        </div>
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">AP</span>
          <span className={`font-bold text-base leading-none tabular-nums ${maxAp > 0 && currentAp < maxAp ? 'text-amber-400' : 'text-white'}`}>
            {currentAp}
            {maxAp > 0 && <span className="text-[9px] text-gray-500 font-normal">/{maxAp}</span>}
          </span>
        </div>
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">MOV</span>
          <span className={`font-bold text-base leading-none tabular-nums ${effectiveMov <= 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
            {effectiveMov}
          </span>
        </div>
        <div className="rev-stat-box flex flex-col items-center justify-center bg-black/20 rounded-lg py-2 border border-gray-700/50">
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">BRD</span>
          <span className={`font-bold text-base leading-none tabular-nums ${burdenPenalty > 0 ? 'rev-keep-color text-red-500' : 'text-white'}`}>
            {currentBurden}
            <span className="text-[9px] text-gray-500 font-normal">/{maxBurden}</span>
          </span>
        </div>
      </div>

      {/* SECTION 4: Condensed Vitals */}
      <div className="rev-inset p-3 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Vigor', cur: vCur, max: vMax, color: vCur <= 0 ? 'bg-red-800' : 'bg-red-500' },
          { label: 'Strain', cur: sCur, max: sMax, color: sCur >= sMax ? 'bg-purple-500' : 'bg-blue-500' },
          { label: 'Destiny', cur: dCur, max: dMax, color: dCur >= dMax ? 'bg-cyan-500' : 'bg-yellow-500' },
        ].map((v) => {
          const safeMax = Math.max(1, v.max);
          const pct = Math.max(0, Math.min(100, (v.cur / safeMax) * 100));
          return (
            <div key={v.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-wider">
                <span style={{ color: 'var(--rev-text-muted)' }}>{v.label}</span>
                <span className="tabular-nums" style={{ color: 'var(--rev-text-bright)' }}>
                  {v.cur}<span className="font-normal opacity-60">/{v.max}</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-700/50 overflow-hidden">
                <div className={`vital-static h-full rounded-full ${v.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 5: Condensed Attributes & Ranked Skills */}
      <div className="rev-inset p-3 flex flex-col gap-2.5">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {ATTRIBUTE_KEYS.map((attr) => {
            const baseVal = data.attributes[attr] ?? 1;
            return (
              <div key={attr} className="bg-black/25 rounded py-1.5 px-1 border border-gray-700/40">
                <div className={`text-[10px] font-cinzel font-bold uppercase tracking-wider ${SKILL_GROUPS[attr].color}`}>
                  {ATTRIBUTE_NAMES[attr]}
                </div>
                <div className="text-sm font-bold tabular-nums leading-tight mt-0.5 text-gray-100">
                  {baseVal}
                </div>
              </div>
            );
          })}
        </div>

        {(rankedCoreSkills.length > 0 || rankedSpecialSkills.length > 0) && (
          <div className="pt-1.5 border-t rev-divider-subtle flex flex-wrap gap-1.5">
            {rankedCoreSkills.map(([name, rank]) => (
              <span
                key={`core-${name}`}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-black/30 border border-gray-700/70 tabular-nums"
                style={{ color: 'var(--rev-text-secondary)' }}
              >
                {name} <strong style={{ color: 'var(--rev-text-bright)' }}>+{rank}</strong>
              </span>
            ))}
            {rankedSpecialSkills.map((s) => (
              <span
                key={`spec-${s.name}`}
                className="px-2 py-0.5 rounded text-[11px] font-semibold border tabular-nums"
                style={{
                  backgroundColor: 'var(--rev-accent-soft)',
                  borderColor: 'var(--rev-accent-border)',
                  color: 'var(--rev-accent-text)',
                }}
              >
                {s.name} <strong>+{s.rank}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 6: Showcase Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onOpenSheet(char.id)}
          className="flex-1 py-2.5 px-4 rev-btn-primary font-bold text-sm shadow-sm text-center"
        >
          Open Character Sheet →
        </button>
        <button
          type="button"
          onClick={(e) => onRename(e, char)}
          title="Rename character"
          aria-label="Rename character"
          className="rev-icon-btn rev-icon-btn-edit border rev-divider-subtle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, char.id)}
          title="Delete character"
          aria-label="Delete character"
          className="rev-icon-btn rev-icon-btn-danger border rev-divider-subtle text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function CharacterList({
  userId, onSelect,
}: { userId: string; onSelect: (id: string) => void }) {
  const [chars, setChars] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [mobileShowcaseOpen, setMobileShowcaseOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { askConfirm, confirmDialog } = useConfirm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharLevel, setNewCharLevel] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [renamingChar, setRenamingChar] = useState<Character | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useBodyScrollLock(isCreateModalOpen || Boolean(renamingChar) || mobileShowcaseOpen);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setChars([]);
    } else {
      const list = (data as Character[]) ?? [];
      setChars(list);
      setSelectedCharId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEscapeKey(isCreateModalOpen && !creating, () => setIsCreateModalOpen(false));
  useEscapeKey(Boolean(renamingChar) && !renaming, () => setRenamingChar(null));
  useEscapeKey(mobileShowcaseOpen, () => setMobileShowcaseOpen(false));

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newCharName.trim() || creating) return;

    setCreating(true);
    setCreateError(null);

    const charData = defaultCharacterData();
    const safeLevel = Math.max(0, Number.isFinite(newCharLevel) ? newCharLevel : 0);
    const tier = calculateTierFromLevel(safeLevel);

    charData.progression.level = safeLevel;
    charData.progression.tier = tier;
    charData.progression.xp = safeLevel * 5;
    charData.progression.spendableXp = safeLevel * 5;

    charData.trackers.vigor = 5 + tier;
    charData.trackers.dp = 2 + Math.min(Math.max(0, tier - 1), 4);

    const { data, error: insertError } = await supabase
      .from('characters')
      .insert({
        name: newCharName.trim(),
        user_id: userId,
        data: charData,
      })
      .select('id')
      .single();

    setCreating(false);

    if (insertError) {
      setCreateError(insertError.message);
      return;
    }

    setIsCreateModalOpen(false);
    setNewCharName('');
    setNewCharLevel(0);

    if (data?.id) {
      onSelect(data.id);
    } else {
      load();
    }
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    const ok = await askConfirm({
      title: 'Delete Character',
      message: 'Are you sure you want to delete this character? This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    const { error: deleteError } = await supabase.from('characters').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMobileShowcaseOpen(false);
    load();
  }

  function openRenameModal(e: React.MouseEvent, c: Character) {
    e.stopPropagation();
    e.preventDefault();
    setRenamingChar(c);
    setRenameValue(c.name || '');
    setRenameError(null);
  }

  async function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingChar || renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    if (trimmed === renamingChar.name) {
      setRenamingChar(null);
      return;
    }

    setRenaming(true);
    setRenameError(null);
    const { error: updateErr, updatedAt } = await saveAndMirrorCharacter({
      characterId: renamingChar.id,
      name: trimmed,
    });

    if (updateErr) {
      setRenameError(updateErr.message);
      setRenaming(false);
      return;
    }

    setChars(prev =>
      prev.map(item =>
        item.id === renamingChar.id ? { ...item, name: trimmed, updated_at: updatedAt } : item
      )
    );
    setRenaming(false);
    setRenamingChar(null);
  }

  const selectedChar = useMemo(
    () => chars.find((c) => c.id === selectedCharId) || chars[0] || null,
    [chars, selectedCharId]
  );

  return (
    <div className="w-full">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b rev-divider pb-4 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-spectral font-bold" style={{ color: 'var(--rev-text)' }}>
            Your Characters
          </h2>
          <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
            {chars.length} {chars.length === 1 ? 'character' : 'characters'} · Click to inspect · Double-click or Open → for sheet
          </p>
        </div>
        <button
          onClick={() => {
            setNewCharName('');
            setNewCharLevel(0);
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="rev-btn-primary px-5 py-2.5 font-bold shadow-sm flex items-center gap-2 shrink-0 text-sm"
        >
          <span>+ New Character</span>
        </button>
      </div>

      {error && (
        <div className="sheet-panel-red text-sm p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ color: 'var(--rev-accent-text)' }}>
          <span>Failed to load characters: {error}</span>
          <button
            onClick={load}
            className="px-3 py-1 rev-btn-primary text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="sheet-panel p-12 text-center" style={{ color: 'var(--rev-text-muted)' }}>
          <p className="animate-pulse">Loading characters...</p>
        </div>
      ) : chars.length === 0 && !error ? (
        <div className="sheet-panel p-12 text-center flex flex-col items-center justify-center gap-3">
          <p className="italic" style={{ color: 'var(--rev-text-muted)' }}>
            No characters yet. Create one to begin.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-4"
            style={{ color: 'var(--rev-accent-text)' }}
          >
            Create your first character
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (~2/3 on desktop): Minimalist Character List */}
          <div className="lg:col-span-8 flex flex-col gap-2 min-w-0">
            {chars.map((c) => {
              const identity = c.data?.identity || {};
              const progression = c.data?.progression || { level: 0, tier: 0 };
              const summaryParts = [
                `Tier ${progression.tier} · Lvl ${progression.level}`,
                identity.className,
                identity.origin,
              ].filter(Boolean);
              const href = `?character=${encodeURIComponent(c.id)}`;
              const isSelected = selectedChar?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCharId(c.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setMobileShowcaseOpen(true);
                    }
                  }}
                  onDoubleClick={() => onSelect(c.id)}
                  className="sheet-panel px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-white/[0.03]"
                  style={{
                    borderColor: isSelected ? 'var(--rev-accent-border)' : undefined,
                    backgroundColor: isSelected ? 'var(--rev-accent-soft)' : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                    <span
                      className="font-spectral font-bold text-lg truncate"
                      style={{ color: isSelected ? 'var(--rev-text-bright)' : 'var(--rev-text)' }}
                    >
                      {c.name || 'Unnamed Character'}
                    </span>
                    <span
                      className="text-xs truncate tabular-nums"
                      style={{ color: 'var(--rev-text-muted)' }}
                    >
                      {summaryParts.join(' · ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => openRenameModal(e, c)}
                      title="Rename character"
                      aria-label="Rename character"
                      className="rev-icon-btn rev-icon-btn-edit"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => remove(e, c.id)}
                      title="Delete character"
                      aria-label="Delete character"
                      className="rev-icon-btn rev-icon-btn-danger text-lg"
                    >
                      ×
                    </button>
                    <a
                      href={href}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                          return;
                        }
                        e.preventDefault();
                        onSelect(c.id);
                      }}
                      className="ml-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider no-underline transition-colors hover:bg-white/10"
                      style={{ color: 'var(--rev-accent-text)' }}
                    >
                      Open →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column (~1/3 on desktop): Identity Showcase */}
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 min-w-0">
            {selectedChar ? (
              <CharacterIdentityShowcase
                char={selectedChar}
                onOpenSheet={onSelect}
                onRename={openRenameModal}
                onDelete={remove}
              />
            ) : (
              <div className="sheet-panel p-8 text-center text-sm italic" style={{ color: 'var(--rev-text-muted)' }}>
                Select a character from the list to preview their identity and stats.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Identity Showcase Modal (< lg) */}
      {mobileShowcaseOpen && selectedChar && createPortal(
        <div
          className="fixed inset-0 z-[190] rev-backdrop flex items-center justify-center p-3 lg:hidden"
          onClick={() => setMobileShowcaseOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <CharacterIdentityShowcase
              char={selectedChar}
              onOpenSheet={(id) => {
                setMobileShowcaseOpen(false);
                onSelect(id);
              }}
              onRename={openRenameModal}
              onDelete={remove}
              onCloseMobile={() => setMobileShowcaseOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[200] rev-backdrop flex items-center justify-center p-4"
          onClick={() => !creating && setIsCreateModalOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Create New Character
              </h2>
              {!creating && (
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rev-icon-btn rev-icon-btn-edit text-xl"
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5">
              {createError && (
                <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                  {createError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex flex-col text-sm font-bold flex-1" style={{ color: 'var(--rev-text-muted)' }}>
                  Character Name
                  <input
                    type="text"
                    required
                    className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                    placeholder="Enter name..."
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    disabled={creating}
                    autoFocus
                  />
                </label>

                <label className="flex flex-col text-sm font-bold w-full sm:w-28 shrink-0" style={{ color: 'var(--rev-text-muted)' }}>
                  Starting Level
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="rev-input p-3 mt-1 font-normal shadow-inner text-base text-center tabular-nums"
                    value={newCharLevel}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      setNewCharLevel(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                    }}
                    disabled={creating}
                  />
                </label>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCharName.trim() || creating}
                  className={`flex-1 py-3 font-bold text-sm shadow-sm flex items-center justify-center ${
                    !newCharName.trim() || creating
                      ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                      : 'rev-btn-primary'
                  }`}
                >
                  {creating ? 'Creating...' : 'Create Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renamingChar && (
        <div
          className="fixed inset-0 z-[200] rev-backdrop flex items-center justify-center p-4"
          onClick={() => !renaming && setRenamingChar(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Rename Character
              </h2>
              {!renaming && (
                <button
                  type="button"
                  onClick={() => setRenamingChar(null)}
                  className="rev-icon-btn rev-icon-btn-edit text-xl"
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>

            <form onSubmit={handleRenameSubmit} className="p-6 flex flex-col gap-5">
              {renameError && (
                <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                  {renameError}
                </div>
              )}

              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Character Name
                <input
                  type="text"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                  placeholder="Enter new name..."
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={renaming}
                  autoFocus
                />
              </label>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setRenamingChar(null)}
                      disabled={renaming}
                  className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim() || renaming}
                  className={`flex-1 py-3 font-bold text-sm shadow-sm flex items-center justify-center ${
                    !renameValue.trim() || renaming
                      ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                      : 'rev-btn-primary'
                  }`}
                >
                  {renaming ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}