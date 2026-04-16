'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const FAVOURITES_KEY = 'gcf_favourites';

interface FavStation {
  id: string;
  brand: string;
  address: string;
  postcode: string;
}

interface LeaderboardEntry {
  email: string;
  votes: number;
  up: number;
  down: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, displayName, signOut } = useAuth();
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [favourites, setFavourites] = useState<FavStation[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  // Load the crowdsourced price-accuracy leaderboard
  useEffect(() => {
    if (!user) return;
    setLoadingLeaderboard(true);
    fetch(apiUrl('/api/price-vote/leaderboard?limit=10'))
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.leaderboard)) {
          setLeaderboard(json.leaderboard);
        }
      })
      .catch(() => {
        // silent - leaderboard is non-critical
      })
      .finally(() => setLoadingLeaderboard(false));
  }, [user]);

  // Load display name and favourites with station details
  useEffect(() => {
    if (user) {
      setName(displayName);
      try {
        const stored = localStorage.getItem(FAVOURITES_KEY);
        if (stored) {
          const ids: string[] = JSON.parse(stored);
          setFavIds(ids);
          if (ids.length > 0) {
            // Fetch station details from Supabase
            supabase
              .from('fuel_stations_ff')
              .select('id, brand, address, postcode')
              .in('id', ids)
              .then(({ data }) => {
                if (data) {
                  setFavourites(data as FavStation[]);
                }
                setLoadingFavs(false);
              });
          } else {
            setLoadingFavs(false);
          }
        } else {
          setLoadingFavs(false);
        }
      } catch {
        setLoadingFavs(false);
      }
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
    const nextIds = favIds.filter(f => f !== id);
    setFavIds(nextIds);
    setFavourites(prev => prev.filter(f => f.id !== id));
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(nextIds));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch(apiUrl('/api/auth/delete-account'), {
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
            Favourite Stations ({favIds.length})
          </h2>
          {loadingFavs ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : favourites.length > 0 ? (
            <div className="space-y-2">
              {favourites.map(station => (
                <div key={station.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{station.brand}</div>
                    <div className="text-xs text-gray-500 truncate">{station.address}</div>
                    <div className="text-xs text-gray-400">{station.postcode}</div>
                  </div>
                  <button
                    onClick={() => removeFavourite(station.id)}
                    className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No favourite stations saved yet. Tap the heart icon on any station to save it.</p>
          )}
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

        {/* Price Accuracy Leaderboard */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top Contributors</h2>
            <span className="text-[10px] text-gray-400 font-medium">Price accuracy votes</span>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4">
            {loadingLeaderboard ? (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-6 px-2">
                <div className="text-xs font-semibold text-gray-700 mb-1">Be the first contributor</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">
                  Tap a station on the map → use the thumbs up / down buttons to verify fuel prices. Top contributors appear here.
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {leaderboard.map((entry, i) => {
                  const isMe = user?.email && entry.email.toLowerCase() === user.email.toLowerCase();
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                  // Truncate the email for display - first part only
                  const display = entry.email.split('@')[0];
                  return (
                    <li
                      key={entry.email}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                        isMe ? 'bg-white border border-emerald-300 ring-2 ring-emerald-100' : 'bg-white/60'
                      }`}
                    >
                      <div className="flex-shrink-0 w-8 text-center text-sm font-black text-gray-700">
                        {medal}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {display}
                          {isMe && (
                            <span className="ml-1.5 text-[9px] uppercase tracking-wider font-black text-emerald-600">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 tabular-nums">
                          👍 {entry.up} · 👎 {entry.down}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-black text-emerald-700 tabular-nums leading-none">
                          {entry.votes}
                        </div>
                        <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                          votes
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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
