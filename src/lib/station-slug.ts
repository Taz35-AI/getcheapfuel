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

// Look up a single station by its slug. Most Fuel Finder stations store
// their postcode with a space ("CV9 1HY"), which slugifies to two
// dash-separated segments ("cv9-1hy"). A minority of stations come
// through with the postcode glued ("CV91HY"), which slugifies to a
// single segment. We need to handle both shapes so Google's indexed
// URLs from either case keep resolving.
export async function findStationBySlug(slug: string): Promise<FuelStation | null> {
  if (!slug) return null;
  const clean = slug.toLowerCase().trim();
  if (!/^[a-z0-9-]+$/.test(clean)) return null;

  const segments = clean.split('-');
  if (segments.length < 1) return null;

  const candidatePostcodes: string[] = [];

  // Shape A: last 2 segments form the postcode with a space.
  //   "cv9-1hy" -> "CV9 1HY"
  if (segments.length >= 2) {
    const twoSeg = segments.slice(-2).join(' ').toUpperCase();
    if (/^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/.test(twoSeg)) {
      candidatePostcodes.push(twoSeg);
    }
  }

  // Shape B: the entire last segment is an unbroken postcode that we
  // split back into outcode + incode on the common UK pattern.
  //   "cv91hy" -> "CV9 1HY"
  const lastSeg = segments[segments.length - 1].toUpperCase();
  const oneSegMatch = lastSeg.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  if (oneSegMatch) {
    candidatePostcodes.push(`${oneSegMatch[1]} ${oneSegMatch[2]}`);
  }

  if (candidatePostcodes.length === 0) return null;

  const allStations = await fetchAllStations(86400);

  // Normalise both sides (strip internal whitespace) so "CV9 1HY" in the
  // DB matches a candidate of "CV91HY" generated from Shape B, and vice
  // versa. Final authority on the match is stationToSlug === clean.
  for (const postcode of candidatePostcodes) {
    const normalized = postcode.replace(/\s+/g, '');
    const matched = allStations.find((s) => {
      if (!s.postcode) return false;
      const dbNormalized = s.postcode.toUpperCase().replace(/\s+/g, '');
      if (dbNormalized !== normalized) return false;
      return stationToSlug(s) === clean;
    });
    if (matched) return matched;
  }
  return null;
}
