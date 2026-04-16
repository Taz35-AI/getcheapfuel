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
 *   fresh       <  3 days old   → green "Fresh"
 *   stale       3-14 days old   → blue "Stable" (price unchanged, likely still accurate)
 *   very-stale  >= 14 days old  → amber warning
 *   unknown     no timestamps   → grey
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
      label: 'Report date unknown',
    };
  }

  const mostRecentMs = Math.max(...candidates);
  const ageMs = now.getTime() - mostRecentMs;
  const ageDays = ageMs / DAY;

  let tier: FreshnessTier;
  if (ageDays < 3) tier = 'fresh';
  else if (ageDays < 14) tier = 'stale';
  else tier = 'very-stale';

  return {
    tier,
    mostRecent: new Date(mostRecentMs).toISOString(),
    label: formatRelative(ageMs, mostRecentMs),
  };
}

function formatRelative(ageMs: number, mostRecentMs: number): string {
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const days = Math.floor(ageMs / DAY);

  if (hours < 24) return 'Reported by station today';
  if (days === 1) return 'Reported today · Price changed yesterday';

  const date = new Date(mostRecentMs);
  const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
  return `Reported today · Price unchanged since ${formatted}`;
}

/**
 * Check whether a specific fuel price on a station is within the given
 * age limit. Used by report pages to exclude stale data from calculations.
 */
export function isFreshFuelPrice(
  station: FuelStation,
  fuel: 'E10' | 'E5' | 'B7' | 'SDV',
  maxAgeDays = 7,
  now: Date = new Date(),
): boolean {
  const updatedAt = station.priceUpdatedAt?.[fuel];
  if (!updatedAt) return false;
  const ts = Date.parse(updatedAt);
  if (isNaN(ts)) return false;
  return (now.getTime() - ts) <= maxAgeDays * DAY;
}

/** Tailwind classes per tier - used by the popup badge. */
export function freshnessClasses(tier: FreshnessTier): { bg: string; text: string; dot: string } {
  switch (tier) {
    case 'fresh':
      return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'stale':
      return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'very-stale':
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' };
  }
}

/** Human-friendly tier name for badge display. */
export function freshnessLabel(tier: FreshnessTier): string {
  switch (tier) {
    case 'fresh': return 'Fresh';
    case 'stale': return 'Stable';
    case 'very-stale': return 'Unverified';
    default: return 'Unknown';
  }
}
