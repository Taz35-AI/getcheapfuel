'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, loading, displayName, signUp, signIn, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  if (!open) return null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setSaving(true);
    setError('');

    const { error: authError } = await signUp(email.trim(), password, name.trim());
    if (authError) {
      setError(authError.message);
    } else {
      setSignedUp(true);
    }
    setSaving(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setSaving(true);
    setError('');

    const { error: authError } = await signIn(email.trim(), password);
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Incorrect email or password'
        : authError.message
      );
    } else {
      onClose();
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
    setSignedUp(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            {user ? 'Your Account' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : user ? (
            /* ── Signed in ── */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="text-xs font-semibold text-green-700 mb-1">Synced across devices</div>
                <ul className="text-xs text-green-600 space-y-0.5">
                  <li>Favourite stations</li>
                  <li>Fuel spending tracker</li>
                  <li>Price alert settings</li>
                </ul>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : signedUp ? (
            /* ── Verification email sent ── */
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Check your email</div>
              <div className="text-xs text-gray-500 mb-4">
                We sent a verification link to <strong>{email}</strong>. Click the link to verify your account, then come back and sign in.
              </div>
              <button
                onClick={() => { resetForm(); setMode('login'); }}
                className="text-sm text-green-600 font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          ) : mode === 'signup' ? (
            /* ── Sign up form ── */
            <div>
              <form onSubmit={handleSignUp} className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Create Account
                </button>
              </form>

              {error && (
                <div className="mt-3 text-center text-xs text-red-500 font-medium">{error}</div>
              )}

              <div className="mt-4 text-center text-xs text-gray-500">
                Already have an account?{' '}
                <button onClick={() => { resetForm(); setMode('login'); }} className="text-green-600 font-semibold hover:underline">
                  Sign In
                </button>
              </div>
            </div>
          ) : (
            /* ── Sign in form ── */
            <div>
              <form onSubmit={handleSignIn} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Sign In
                </button>
              </form>

              {error && (
                <div className="mt-3 text-center text-xs text-red-500 font-medium">{error}</div>
              )}

              <div className="mt-4 text-center text-xs text-gray-500">
                Don&apos;t have an account?{' '}
                <button onClick={() => { resetForm(); setMode('signup'); }} className="text-green-600 font-semibold hover:underline">
                  Create Account
                </button>
              </div>

              <p className="mt-4 text-[10px] text-gray-400 text-center">
                Sign in to sync your favourites, fuel tracker, and alerts across all your devices.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
