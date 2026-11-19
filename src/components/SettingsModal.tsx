import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { useTheme } from '../theme/ThemeContext';
import { getThemeById, resolveDynamicConvictionThemeId } from '../theme/themes';
import type { AllowedEditor, Character } from '../types';

type ProfileSuggestion = {
  user_id: string;
  username: string;
  email: string;
};

export type SheetSettingsConfig = {
  char: Character;
  ownerId: string;
  isOwner: boolean;
  onSettingsSaved: (result: { editors: AllowedEditor[]; dynamicTheme: boolean }) => void;
};

export default function SettingsModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentUsername,
  onUsernameUpdated,
  sheetConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
  sheetConfig?: SheetSettingsConfig;
}) {
  const { themeId, presets, setThemeId } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'sheet'>('general');

  // General tab state
  const [username, setUsername] = useState(currentUsername);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sheet tab state
  const [editors, setEditors] = useState<AllowedEditor[]>([]);
  const [dynamicTheme, setDynamicTheme] = useState(Boolean(sheetConfig?.char.data?.dynamicTheme));
  const [lookupInput, setLookupInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [partySuggestions, setPartySuggestions] = useState<ProfileSuggestion[]>([]);

  const isBusy = savingGeneral || savingSheet || lookingUp;

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setUsername(currentUsername);
    setGeneralSuccess(null);
    setGeneralError(null);
  }, [currentUsername, isOpen]);

  useEffect(() => {
    if (!isOpen || !sheetConfig) return;
    const { char, ownerId } = sheetConfig;
    const initial = Array.isArray(char.allowed_editors)
      ? char.allowed_editors
      : Array.isArray(char.data?.allowedEditors)
      ? char.data.allowedEditors
      : [];
    setEditors(initial);
    setDynamicTheme(Boolean(char.data?.dynamicTheme));
    setLookupInput('');
    setSheetError(null);

    if (!sheetConfig.isOwner) {
      setPartySuggestions([]);
      return;
    }

    let cancelled = false;
    async function loadPartySuggestions() {
      const { data: sharedRows } = await supabase
        .from('party_characters')
        .select('party_id')
        .eq('character_id', char.id);

      const partyIds = Array.from(new Set((sharedRows || []).map((r: any) => r.party_id).filter(Boolean)));
      if (partyIds.length === 0 || cancelled) {
        setPartySuggestions([]);
        return;
      }

      const { data: memberRows } = await supabase
        .from('party_members')
        .select('user_id, email, status')
        .in('party_id', partyIds)
        .eq('status', 'accepted');

      const memberUserIds = Array.from(
        new Set(
          (memberRows || [])
            .map((m: any) => m.user_id)
            .filter((uid: string) => uid && uid !== ownerId && uid !== '00000000-0000-0000-0000-000000000000')
        )
      );

      if (memberUserIds.length === 0 || cancelled) {
        setPartySuggestions([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', memberUserIds);

      if (cancelled) return;

      const list: ProfileSuggestion[] = (profiles || []).map((p: any) => ({
        user_id: p.id,
        username: p.username || p.email?.split('@')[0] || 'User',
        email: (p.email || '').toLowerCase(),
      }));
      setPartySuggestions(list);
    }

    loadPartySuggestions();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    sheetConfig?.char.id,
    sheetConfig?.char.allowed_editors,
    sheetConfig?.char.data?.allowedEditors,
    sheetConfig?.char.data?.dynamicTheme,
    sheetConfig?.ownerId,
    sheetConfig?.isOwner,
  ]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onClose]);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || savingGeneral) return;

    setSavingGeneral(true);
    setGeneralSuccess(null);
    setGeneralError(null);

    const trimmed = username.trim();

    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });

      if (authErr) throw authErr;

      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: trimmed,
          email: userEmail.toLowerCase(),
          updated_at: new Date().toISOString(),
        });

      if (profErr) throw profErr;

      setGeneralSuccess('Settings updated.');
      onUsernameUpdated(trimmed);
      setTimeout(() => {
        setGeneralSuccess(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to update settings.');
    } finally {
      setSavingGeneral(false);
    }
  }

  async function handleAddByLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!sheetConfig || !sheetConfig.isOwner) return;
    const query = lookupInput.trim();
    if (!query || lookingUp || savingSheet) return;

    setLookingUp(true);
    setSheetError(null);

    try {
      const { data: profile, error: profErr } = query.includes('@')
        ? await supabase.from('profiles').select('id, username, email').ilike('email', query).single()
        : await supabase.from('profiles').select('id, username, email').ilike('username', query).single();

      if (profErr || !profile) {
        throw new Error(`User "${query}" not found.`);
      }

      if (profile.id === sheetConfig.ownerId) {
        throw new Error('You already own this character.');
      }

      if (editors.some(ed => ed.user_id === profile.id)) {
        throw new Error('This user already has edit permission.');
      }

      setEditors(prev => [
        ...prev,
        {
          user_id: profile.id,
          username: profile.username || profile.email?.split('@')[0] || 'User',
          email: (profile.email || '').toLowerCase(),
        },
      ]);
      setLookupInput('');
    } catch (err: any) {
      setSheetError(err?.message || 'Failed to find user.');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSaveSheet() {
    if (!sheetConfig || !sheetConfig.isOwner || savingSheet) return;
    setSavingSheet(true);
    setSheetError(null);

    const nextData = {
      ...sheetConfig.char.data,
      allowedEditors: editors,
      dynamicTheme,
    };

    const { error: updateErr } = await supabase
      .from('characters')
      .update({
        allowed_editors: editors,
        data: nextData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sheetConfig.char.id);

    if (updateErr) {
      setSavingSheet(false);
      setSheetError(updateErr.message);
      return;
    }

    await supabase
      .from('party_characters')
      .update({ character_data: nextData })
      .eq('character_id', sheetConfig.char.id);

    setSavingSheet(false);
    sheetConfig.onSettingsSaved({ editors, dynamicTheme });
    onClose();
  }

  if (!isOpen) return null;

  const availableSuggestions = partySuggestions.filter(
    s => !editors.some(ed => ed.user_id === s.user_id)
  );
  const resolvedDynamicId = sheetConfig
    ? resolveDynamicConvictionThemeId(sheetConfig.char.data?.convictions)
    : null;
  const resolvedDynamicPreset = resolvedDynamicId ? getThemeById(resolvedDynamicId) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] rev-modal-backdrop backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !isBusy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-modal w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
          <h2 className="font-cinzel font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
            Settings
          </h2>
          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="font-bold text-2xl leading-none px-2 transition-colors"
              style={{ color: 'var(--rev-text-muted)' }}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {sheetConfig && (
          <div className="flex border-b rev-divider rev-inset-soft px-4 gap-2 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'general' ? 'var(--rev-accent)' : 'transparent',
                color: activeTab === 'general' ? 'var(--rev-text-bright)' : 'var(--rev-text-muted)',
              }}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'sheet' ? 'var(--rev-accent)' : 'transparent',
                color: activeTab === 'sheet' ? 'var(--rev-text-bright)' : 'var(--rev-text-muted)',
              }}
            >
              Sheet
            </button>
          </div>
        )}

        {activeTab === 'general' || !sheetConfig ? (
          <form onSubmit={handleSaveGeneral} className="p-6 flex flex-col gap-5 overflow-y-auto">
            {generalError && (
              <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                {generalError}
              </div>
            )}

            {generalSuccess && (
              <div className="bg-green-950/50 border border-green-900 text-green-300 text-sm p-3 rounded-lg">
                {generalSuccess}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--rev-text-muted)' }}
              >
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={userEmail}
                className="rev-input p-3 text-sm cursor-not-allowed select-none opacity-75"
              />
            </div>

            <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
              Username
              <input
                type="text"
                required
                className="rev-input p-3 mt-1 font-normal shadow-inner text-base"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={savingGeneral}
              />
            </label>

            {/* Theme Switcher */}
            <div className="flex flex-col gap-3 pt-3 border-t rev-divider">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--rev-text-muted)' }}
                >
                  Color & Shape Theme
                </span>
                <span className="text-[11px]" style={{ color: 'var(--rev-text-faint)' }}>
                  Applies immediately
                </span>
              </div>

              {(['standard', 'seasons'] as const).map((cat) => {
                const group = presets.filter(p => p.category === cat);
                if (group.length === 0) return null;
                return (
                  <div key={cat} className="flex flex-col gap-2">
                    {cat === 'seasons' && (
                      <span
                        className="text-[11px] font-bold uppercase tracking-widest pt-1"
                        style={{ color: 'var(--rev-accent-text)' }}
                      >
                        Seasons
                      </span>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {group.map((preset) => {
                        const isActive = preset.id === themeId;
                        const [s1, s2, s3] = preset.swatches || [
                          preset.colors.bg,
                          preset.colors.surface,
                          preset.colors.accent,
                        ];
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setThemeId(preset.id)}
                            className="text-left p-3 transition-all flex flex-col gap-2"
                            style={{
                              backgroundColor: isActive ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                              border: `1px solid ${isActive ? 'var(--rev-accent-border)' : 'var(--rev-border)'}`,
                              borderRadius: preset.shapes.radiusPanel,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="font-cinzel font-bold text-sm truncate"
                                style={{ color: isActive ? 'var(--rev-accent-text)' : 'var(--rev-text-bright)' }}
                              >
                                {preset.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                                <span
                                  className="w-3.5 h-3.5 border border-white/25"
                                  style={{
                                    backgroundColor: s1,
                                    borderRadius: preset.shapes.radiusBadge,
                                  }}
                                />
                                <span
                                  className="w-3.5 h-3.5 border border-white/25"
                                  style={{
                                    backgroundColor: s2,
                                    borderRadius: preset.shapes.radiusBadge,
                                  }}
                                />
                                <span
                                  className="w-3.5 h-3.5 border border-white/25"
                                  style={{
                                    backgroundColor: s3,
                                    borderRadius: preset.shapes.radiusBadge,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] leading-snug" style={{ color: 'var(--rev-text-muted)' }}>
                              {preset.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 w-full mt-1 pt-3 border-t rev-divider">
              <button
                type="button"
                onClick={onClose}
                disabled={savingGeneral}
                className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!username.trim() || savingGeneral}
                className={`flex-1 py-3 font-bold text-sm flex items-center justify-center ${
                  !username.trim() || savingGeneral
                    ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                    : 'rev-btn-primary shadow-sm'
                }`}
              >
                {savingGeneral ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            {sheetError && (
              <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                {sheetError}
              </div>
            )}

            {!sheetConfig.isOwner && (
              <div className="rev-inset text-xs p-3" style={{ color: 'var(--rev-text-muted)' }}>
                Only the character owner can modify sheet-specific theme overrides or external editor permissions.
              </div>
            )}

            {/* Dynamic Seasonal Theme */}
            <div className="rev-inset p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-bright)' }}>
                    Dynamic Seasonal Theme
                  </span>
                  <span className="text-[11px] leading-snug" style={{ color: 'var(--rev-text-muted)' }}>
                    Applies the seasonal theme of your highest leftmost Conviction at Rank 3+ to this sheet only.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dynamicTheme}
                  disabled={savingSheet || !sheetConfig.isOwner}
                  onClick={() => sheetConfig.isOwner && setDynamicTheme(prev => !prev)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center transition-colors border disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderRadius: '9999px',
                    backgroundColor: dynamicTheme ? 'var(--rev-accent)' : 'var(--rev-surface)',
                    borderColor: dynamicTheme ? 'var(--rev-accent-border)' : 'var(--rev-border-strong)',
                  }}
                  aria-label="Toggle dynamic seasonal theme"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      dynamicTheme ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {dynamicTheme && (
                <div className="text-[11px] pt-1 border-t rev-divider-subtle" style={{ color: 'var(--rev-accent-text)' }}>
                  {resolvedDynamicPreset
                    ? `Active override: ${resolvedDynamicPreset.name}`
                    : 'No Conviction at Rank 3+ yet — using your app theme.'}
                </div>
              )}
            </div>

            {/* External Editors */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                External Editors
              </h3>
              <p className="text-xs" style={{ color: 'var(--rev-text-muted)' }}>
                Users listed here can open and edit this character sheet from shared parties.
              </p>

              {sheetConfig.isOwner && (
                <form onSubmit={handleAddByLookup} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    placeholder="Username or email..."
                    disabled={lookingUp || savingSheet}
                    className="flex-1 min-w-0 rev-input px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!lookupInput.trim() || lookingUp || savingSheet}
                    className="px-4 py-2 text-xs font-bold rev-btn-secondary disabled:opacity-40 shrink-0"
                  >
                    {lookingUp ? 'Adding...' : 'Add'}
                  </button>
                </form>
              )}
            </div>

            {sheetConfig.isOwner && availableSuggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--rev-text-muted)' }}>
                  Party Members
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableSuggestions.map(s => (
                    <button
                      key={s.user_id}
                      type="button"
                      disabled={savingSheet}
                      onClick={() => setEditors(prev => [...prev, s])}
                      className="px-2.5 py-1 text-xs font-medium rev-btn-secondary"
                      title={s.email}
                    >
                      + {s.username}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider tabular-nums" style={{ color: 'var(--rev-text-muted)' }}>
                Allowed Users ({editors.length})
              </span>

              {editors.length === 0 ? (
                <p className="rev-inset text-xs italic p-3 text-center" style={{ color: 'var(--rev-text-faint)' }}>
                  Only the owner can edit this character.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {editors.map(ed => (
                    <li
                      key={ed.user_id}
                      className="rev-inset flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--rev-text-bright)' }}>
                          {ed.username}
                        </span>
                        <span className="text-xs truncate" style={{ color: 'var(--rev-text-muted)' }}>
                          {ed.email}
                        </span>
                      </div>
                      {sheetConfig.isOwner && (
                        <button
                          type="button"
                          disabled={savingSheet}
                          onClick={() => setEditors(prev => prev.filter(item => item.user_id !== ed.user_id))}
                          className="text-xs font-bold text-red-400 hover:text-red-300 shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t rev-divider">
              <button
                type="button"
                onClick={onClose}
                disabled={savingSheet}
                className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
              >
                Close
              </button>
              {sheetConfig.isOwner && (
                <button
                  type="button"
                  onClick={handleSaveSheet}
                  disabled={savingSheet}
                  className="flex-1 py-3 font-bold text-sm rev-btn-primary disabled:opacity-50 shadow-sm"
                >
                  {savingSheet ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
