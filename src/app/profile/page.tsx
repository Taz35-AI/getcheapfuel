'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const FAVOURITES_KEY = 'gcf_favourites';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, displayName, signOut } = useAuth();
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  // Load display name and favourites
  useEffect(() => {
    if (user) {
      setName(displayName);
      try {
        const stored = localStorage.getItem(FAVOURITES_KEY);
        if (stored) setFavourites(JSON.parse(stored));
      } catch {}
    }
  }, [user, displayName]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    if (error) {
      setStatusMsg('Failed to update name');
    } else {
      setStatusMsg('Name updated');
      setEditingName(false);
    }
    setSavingName(false);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const removeFavourite = (id: string) => {
    const next = favourites.filter(f => f !== id);
    setFavourites(next);
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (res.ok) {
        await signOut();
        router.push('/');
      } else {
        const data = await res.json();
        setStatusMsg(data.error || 'Failed to delete account');
        setDeleting(false);
      }
    } catch {
      setStatusMsg('Failed to delete account');
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="h-screen overflow-y-auto bg-white">
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
        >
          &larr; Back to GetCheapFuel
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{displayName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Member since {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Edit name */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Display Name</h2>
          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingName(false); setName(displayName); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-900">{displayName}</span>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-green-600 font-semibold hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </section>

        {/* Favourites */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Favourite Stations ({favourites.length})
          </h2>
          {favourites.length > 0 ? (
            <div className="space-y-2">
              {favourites.map(id => (
                <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-mono">{id}</span>
                  <button
                    onClick={() => removeFavourite(id)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No favourite stations saved yet. Tap the heart icon on any station to save it.</p>
          )}
        </section>

        {/* Settings link */}
        <section className="mb-8">
          <Link
            href="/settings"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div>
              <div className="text-sm font-semibold text-gray-900">Settings</div>
              <div className="text-xs text-gray-500">Map style, fuel types, search radius</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </section>

        {/* Sign out */}
        <section className="mb-8">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </section>

        {/* Delete account */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h2>
          {deleteConfirm ? (
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-3">
                This will permanently delete your account and all associated data (fuel logs, alerts). This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 font-medium hover:underline"
            >
              Delete my account
            </button>
          )}
        </section>

        {statusMsg && (
          <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
            statusMsg.includes('Failed') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {statusMsg}
          </div>
        )}
      </div>
    </main>
  );
}
