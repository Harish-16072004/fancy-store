import React, { useState } from 'react';
import { Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError.message || 'Failed to create account.');
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message || 'Invalid email or password.');
        }
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 font-sans select-none neo-bg">
      <div className="w-full max-w-md relative z-10">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 neo-flat mb-5 text-[var(--color-sky)]">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-navy)] tracking-tight">
            Ariya Thangam
          </h1>
          <p className="text-[var(--color-sky)] font-extrabold font-mono text-xs tracking-widest uppercase mt-2">
            Store Operations
          </p>
        </div>

        {/* Login card */}
        <div className="neo-flat p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-[var(--color-navy)] flex justify-center items-center gap-2">
              {mode === 'login' ? (
                <><LogIn className="w-5 h-5 text-[var(--color-sky)]" /> Staff Login</>
              ) : (
                <><UserPlus className="w-5 h-5 text-[var(--color-sky)]" /> Register Staff</>
              )}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {mode === 'login'
                ? 'Sign in to access your dashboard.'
                : 'Create a new operations account.'}
            </p>
          </div>

          {signupSuccess ? (
            <div className="neo-pressed p-5 text-center space-y-3">
              <p className="text-[var(--color-navy)] text-sm font-bold">Account created!</p>
              <p className="text-slate-500 text-sm">
                Please confirm your email address before signing in.
              </p>
              <button
                type="button"
                onClick={() => { setMode('login'); setSignupSuccess(false); }}
                className="mt-4 neo-btn px-6 py-2 text-[var(--color-sky)] w-full"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--color-navy)] ml-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full neo-pressed p-3 pl-4 text-sm font-medium text-[var(--color-navy)] focus:outline-none placeholder:text-slate-400"
                    placeholder="staff@ariyathangam.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--color-navy)] ml-2">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full neo-pressed p-3 pl-4 text-sm font-medium text-[var(--color-navy)] focus:outline-none placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 text-red-600 text-sm font-bold text-center neo-pressed bg-red-50/30">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full neo-btn-navy py-3.5 flex justify-center items-center gap-2 text-sm disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </div>

              {/* Toggle Mode */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-sm font-bold text-slate-500 hover:text-[var(--color-sky)] transition-colors"
                >
                  {mode === 'login'
                    ? "New staff member? Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer info */}
        <div className="text-center mt-8">
           <p className="text-slate-400 text-xs font-mono">Running on secure Supabase cloud</p>
        </div>
      </div>
    </div>
  );
}
