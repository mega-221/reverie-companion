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
    const tab: 'characters' | 'parties' | 'rules' =
      rawTab === 'rules'
        ? 'rules'
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
  const [activeTab, setActiveTab] = useState<'characters' | 'parties' | 'rules'>(initialParams.tab);
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
    tab?: 'characters' | 'parties' | 'rules';
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
      if (updates.tab === 'parties' || updates.tab === 'rules') {
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

  const handleTabChange = (tab: 'characters' | 'parties' | 'rules') => {
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
          {/* Dedicated Header for Character Select / Parties / Rules (not Character Sheet) */}
          <header className="sticky top-0 z-40 rev-header-bar shadow-md w-full transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap md:flex-nowrap justify-between items-center gap-x-4 gap-y-2">
              <div className="order-1 flex flex-col min-w-0">
                <h1
                  className="text-xl sm:text-2xl font-spectral uppercase tracking-[0.25em] sm:tracking-[0.3em] leading-tight shrink-0"
                  style={{ color: 'var(--rev-header-text)' }}
                >
                  Reverie
                </h1>
                <p className="hidden sm:block text-[11px] truncate max-w-[220px] lg:max-w-[280px]" style={{ color: 'var(--rev-header-muted)' }}>
                  Logged in as <strong style={{ color: 'var(--rev-header-text)' }}>{username || user.email}</strong>
                </p>
              </div>

              <nav
                aria-label="Primary navigation"
                className="order-3 md:order-2 w-full md:w-auto flex items-center gap-1.5 sm:gap-2"
              >
                <button
                  type="button"
                  onClick={() => handleTabChange('characters')}
                  aria-current={activeTab === 'characters' ? 'page' : undefined}
                  className={`flex-auto md:flex-none justify-center px-2.5 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors whitespace-nowrap border text-center ${
                    activeTab === 'characters' ? 'rev-btn-primary shadow-sm' : 'hover:opacity-100 opacity-85'
                  }`}
                  style={
                    activeTab === 'characters'
                      ? undefined
                      : {
                          backgroundColor: 'var(--rev-header-btn)',
                          borderColor: 'var(--rev-header-border)',
                          color: 'var(--rev-header-text)',
                        }
                  }
                >
                  My Characters
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('parties')}
                  aria-current={activeTab === 'parties' ? 'page' : undefined}
                  className={`flex-auto md:flex-none justify-center px-2.5 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors whitespace-nowrap border text-center ${
                    activeTab === 'parties' ? 'rev-btn-primary shadow-sm' : 'hover:opacity-100 opacity-85'
                  }`}
                  style={
                    activeTab === 'parties'
                      ? undefined
                      : {
                          backgroundColor: 'var(--rev-header-btn)',
                          borderColor: 'var(--rev-header-border)',
                          color: 'var(--rev-header-text)',
                        }
                  }
                >
                  Parties
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('rules')}
                  aria-current={activeTab === 'rules' ? 'page' : undefined}
                  className={`flex-auto md:flex-none justify-center px-2.5 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors whitespace-nowrap border text-center ${
                    activeTab === 'rules' ? 'rev-btn-primary shadow-sm' : 'hover:opacity-100 opacity-85'
                  }`}
                  style={
                    activeTab === 'rules'
                      ? undefined
                      : {
                          backgroundColor: 'var(--rev-header-btn)',
                          borderColor: 'var(--rev-header-border)',
                          color: 'var(--rev-header-text)',
                        }
                  }
                >
                  Rules
                </button>
              </nav>

              <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button 
                  type="button"
                  className="px-2.5 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 border transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--rev-header-btn)',
                    borderColor: 'var(--rev-header-border)',
                    color: 'var(--rev-header-text)',
                  }}
                  onClick={() => setIsSettingsOpen(true)}
                >
                  Settings
                </button>
                <button 
                  type="button"
                  className="px-2.5 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 border transition-opacity hover:opacity-90"
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