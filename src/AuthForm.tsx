import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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
      if (!username.trim()) {
        setError('Username is required for sign up.');
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username: username.trim() }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (signUpData.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            username: username.trim(),
            email: email.trim().toLowerCase(),
          });
        }
        setMessage('Account created! You can now sign in.');
      }
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else if (signInData.user) {
        // Ensure profile exists on sign in
        const metaName = signInData.user.user_metadata?.username || email.split('@')[0];
        await supabase.from('profiles').upsert({
          id: signInData.user.id,
          username: metaName,
          email: email.trim().toLowerCase(),
        }, { onConflict: 'id', ignoreDuplicates: true });
      }
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen rev-canvas flex flex-col items-center justify-center p-4 font-sans">
      
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 
            className="text-4xl sm:text-5xl font-spectral uppercase mb-3 tracking-[0.35em]"
            style={{ color: 'var(--rev-text-bright)' }}
          >
            Reverie
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.4em]" style={{ color: 'var(--rev-text-faint)' }}>
            Companion
          </p>
        </div>

        {/* Form Panel */}
        <div className="sheet-panel shadow-sm overflow-hidden">
          <div className="p-8 flex flex-col gap-5">
            
            <h2 className="text-xl font-bold border-b rev-divider pb-3 mb-2" style={{ color: 'var(--rev-text)' }}>
              {isSignUp ? 'Create an Account' : 'Sign In'}
            </h2>

            {error && (
              <div className="sheet-panel-red text-sm p-3" style={{ color: 'var(--rev-accent-text)' }}>
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-green-950/40 border border-green-900 text-green-300 text-sm p-3 rounded-lg">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                  Username
                  <input
                    type="text"
                    required
                    className="rev-input p-3 mt-1 font-normal shadow-inner"
                    placeholder="e.g. Alistair"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
              )}

              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Email
                <input
                  type="email"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner"
                  placeholder="soul@dunyor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="flex flex-col text-sm font-bold" style={{ color: 'var(--rev-text-muted)' }}>
                Password
                <input
                  type="password"
                  required
                  className="rev-input p-3 mt-1 font-normal shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 rev-btn-primary font-bold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-sm font-bold transition-colors"
                style={{ color: 'var(--rev-text-faint)' }}
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