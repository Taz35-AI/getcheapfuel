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
  // 'horizontal' (default) stacks the two thumbs side-by-side and fills
  // the parent width. 'vertical' stacks them on top of each other in a
  // compact column so they can sit next to a big price without taking
  // much horizontal space.
  orientation?: 'horizontal' | 'vertical';
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
  orientation = 'horizontal',
}: PriceVoteButtonsProps) {
  const { user } = useAuth();
  const key = `${stationId}:${fuelType}`;
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [localVote, setLocalVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Shown as a small centred modal (NOT inside the fuel tile) when
  // an anonymous visitor taps a thumb, so the station popup stays
  // compact and only explodes into the explainer when we need it.
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
      // Anonymous visitors → pop the centred sign-in dialog.
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
    <>
      <div>
        {/* Warning banner — only when down >= threshold in window */}
        {showWarning && (
          <div className="mb-1 flex items-start gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-2.5 h-2.5 text-amber-600 flex-shrink-0 mt-0.5"
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
            <p className="text-[8px] text-amber-800 font-semibold leading-tight">
              Price may be outdated — verify at the station
            </p>
          </div>
        )}

        {/* Compact inline thumbs row — small footprint so the tile
            stays tight. Just two pill buttons with a thumb + count.
            Horizontal (default) fills the tile width below the price;
            vertical stacks them tightly so they can sit next to a big
            price. */}
        <div className={orientation === 'vertical' ? 'flex flex-col gap-0.5' : 'flex items-center gap-1'}>
          <button
            type="button"
            onClick={() => submit('up')}
            disabled={submitting}
            className={`flex items-center justify-center gap-0.5 rounded-md border text-[10px] font-black transition-all ${
              orientation === 'vertical' ? 'px-1.5 py-0 min-w-[28px]' : 'flex-1 py-0.5'
            } ${
              localVote === 'up'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 active:scale-95'
            } ${submitting ? 'opacity-60' : ''}`}
            aria-label={user?.email ? 'Price is accurate' : 'Sign in to rate'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-2.5 h-2.5"
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
            <span className="tabular-nums">{up}</span>
          </button>
          <button
            type="button"
            onClick={() => submit('down')}
            disabled={submitting}
            className={`flex items-center justify-center gap-0.5 rounded-md border text-[10px] font-black transition-all ${
              orientation === 'vertical' ? 'px-1.5 py-0 min-w-[28px]' : 'flex-1 py-0.5'
            } ${
              localVote === 'down'
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 active:scale-95'
            } ${submitting ? 'opacity-60' : ''}`}
            aria-label={user?.email ? 'Price is wrong' : 'Sign in to rate'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-2.5 h-2.5"
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
            <span className="tabular-nums">{down}</span>
          </button>
        </div>
      </div>

      {/* ─── Centred sign-in prompt dialog ──────────────────────────
          Renders above the station popup (z-index high enough to
          cover it) so the petrol-station modal itself stays lean. */}
      {showAuthPrompt && !user?.email && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAuthPrompt(false)}
          />
          <div className="relative w-full max-w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/10">
            {/* Gradient header with a friendly star */}
            <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white px-5 pt-5 pb-5 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-14 -left-10 w-28 h-28 rounded-full bg-emerald-400/25 blur-2xl pointer-events-none" />
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-4 pb-5 text-center">
              <h3 className="text-base font-black text-gray-900 leading-tight">
                Help fellow drivers 🙌
              </h3>
              <p className="text-[12px] text-gray-600 leading-snug mt-2">
                Only signed-up users can rate fuel prices. It takes <span className="font-bold text-gray-900">10 seconds</span> — your vote keeps prices accurate for everyone on the road.
              </p>

              {/* Actions */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRequestAuth?.();
                    setShowAuthPrompt(false);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-sm font-black shadow-lg shadow-emerald-600/25 transition-all"
                >
                  Sign up / Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthPrompt(false)}
                  className="w-full py-2 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
