import { Suspense, lazy, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Character } from './types';
import Auth from './AuthForm';
import CharacterList from './CharacterList';
import PartyDashboard from './PartyDashboard';
import SettingsModal from './components/SettingsModal';
import { CompendiumProvider } from './CompendiumContext';

const CharacterSheet = lazy(() => import('./CharacterSheet'));
const PartyDetail = lazy(() => import('./PartyDetail'));
const NpcCreator = lazy(() => import('./components/npcs/NpcCreator'));
const RulesBrowser = lazy(() =>
  import('./components/rules/RulesBrowser').then((m) => ({ default: m.RulesBrowser }))
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectingCharacter, setInspectingCharacter] = useState<Character | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUsername('');
      return;
    }
    supabase.from('profiles').select('username').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.username) {
          setUsername(data.username);
        } else if (user.user_metadata?.username) {
          setUsername(user.user_metadata.username);
        } else {
          setUsername(user.email?.split('@')[0] || 'Adventurer');
        }
      });
  }, [user]);
  
  const getParamsFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const partyId = params.get('party');
    const rawTab = params.get('tab');
    const tab: 'characters' | 'parties' | 'npcs' | 'rules' =
      rawTab === 'rules'
        ? 'rules'
        : rawTab === 'npcs'
          ? 'npcs'
          : rawTab === 'parties' || partyId
            ? 'parties'
            : 'characters';
    return {
      characterId: params.get('character'),
      readOnly: params.get('readonly') === 'true',
      tab,
      partyId,
      chapterId: params.get('chapter'),
      sectionId: params.get('section'),
    };
  };

  const initialParams = getParamsFromUrl();
  const [selectedId, setSelectedId] = useState<string | null>(initialParams.characterId);
  const [readOnlySheet, setReadOnlySheet] = useState<boolean>(initialParams.readOnly);
  const [activeTab, setActiveTab] = useState<'characters' | 'parties' | 'npcs' | 'rules'>(initialParams.tab);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(initialParams.partyId);
  const [rulesChapterId, setRulesChapterId] = useState<string | null>(initialParams.chapterId);
  const [rulesSectionId, setRulesSectionId] = useState<string | null>(initialParams.sectionId);

  useEffect(() => {
    const handlePopState = () => {
      const p = getParamsFromUrl();
      setSelectedId(p.characterId);
      setReadOnlySheet(p.readOnly);
      setActiveTab(p.tab);
      setSelectedPartyId(p.partyId);
      setRulesChapterId(p.chapterId);
      setRulesSectionId(p.sectionId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrlParams = (updates: {
    character?: string | null;
    readonly?: boolean;
    tab?: 'characters' | 'parties' | 'npcs' | 'rules';
    party?: string | null;
    chapter?: string | null;
    section?: string | null;
  }) => {
    const url = new URL(window.location.href);
    if (updates.character !== undefined) {
      if (updates.character) url.searchParams.set('character', updates.character);
      else url.searchParams.delete('character');
    }
    if (updates.readonly !== undefined) {
      if (updates.readonly) url.searchParams.set('readonly', 'true');
      else url.searchParams.delete('readonly');
    }
    if (updates.tab !== undefined) {
      if (updates.tab === 'parties' || updates.tab === 'npcs' || updates.tab === 'rules') {
        url.searchParams.set('tab', updates.tab);
      } else {
        url.searchParams.delete('tab');
      }
    }
    if (updates.party !== undefined) {
      if (updates.party) url.searchParams.set('party', updates.party);
      else url.searchParams.delete('party');
    }
    if (updates.chapter !== undefined) {
      if (updates.chapter) url.searchParams.set('chapter', updates.chapter);
      else url.searchParams.delete('chapter');
    }
    if (updates.section !== undefined) {
      if (updates.section) url.searchParams.set('section', updates.section);
      else url.searchParams.delete('section');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectCharacter = (id: string | null, readOnly = false) => {
    setSelectedId(id);
    setReadOnlySheet(readOnly);
    updateUrlParams({ character: id, readonly: readOnly });
  };

  const handleTabChange = (tab: 'characters' | 'parties' | 'npcs' | 'rules') => {
    setActiveTab(tab);
    setSelectedPartyId(null);
    setSelectedId(null);
    setReadOnlySheet(false);
    if (tab === 'rules') {
      updateUrlParams({
        tab,
        party: null,
        character: null,
        readonly: false,
        chapter: rulesChapterId,
        section: rulesSectionId,
      });
    } else {
      updateUrlParams({
        tab,
        party: null,
        character: null,
        readonly: false,
        chapter: null,
        section: null,
      });
    }
  };

  const handleRulesLocationChange = (chapterId: string, sectionId: string | null) => {
    setRulesChapterId(chapterId);
    setRulesSectionId(sectionId);
    updateUrlParams({
      tab: 'rules',
      chapter: chapterId,
      section: sectionId,
    });
  };

  const handleSelectParty = (partyId: string | null) => {
    setSelectedPartyId(partyId);
    updateUrlParams({ party: partyId });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setSelectedId(null);
        setReadOnlySheet(false);
        setSelectedPartyId(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('character');
        url.searchParams.delete('readonly');
        url.searchParams.delete('tab');
        url.searchParams.delete('party');
        url.searchParams.delete('chapter');
        url.searchParams.delete('section');
        window.history.replaceState({}, '', url.toString());
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen rev-canvas flex items-center justify-center text-xl" style={{ color: 'var(--rev-text-muted)' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <CompendiumProvider>
      {/* Global Film Grain Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.03] mix-blend-screen"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%222.5%22 numOctaves=%221%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      {selectedId ? (
        <div className="w-full min-h-screen font-sans">
          <Suspense
            fallback={
              <div className="w-full min-h-screen rev-canvas flex items-center justify-center text-lg" style={{ color: 'var(--rev-text-muted)' }}>
                Loading character sheet...
              </div>
            }
          >
            <CharacterSheet 
              id={selectedId} 
              currentUserId={user.id}
              currentUserEmail={user.email || ''}
              currentUsername={username}
              onUsernameUpdated={setUsername}
              partyId={selectedPartyId || undefined}
              readOnly={readOnlySheet} 
              initialCharacter={inspectingCharacter || undefined}
              onBack={() => {
                setInspectingCharacter(null);
                if (selectedPartyId) {
                  setSelectedId(null);
                  setReadOnlySheet(false);
                  updateUrlParams({ character: null, readonly: false, tab: 'parties' });
                } else {
                  handleSelectCharacter(null);
                }
              }}
              onNavigateToRules={(chapterId, sectionId) => {
                setInspectingCharacter(null);
                setSelectedId(null);
                setReadOnlySheet(false);
                setSelectedPartyId(null);
                setActiveTab('rules');
                setRulesChapterId(chapterId);
                setRulesSectionId(sectionId);
                updateUrlParams({
                  character: null,
                  readonly: false,
                  party: null,
                  tab: 'rules',
                  chapter: chapterId,
                  section: sectionId,
                });
              }}
            />
          </Suspense>
        </div>
      ) : (
        <div className="w-full min-h-screen rev-canvas font-sans flex flex-col">
          {/* Dedicated Full-Width Header for Character Select / Parties / NPCs / Rules */}
          <header className="sticky top-0 z-40 rev-header-bar shadow-md w-full transition-colors duration-300">
            <div className="w-full px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-0 md:pb-2.5 flex flex-wrap md:flex-nowrap justify-between items-center gap-x-6 gap-y-1.5">
              <div className="order-1 flex flex-col items-start min-w-0 shrink-0 pb-1.5 md:pb-0">
                <h1
                  className="text-xl sm:text-2xl font-spectral uppercase tracking-[0.25em] sm:tracking-[0.35em] leading-tight shrink-0"
                  style={{ color: 'var(--rev-header-text)' }}
                >
                  Reverie
                </h1>
                <span className="text-[11px] truncate max-w-[200px]" style={{ color: 'var(--rev-header-muted)' }}>
                  Logged in as <strong style={{ color: 'var(--rev-header-text)' }}>{username || user.email?.split('@')[0] || 'Adventurer'}</strong>
                </span>
              </div>

              <nav
                aria-label="Primary navigation"
                className="order-3 md:order-2 w-full md:w-auto flex items-center justify-start md:justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t md:border-t-0"
                style={{ borderColor: 'var(--rev-header-border)' }}
              >
                {(
                  [
                    { id: 'characters', label: 'Characters' },
                    { id: 'parties', label: 'Parties' },
                    { id: 'npcs', label: 'NPC Creator' },
                    { id: 'rules', label: 'Rules' },
                  ] as const
                ).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      data-active={isActive ? 'true' : 'false'}
                      className="rev-home-tab relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-spectral font-normal tracking-[0.12em] uppercase whitespace-nowrap"
                      style={{
                        color: 'var(--rev-header-text)',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0 pb-1.5 md:pb-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  aria-label="Settings"
                  title="Settings"
                  className="p-1.5 rounded border text-white hover:opacity-90 transition-colors shrink-0"
                  style={{
                    backgroundColor: 'var(--rev-header-btn)',
                    borderColor: 'var(--rev-header-border)',
                    color: 'var(--rev-header-text)',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="px-2.5 sm:px-3.5 py-1.5 rounded text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 border transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--rev-header-btn)',
                    borderColor: 'var(--rev-header-border)',
                    color: 'var(--rev-header-text)',
                  }}
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div className="w-full max-w-7xl mx-auto p-3 sm:p-8 flex-1">
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              userId={user.id}
              userEmail={user.email || ''}
              currentUsername={username}
              onUsernameUpdated={setUsername}
            />

            {/* Content View */}
            {activeTab === 'characters' && (
              <CharacterList userId={user.id} onSelect={(id) => handleSelectCharacter(id, false)} />
            )}

            {activeTab === 'parties' && (
              selectedPartyId ? (
                <Suspense
                  fallback={
                    <div className="sheet-panel p-12 text-center" style={{ color: 'var(--rev-text-muted)' }}>
                      Loading party...
                    </div>
                  }
                >
                  <PartyDetail
                    partyId={selectedPartyId}
                    userId={user.id}
                    userUsername={username || user.email?.split('@')[0] || 'Adventurer'}
                    onBack={() => handleSelectParty(null)}
                    onInspectCharacter={(char) => {
                      setInspectingCharacter(char);
                      handleSelectCharacter(char.id, false);
                    }}
                  />
                </Suspense>
              ) : (
                <PartyDashboard
                  userId={user.id}
                  userEmail={user.email || ''}
                  onSelectParty={handleSelectParty}
                />
              )
            )}

            {activeTab === 'npcs' && (
              <Suspense
                fallback={
                  <div className="sheet-panel p-12 text-center" style={{ color: 'var(--rev-text-muted)' }}>
                    Loading NPC Creator...
                  </div>
                }
              >
                <NpcCreator userId={user.id} />
              </Suspense>
            )}

            {activeTab === 'rules' && (
              <Suspense
                fallback={
                  <div className="sheet-panel p-12 text-center" style={{ color: 'var(--rev-text-muted)' }}>
                    Loading rulebook...
                  </div>
                }
              >
                <RulesBrowser
                  initialChapterId={rulesChapterId}
                  initialSectionId={rulesSectionId}
                  onLocationChange={handleRulesLocationChange}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}
    </CompendiumProvider>
  );
}