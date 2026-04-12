'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, loading, signInWithMagicLink, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError('');

    const { error: authError } = await signInWithMagicLink(email.trim());

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setSending(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            {user ? 'Your Account' : 'Sign In'}
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
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-400">Signed in</div>
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
          ) : sent ? (
            /* ── Magic link sent ── */
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Check your email</div>
              <div className="text-xs text-gray-500 mb-4">
                We sent a sign-in link to <strong>{email}</strong>. Click the link to sign in — no password needed.
              </div>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-xs text-green-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Sign in form ── */
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Sign in to sync your favourites, fuel tracker, and price alerts across all your devices. No password needed.
              </p>

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="w-full px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  )}
                  Send Magic Link
                </button>
              </form>

              {error && (
                <div className="mt-3 text-center text-xs text-red-500 font-medium">{error}</div>
              )}

              <p className="mt-4 text-[10px] text-gray-400 text-center">
                By signing in you agree to our privacy policy. We only use your email for authentication and data sync.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
