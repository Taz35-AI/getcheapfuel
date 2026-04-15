'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { FuelType } from '@/lib/types';

interface PriceVoteButtonsProps {
  stationId: string;
  fuelType: Exclude<FuelType, 'EV'>;
  // Host-provided callback that opens the sign-up / sign-in modal.
  onRequestAuth?: () => void;
}

// localStorage keys
const VOTES_KEY = 'gcf-price-votes';

// Number of thumbs-down votes in the effective window before we
// flash a warning banner asking users to verify at the station.
const WARNING_THRESHOLD = 3;

// Where we keep the user's own recent votes to prevent double-voting
// from the same device within a 24h window.
interface LocalVote {
  vote: 'up' | 'down';
  at: number;
  email: string;
}
type LocalVotes = Record<string, LocalVote>;

function readLocalVotes(): LocalVotes {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalVotes(v: LocalVotes) {
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

export default function PriceVoteButtons({
  stationId,
  fuelType,
  onRequestAuth,
}: PriceVoteButtonsProps) {
  const { user } = useAuth();
  const key = `${stationId}:${fuelType}`;
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [localVote, setLocalVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // When an anonymous visitor taps a thumb we show a friendly
  // "sign in to rate" card inline instead of yanking them straight
  // into the auth modal. Gives context for why they need an account.
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const votes = readLocalVotes();
    const existing = votes[key];
    if (
      existing &&
      existing.email === (user?.email || '') &&
      Date.now() - existing.at < 24 * 60 * 60 * 1000
    ) {
      setLocalVote(existing.vote);
    } else {
      setLocalVote(null);
    }
    fetch(apiUrl(`/api/price-vote?stationId=${encodeURIComponent(stationId)}&fuelType=${fuelType}`))
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setUp(Number(json.up) || 0);
        setDown(Number(json.down) || 0);
      })
      .catch(() => {
        // Silently fail — buttons still work for voting, just no count
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, fuelType, key, user?.email]);

  // Hide the auth prompt the moment the user successfully signs in
  // so they can immediately vote without another tap.
  useEffect(() => {
    if (user?.email) setShowAuthPrompt(false);
  }, [user?.email]);

  const submit = useCallback(
    async (vote: 'up' | 'down') => {
      // ── Auth gate ────────────────────────────────────────────
      // Anonymous visitors see an inline explainer instead of
      // the modal jumping up unexplained.
      if (!user?.email) {
        setShowAuthPrompt(true);
        return;
      }

      if (submitting || localVote === vote) return;
      setSubmitting(true);
      // Optimistic local update so the UI feels instant
      const previous = localVote;
      setLocalVote(vote);
      setUp((prev) => (vote === 'up' ? prev + 1 : previous === 'up' ? Math.max(0, prev - 1) : prev));
      setDown((prev) =>
        vote === 'down' ? prev + 1 : previous === 'down' ? Math.max(0, prev - 1) : prev,
      );
      const votes = readLocalVotes();
      votes[key] = { vote, at: Date.now(), email: user.email };
      writeLocalVotes(votes);

      try {
        await fetch(apiUrl('/api/price-vote'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId,
            fuelType,
            vote,
            voterEmail: user.email,
          }),
        });
      } catch {
        // Server failed — roll back the optimistic update
        setLocalVote(previous);
        setUp((prev) =>
          vote === 'up' ? Math.max(0, prev - 1) : previous === 'up' ? prev + 1 : prev,
        );
        setDown((prev) =>
          vote === 'down' ? Math.max(0, prev - 1) : previous === 'down' ? prev + 1 : prev,
        );
      } finally {
        setSubmitting(false);
      }
    },
    [user?.email, submitting, localVote, key, stationId, fuelType],
  );

  const showWarning = !loading && down >= WARNING_THRESHOLD;

  return (
    <div className="mt-2">
      {/* Warning banner — only when down >= threshold in window */}
      {showWarning && (
        <div className="mb-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[9px] text-amber-800 font-semibold leading-tight">
            Price may be outdated. Please verify with the station.
          </p>
        </div>
      )}

      {/* Sign-in prompt for anonymous visitors — a friendly inline
          card instead of a jarring auth-modal ambush. */}
      {showAuthPrompt && !user?.email ? (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200 p-2.5 shadow-sm">
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-emerald-200/40 blur-xl pointer-events-none" />
          <div className="relative flex items-start gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-black text-gray-900 leading-tight">
                Help fellow drivers 🙌
              </div>
              <p className="text-[9px] text-gray-600 leading-snug mt-0.5">
                Only signed-up users can rate prices. Takes 10 seconds — your vote keeps data accurate for everyone.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onRequestAuth?.();
                    setShowAuthPrompt(false);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-sm shadow-emerald-600/25 transition-colors"
                >
                  Sign up / Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthPrompt(false)}
                  className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
              Is this price accurate?
            </span>
          </div>
          {/* Chunky mobile-friendly pill buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => submit('up')}
              disabled={submitting}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black transition-all ${
                localVote === 'up'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95'
              } ${submitting ? 'opacity-60' : ''}`}
              aria-label={user?.email ? 'Price is accurate' : 'Sign in to rate'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill={localVote === 'up' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-9 1.5.5a2 2 0 0 1 1.5 1.88z" />
              </svg>
              <span className="text-[11px] tabular-nums">{up}</span>
            </button>
            <button
              type="button"
              onClick={() => submit('down')}
              disabled={submitting}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-black transition-all ${
                localVote === 'down'
                  ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/25 scale-[1.02]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-95'
              } ${submitting ? 'opacity-60' : ''}`}
              aria-label={user?.email ? 'Price is wrong' : 'Sign in to rate'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill={localVote === 'down' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 14V2" />
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-4 9-1.5-.5a2 2 0 0 1-1.5-1.88z" />
              </svg>
              <span className="text-[11px] tabular-nums">{down}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
