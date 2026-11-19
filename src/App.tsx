import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Character } from './types';
import Auth from './AuthForm';
import CharacterList from './CharacterList';
import CharacterSheet from './CharacterSheet';
import PartyDashboard from './PartyDashboard';
import PartyDetail from './PartyDetail';
import SettingsModal from './components/SettingsModal';
import { CompendiumProvider } from './CompendiumContext';

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
    const tab = params.get('tab') === 'parties' || partyId ? 'parties' : 'characters';
    return {
      characterId: params.get('character'),
      readOnly: params.get('readonly') === 'true',
      tab,
      partyId,
    };
  };

  const initialParams = getParamsFromUrl();
  const [selectedId, setSelectedId] = useState<string | null>(initialParams.characterId);
  const [readOnlySheet, setReadOnlySheet] = useState<boolean>(initialParams.readOnly);
  const [activeTab, setActiveTab] = useState<'characters' | 'parties'>(initialParams.tab as any);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(initialParams.partyId);

  useEffect(() => {
    const handlePopState = () => {
      const p = getParamsFromUrl();
      setSelectedId(p.characterId);
      setReadOnlySheet(p.readOnly);
      setActiveTab(p.tab as any);
      setSelectedPartyId(p.partyId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrlParams = (updates: { character?: string | null; readonly?: boolean; tab?: string; party?: string | null }) => {
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
      if (updates.tab === 'parties') url.searchParams.set('tab', 'parties');
      else url.searchParams.delete('tab');
    }
    if (updates.party !== undefined) {
      if (updates.party) url.searchParams.set('party', updates.party);
      else url.searchParams.delete('party');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectCharacter = (id: string | null, readOnly = false) => {
    setSelectedId(id);
    setReadOnlySheet(readOnly);
    updateUrlParams({ character: id, readonly: readOnly });
  };

  const handleTabChange = (tab: 'characters' | 'parties') => {
    setActiveTab(tab);
    setSelectedPartyId(null);
    setSelectedId(null);
    setReadOnlySheet(false);
    updateUrlParams({ tab, party: null, character: null, readonly: false });
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
        window.history.replaceState({}, '', url.toString());
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen rev-canvas flex items-center justify-center font-cinzel text-xl" style={{ color: 'var(--rev-text-muted)' }}>
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
          />
        </div>
      ) : (
        <div className="w-full min-h-screen rev-canvas p-3 sm:p-8 font-sans">
          <div className="max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-5 sm:mb-6 border-b rev-divider pb-4 gap-3">
              <div className="flex flex-col min-w-0">
                <h1 
                  className="text-lg sm:text-2xl uppercase mb-0.5 tracking-[0.22em] sm:tracking-[0.35em]"
                  style={{ fontFamily: "'Spectral SC', serif", color: 'var(--rev-text-bright)' }}
                >
                  Reverie
                </h1>
                <p className="text-xs truncate" style={{ color: 'var(--rev-text-muted)' }}>
                  Logged in as <strong style={{ color: 'var(--rev-text)' }}>{username || user.email}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button 
                  className="rev-btn-secondary px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  Settings
                </button>
                <button 
                  className="rev-btn-secondary px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold"
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign out
                </button>
              </div>
            </div>

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              userId={user.id}
              userEmail={user.email || ''}
              currentUsername={username}
              onUsernameUpdated={setUsername}
            />

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-5 sm:mb-6 border-b rev-divider-subtle pb-4">
              <button
                onClick={() => handleTabChange('characters')}
                className={`flex-1 sm:flex-initial text-center px-4 sm:px-5 py-2.5 font-bold text-sm transition-colors ${activeTab === 'characters' ? 'rev-btn-primary shadow-sm' : 'rev-btn-secondary opacity-85 hover:opacity-100'}`}
              >
                My Characters
              </button>
              <button
                onClick={() => handleTabChange('parties')}
                className={`flex-1 sm:flex-initial text-center px-4 sm:px-5 py-2.5 font-bold text-sm transition-colors ${activeTab === 'parties' ? 'rev-btn-primary shadow-sm' : 'rev-btn-secondary opacity-85 hover:opacity-100'}`}
              >
                Parties
              </button>
            </div>

            {/* Content View */}
            {activeTab === 'characters' && (
              <CharacterList userId={user.id} onSelect={(id) => handleSelectCharacter(id, false)} />
            )}

            {activeTab === 'parties' && (
              selectedPartyId ? (
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
              ) : (
                <PartyDashboard
                  userId={user.id}
                  userEmail={user.email || ''}
                  onSelectParty={handleSelectParty}
                />
              )
            )}
          </div>
        </div>
      )}
    </CompendiumProvider>
  );
}