import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import Auth from './AuthForm'; // Make sure this matches your file name!
import CharacterList from './CharacterList';
import CharacterSheet from './CharacterSheet';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null); // NEW

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
    return <p className="p-8 text-center text-gray-500">Loading...</p>;
  }

  if (!user) {
    return <Auth />;
  }

  // NEW: Handle selected character view
  if (selectedId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button onClick={() => setSelectedId(null)} className="border px-3 py-1 rounded text-sm mb-6 hover:bg-gray-50">
          ← Back to List
        </button>
             <CharacterSheet id={selectedId} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <p className="text-sm text-gray-600">Logged in as <strong>{user.email}</strong></p>
        <button 
          className="border px-3 py-1 rounded text-sm hover:bg-gray-50"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>
      
      <CharacterList userId={user.id} onSelect={setSelectedId} />
    </div>
  );
}