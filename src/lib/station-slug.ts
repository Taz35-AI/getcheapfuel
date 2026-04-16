import type { FuelStation } from './types';
import { fetchAllStations } from './fuel-data';

// Lower-case a string and collapse anything non-alphanumeric into '-'.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pull the street portion from the station address.
// Addresses come in as e.g. "109-113 YORK WAY, LONDON, LONDON" - we want
// "YORK WAY" as the SEO-friendly street part of the slug.
function extractStreet(address: string | undefined): string {
  if (!address) return '';
  const first = address.split(',')[0] || '';
  // Strip leading house numbers/dashes + collapse whitespace.
  return first.replace(/^[\d\s\-/]+/, '').trim();
}

// Deterministic slug: "{brand}-{street}-{postcode}" lowercased.
// Example - Shell at 109-113 York Way, London N7 9QE →
//   shell-york-way-n7-9qe
// The slug is stable across re-syncs because it derives only from fields
// that almost never change: brand name, street name, postcode. If any of
// those do change, the slug changes - we accept that small risk because
// the alternative (UUID-based slugs) would hurt SEO readability.
export function stationToSlug(station: Pick<FuelStation, 'brand' | 'address' | 'postcode'>): string {
  const parts = [
    slugify(station.brand || ''),
    slugify(extractStreet(station.address)),
    slugify(station.postcode || ''),
  ].filter(Boolean);
  return parts.join('-');
}

// Look up a single station by its slug. We first try to extract the
// postcode from the last two segments of the slug and narrow the search
// to stations in that postcode - this avoids scanning all 8k stations
// for every request.
export async function findStationBySlug(slug: string): Promise<FuelStation | null> {
  if (!slug) return null;
  const clean = slug.toLowerCase().trim();
  if (!/^[a-z0-9-]+$/.test(clean)) return null;

  const segments = clean.split('-');
  if (segments.length < 2) return null;

  // UK postcodes are always two segments: outcode + incode (e.g. n7 9qe).
  const postcodeSlug = segments.slice(-2).join(' ').toUpperCase();
  const isValidPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/.test(postcodeSlug);
  if (!isValidPostcode) return null;

  const allStations = await fetchAllStations(86400);
  const candidates = allStations.filter(
    (s) => s.postcode?.toUpperCase() === postcodeSlug,
  );
  return candidates.find((s) => stationToSlug(s) === clean) || null;
}
