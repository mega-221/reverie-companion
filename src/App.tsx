import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import Auth from './AuthForm';
import CharacterList from './CharacterList';
import CharacterSheet from './CharacterSheet';
import { CompendiumProvider } from './CompendiumContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-900 flex items-center justify-center font-cinzel text-xl text-gray-400">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <CompendiumProvider>
      {selectedId ? (
        <div className="w-full min-h-screen bg-gray-900 font-sans">
          <CharacterSheet id={selectedId} onBack={() => setSelectedId(null)} />
        </div>
      ) : (
        <div className="w-full min-h-screen bg-gray-900 p-8 font-sans text-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
              <p className="text-sm text-gray-400">
                Logged in as <strong className="text-gray-200">{user.email}</strong>
              </p>
              <button 
                className="border border-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-800 transition-colors"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </div>
            <CharacterList userId={user.id} onSelect={setSelectedId} />
          </div>
        </div>
      )}
    </CompendiumProvider>
  );
}