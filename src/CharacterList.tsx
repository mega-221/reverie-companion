import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { defaultCharacterData } from './defaults';
import type { Character } from './types';
import { useConfirm } from './components/sheet/ConfirmDialog';
import { calculateTierFromLevel } from './components/sheet/progression/progressionData';

export default function CharacterList({
  userId, onSelect,
}: { userId: string; onSelect: (id: string) => void }) {
  const [chars, setChars] = useState<Character[]>([]);
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
      setChars((data as Character[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) {
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, creating]);

  useEffect(() => {
    if (!renamingChar) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !renaming) {
        setRenamingChar(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renamingChar, renaming]);

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
    const updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('characters')
      .update({ name: trimmed, updated_at: updatedAt })
      .eq('id', renamingChar.id);

    if (updateErr) {
      setRenameError(updateErr.message);
      setRenaming(false);
      return;
    }

    await supabase
      .from('party_characters')
      .update({ character_name: trimmed })
      .eq('character_id', renamingChar.id);

    setChars(prev =>
      prev.map(item =>
        item.id === renamingChar.id ? { ...item, name: trimmed, updated_at: updatedAt } : item
      )
    );
    setRenaming(false);
    setRenamingChar(null);
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b rev-divider pb-4 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-cinzel font-bold" style={{ color: 'var(--rev-text)' }}>
            Your Characters
          </h2>
          <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
            {chars.length} {chars.length === 1 ? 'character' : 'characters'} · Hold Ctrl/Cmd + Click to open in a new tab
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
        <div className="sheet-panel p-12 text-center font-cinzel" style={{ color: 'var(--rev-text-muted)' }}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {chars.map(c => {
            const identity = c.data?.identity || {};
            const progression = c.data?.progression || { level: 0, tier: 0 };
            const classPath = [identity.className, identity.path].filter(Boolean).join(' · ');
            const origin = identity.origin;
            const updatedTime = formatDate(c.updated_at || c.created_at);
            const href = `?character=${encodeURIComponent(c.id)}`;

            return (
              <div
                key={c.id}
                className="sheet-panel flex flex-col justify-between transition-all hover:shadow-md overflow-hidden"
              >
                <a
                  href={href}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                      return;
                    }
                    e.preventDefault();
                    onSelect(c.id);
                  }}
                  className="group flex flex-col justify-between p-5 flex-1 min-w-0 gap-3 cursor-pointer no-underline text-inherit hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="font-cinzel font-bold text-lg truncate transition-colors"
                        style={{ color: 'var(--rev-text-bright)' }}
                      >
                        {c.name || 'Unnamed Character'}
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider shrink-0 mt-0.5 tabular-nums"
                        style={{ color: 'var(--rev-accent-text)' }}
                      >
                        Tier {progression.tier} · Lvl {progression.level}
                      </span>
                    </div>

                    {classPath && (
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--rev-text-secondary)' }}>
                        {classPath}
                      </span>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium mt-0.5 tabular-nums" style={{ color: 'var(--rev-text-faint)' }}>
                      {origin && <span>Origin: {origin}</span>}
                      {origin && updatedTime && <span>·</span>}
                      {updatedTime && <span>Updated {updatedTime}</span>}
                    </div>
                  </div>
                </a>

                <div className="flex items-center justify-between px-5 py-2.5 border-t rev-divider-subtle rev-inset-soft text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => openRenameModal(e, c)}
                      title="Rename character"
                      className="font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                      style={{ color: 'var(--rev-text-secondary)' }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => remove(e, c.id)}
                      title="Delete character"
                      className="font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  <a
                    href={href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                        return;
                      }
                      e.preventDefault();
                      onSelect(c.id);
                    }}
                    className="font-bold uppercase tracking-wider transition-colors no-underline"
                    style={{ color: 'var(--rev-accent-text)' }}
                  >
                    Open →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !creating && setIsCreateModalOpen(false)}
        >
          <div
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Create New Character
              </h2>
              {!creating && (
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="font-bold text-2xl leading-none px-2"
                  style={{ color: 'var(--rev-text-muted)' }}
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
          className="fixed inset-0 z-[200] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !renaming && setRenamingChar(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="sheet-modal shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
              <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
                Rename Character
              </h2>
              {!renaming && (
                <button
                  type="button"
                  onClick={() => setRenamingChar(null)}
                  className="font-bold text-2xl leading-none px-2"
                  style={{ color: 'var(--rev-text-muted)' }}
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