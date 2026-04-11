import type { FuelStation } from './types';

export type FreshnessTier = 'fresh' | 'stale' | 'very-stale' | 'unknown';

export interface Freshness {
  tier: FreshnessTier;
  /** Most recent update timestamp across all fuels at the station, ISO string. */
  mostRecent: string | null;
  /** "Updated 2 hours ago" / "Updated 4 days ago" / "Last updated unknown" */
  label: string;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Compute a station's data freshness from its per-fuel update timestamps.
 *
 * Tiers:
 *   fresh       <  3 days old   → display normally
 *   stale       3-7 days old    → amber warning colour
 *   very-stale  >= 7 days old   → red, explicit "may be out of date"
 *   unknown     no timestamps   → fall back to the cron last-sync time
 */
export function getStationFreshness(station: FuelStation, now: Date = new Date()): Freshness {
  const updates = station.priceUpdatedAt;

  // Pull the four per-fuel timestamps and pick the most recent
  const candidates: number[] = [];
  if (updates) {
    for (const key of ['E10', 'E5', 'B7', 'SDV'] as const) {
      const v = updates[key];
      if (typeof v === 'string') {
        const t = Date.parse(v);
        if (!isNaN(t)) candidates.push(t);
      }
    }
  }

  if (candidates.length === 0) {
    return {
      tier: 'unknown',
      mostRecent: null,
      label: 'Last updated date unknown',
    };
  }

  const mostRecentMs = Math.max(...candidates);
  const ageMs = now.getTime() - mostRecentMs;
  const ageDays = ageMs / DAY;

  let tier: FreshnessTier;
  if (ageDays < 3) tier = 'fresh';
  else if (ageDays < 7) tier = 'stale';
  else tier = 'very-stale';

  return {
    tier,
    mostRecent: new Date(mostRecentMs).toISOString(),
    label: formatRelative(ageMs),
  };
}

function formatRelative(ageMs: number): string {
  const minutes = Math.floor(ageMs / (60 * 1000));
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const days = Math.floor(ageMs / DAY);

  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Updated ${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months === 1 ? '' : 's'} ago`;
}

/** Tailwind classes per tier — used by the popup badge. */
export function freshnessClasses(tier: FreshnessTier): { bg: string; text: string; dot: string } {
  switch (tier) {
    case 'fresh':
      return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'stale':
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'very-stale':
      return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' };
  }
}
