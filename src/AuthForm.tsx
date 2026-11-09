import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Account created! You can now sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans text-gray-200">
      
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 
            className="text-4xl sm:text-5xl text-gray-100 uppercase mb-3"
            style={{ fontFamily: "'Spectral SC', serif", letterSpacing: '0.35em', paddingLeft: '0.35em' }}
          >
            Reverie
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.4em]">
            Companion
          </p>
        </div>

        {/* Form Panel - Updated to match sheet-panel styling */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-8 flex flex-col gap-5">
            
            <h2 className="text-xl font-cinzel font-bold text-gray-200 border-b border-gray-700 pb-3 mb-2">
              {isSignUp ? 'Create an Account' : 'Sign In'}
            </h2>

            {error && (
              <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-950/40 border border-green-900 text-green-300 text-sm p-3 rounded-lg">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col text-sm font-bold text-gray-400">
                Email
                <input
                  type="email"
                  required
                  className="border border-gray-700 bg-black/40 p-3 rounded-lg mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200"
                  placeholder="soul@dunyor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="flex flex-col text-sm font-bold text-gray-400">
                Password
                <input
                  type="password"
                  required
                  className="border border-gray-700 bg-black/40 p-3 rounded-lg mt-1 font-normal shadow-inner focus:outline-none focus:border-red-500 text-gray-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 bg-red-900 hover:bg-red-800 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}