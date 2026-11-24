import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { useTheme } from '../theme/ThemeContext';
import { getThemeById, resolveDynamicConvictionThemeId } from '../theme/themes';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAutoSaveSetting, type AutoSaveMode } from '../hooks/useAutoSaveSetting';
import { saveAndMirrorCharacter } from '../utils/characterSync';
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
  const [autoSaveMode, setAutoSaveMode] = useAutoSaveSetting();
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'sheet'>('general');

  // Profile tab state
  const [username, setUsername] = useState(currentUsername);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sheet tab state
  const [editors, setEditors] = useState<AllowedEditor[]>([]);
  const [dynamicTheme, setDynamicTheme] = useState(Boolean(sheetConfig?.char.data?.dynamicTheme));
  const [lookupInput, setLookupInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [partySuggestions, setPartySuggestions] = useState<ProfileSuggestion[]>([]);

  const isBusy = savingProfile || savingSheet || lookingUp;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setUsername(currentUsername);
    setProfileSuccess(null);
    setProfileError(null);
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

  useEscapeKey(isOpen && !isBusy, onClose);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || savingProfile) return;

    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

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

      setProfileSuccess('Profile updated.');
      onUsernameUpdated(trimmed);
      setTimeout(() => {
        setProfileSuccess(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
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

    const { error: updateErr } = await saveAndMirrorCharacter({
      characterId: sheetConfig.char.id,
      data: nextData,
      allowedEditors: editors,
    });

    if (updateErr) {
      setSavingSheet(false);
      setSheetError(updateErr.message);
      return;
    }

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
      className="fixed inset-0 z-[250] rev-backdrop flex items-center justify-center p-4"
      onClick={() => !isBusy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-modal w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b rev-divider rev-inset-soft shrink-0">
          <h2 className="font-spectral font-bold text-xl" style={{ color: 'var(--rev-text)' }}>
            Settings
          </h2>
          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="rev-icon-btn rev-icon-btn-edit text-xl"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

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
            onClick={() => setActiveTab('profile')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors"
            style={{
              borderColor: activeTab === 'profile' ? 'var(--rev-accent)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--rev-text-bright)' : 'var(--rev-text-muted)',
            }}
          >
            Profile
          </button>
          {sheetConfig && (
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
          )}
        </div>

        {activeTab === 'general' ? (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Automatic Saving */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--rev-text-muted)' }}
                >
                  Automatic Saving
                </span>
                <span className="text-[11px]" style={{ color: 'var(--rev-text-faint)' }}>
                  Applies immediately
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: '3m', label: '3 Minutes', badge: 'Default' },
                    { value: '3s', label: '3 Seconds', badge: null },
                    { value: 'off', label: 'Off', badge: null },
                  ] as const
                ).map((opt) => {
                  const isActive = autoSaveMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAutoSaveMode(opt.value as AutoSaveMode)}
                      className="px-3 py-2.5 text-center transition-all flex flex-col items-center justify-center gap-0.5 rounded-lg"
                      style={{
                        backgroundColor: isActive ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                        border: `1px solid ${isActive ? 'var(--rev-accent-border)' : 'var(--rev-border)'}`,
                      }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ color: isActive ? 'var(--rev-accent-text)' : 'var(--rev-text-bright)' }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--rev-text-faint)' }}>
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--rev-text-muted)' }}>
                {autoSaveMode === '3m' && 'Saves character edits to your account every 3 minutes.'}
                {autoSaveMode === '3s' && 'Saves character edits shortly after each change.'}
                {autoSaveMode === 'off' && 'Manual Save button only. Real-time party sheet sync remains active.'}
              </p>
            </div>

            {/* Theme Switcher */}
            <div className="flex flex-col gap-3 pt-4 border-t rev-divider">
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

              {([
                { key: 'standard', label: 'Core' },
                { key: 'seasons', label: 'Seasons' },
                { key: 'planes', label: 'Planes' },
              ] as const).map(({ key: cat, label }) => {
                const group = presets.filter(p => p.category === cat);
                if (group.length === 0) return null;
                return (
                  <div key={cat} className="flex flex-col gap-2">
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest pt-1"
                      style={{ color: 'var(--rev-accent-text)' }}
                    >
                      {label}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:auto-rows-fr gap-2.5">
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
                            className="w-full h-full text-left p-3 transition-all flex flex-col justify-between gap-2"
                            style={{
                              backgroundColor: isActive ? 'var(--rev-accent-soft)' : 'var(--rev-surface-inset)',
                              border: `1px solid ${isActive ? 'var(--rev-accent-border)' : 'var(--rev-border)'}`,
                              borderRadius: preset.shapes.radiusPanel,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span
                                className="font-bold text-sm truncate min-w-0"
                                style={{ color: isActive ? 'var(--rev-accent-text)' : 'var(--rev-text-bright)' }}
                              >
                                {preset.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                                {[s1, s2, s3].map((swatchColor, swatchIdx) => (
                                  <span
                                    key={swatchIdx}
                                    className="block shrink-0 border border-white/25 box-border"
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      minWidth: '14px',
                                      minHeight: '14px',
                                      backgroundColor: swatchColor,
                                      borderRadius: preset.shapes.radiusBadge,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            {preset.subtitle && (
                              <span className="text-[11px] leading-snug" style={{ color: 'var(--rev-text-muted)' }}>
                                {preset.subtitle}
                              </span>
                            )}
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
                className="flex-1 py-3 font-bold text-sm rev-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        ) : activeTab === 'profile' || !sheetConfig ? (
          <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-5 overflow-y-auto">
            {profileError && (
              <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="bg-green-950/50 border border-green-900 text-green-300 text-sm p-3 rounded-lg">
                {profileSuccess}
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
                disabled={savingProfile}
              />
            </label>

            <div className="flex gap-3 w-full mt-1 pt-3 border-t rev-divider">
              <button
                type="button"
                onClick={onClose}
                disabled={savingProfile}
                className="flex-1 py-3 font-bold text-sm rev-btn-secondary disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!username.trim() || savingProfile}
                className={`flex-1 py-3 font-bold text-sm flex items-center justify-center ${
                  !username.trim() || savingProfile
                    ? 'rev-btn-secondary opacity-40 cursor-not-allowed'
                    : 'rev-btn-primary shadow-sm'
                }`}
              >
                {savingProfile ? 'Saving...' : 'Save'}
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
