import { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    console.log("Submitting:", mode, email);

    // Call the methods directly so they keep their "this" context!
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="p-8 max-w-md mx-auto flex flex-col gap-3 mt-20 border rounded shadow-sm">
      <h1 className="text-2xl font-bold mb-2">{mode === 'signin' ? 'Sign in' : 'Sign up'}</h1>
      
      <label className="flex flex-col text-sm">
        Email
        <input 
          className="border p-2 rounded mt-1" 
          type="email" 
          placeholder="you@example.com"
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
      </label>

      <label className="flex flex-col text-sm">
        Password
        <input 
          className="border p-2 rounded mt-1" 
          type="password" 
          placeholder="••••••••"
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      
      <button 
        className="bg-blue-600 text-white p-2 rounded mt-2 hover:bg-blue-700 transition disabled:opacity-50" 
        type="submit"
        disabled={loading}
      >
        {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
      </button>
      
      <button 
        type="button" 
        className="text-sm text-gray-600 underline mt-2"
        onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}