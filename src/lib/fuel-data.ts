import type { FuelStation } from './types';

export const CMA_FEEDS: Record<string, string> = {
  asda: 'https://storelocator.asda.com/fuel_prices_data.json',
  bp: 'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json',
  shell: 'https://www.shell.co.uk/fuel-prices-data.html',
  esso: 'https://fuelprices.esso.co.uk/latestdata.json',
  tesco: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json',
  morrisons: 'https://www.morrisons.com/fuel-prices/fuel.json',
  sainsburys: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json',
  jet: 'https://jetlocal.co.uk/fuel_prices_data.json',
  sgn: 'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json',
  rontec: 'https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json',
  mfg: 'https://fuel.motorfuelgroup.com/fuel_prices_data.json',
  ascona: 'https://fuelprices.asconagroup.co.uk/newfuel.json',
  moto: 'https://moto-way.com/fuel-price/fuel_prices.json',
  karan: 'https://devapi.krlpos.com/integration/live_price/krl',
};

interface CMAStation {
  site_id: string;
  brand: string;
  address: string;
  postcode: string;
  location: { latitude: number; longitude: number };
  prices: {
    E10?: number | null;
    E5?: number | null;
    B7?: number | null;
    SDV?: number | null;
  };
}

interface CMAFeed {
  last_updated: string;
  stations: CMAStation[];
}

// ─── Fuel Finder (read from Supabase cache) ──────────────────────────────────
// FF data is synced once a day to the fuel_stations_ff table by the
// /api/cron/sync-fuel-finder route (Vercel Cron). We just read it here —
// instant, no 30s cold-start fetch.

import type { OpeningHours, StationAmenities } from './types';

interface FuelStationRow {
  id: string;
  brand: string;
  name: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  e10: number | null;
  e5: number | null;
  b7: number | null;
  sdv: number | null;
  opening_times: OpeningHours | null;
  amenities: StationAmenities | null;
  last_updated: string | null;
}

let ffCache: { stations: FuelStation[]; expiresAt: number } | null = null;

async function fetchFuelFinderStations(): Promise<FuelStation[]> {
  if (ffCache && ffCache.expiresAt > Date.now()) {
    return ffCache.stations;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Paginate through all rows (Supabase default limit is 1000)
    const allRows: FuelStationRow[] = [];
    const pageSize = 1000;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await supabase
        .from('fuel_stations_ff')
        .select('*')
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('[FuelFinder] Supabase read error:', error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...(data as FuelStationRow[]));
      if (data.length < pageSize) break;
    }

    const stations: FuelStation[] = allRows.map(row => ({
      id: row.id,
      brand: row.brand,
      name: row.name,
      address: row.address,
      postcode: row.postcode,
      latitude: row.latitude,
      longitude: row.longitude,
      // Re-sanitise at read time so we drop any stale rows that were stored
      // under the old (looser) price range
      prices: {
        E10: sanitisePrice(row.e10),
        E5: sanitisePrice(row.e5),
        B7: sanitisePrice(row.b7),
        SDV: sanitisePrice(row.sdv),
      },
      lastUpdated: row.last_updated ?? undefined,
      source: 'fuelfinder' as const,
      openingHours: row.opening_times ?? undefined,
      amenities: row.amenities ?? undefined,
    }));

    // Cache for 5 minutes — Supabase reads are cheap but no need to spam
    ffCache = { stations, expiresAt: Date.now() + 5 * 60 * 1000 };
    return stations;
  } catch (err) {
    console.error('[FuelFinder] Failed to read from Supabase:', err);
    return [];
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Reject prices outside a realistic UK range (125p–250p) to filter out
// data entry errors, placeholders (e.g. 999.9, 110.9), and pound/pence mixups.
// Tighter than the absolute minimum because UK petrol has not dropped below
// 125p since 2021 and there is no realistic forecourt price above ~250p.
function sanitisePrice(price: number | null | undefined): number | null {
  if (price == null) return null;
  if (price >= 125 && price <= 250) return price;
  return null;
}
function normaliseBrand(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('sainsbury')) return "Sainsbury's";
  if (lower.includes('tesco')) return 'Tesco';
  if (lower.includes('asda')) return 'Asda';
  if (lower.includes('morrisons')) return 'Morrisons';
  if (lower.includes('shell')) return 'Shell';
  if (lower.includes('bp')) return 'BP';
  if (lower.includes('esso')) return 'Esso';
  return raw;
}
export async function fetchCMAFeed(brand: string, url: string, revalidate = 300): Promise<FuelStation[]> {
  try {
    const response = await fetch(url, {
  next: { revalidate: brand === 'sainsburys' ? 3600 : revalidate },
  signal: AbortSignal.timeout(8000),
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GetCheapFuel/1.0)',
    'Accept': 'application/json',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Referer': 'https://www.sainsburys.co.uk/',
  },
});
    if (!response.ok) return [];
    const data: CMAFeed = await response.json();
    return (data.stations || [])
      .filter(s => s.location?.latitude && s.location?.longitude)
      .map(station => ({
        id: `${brand}-${station.site_id}`,
        brand: normaliseBrand(station.brand || brand),
        name: normaliseBrand(station.brand || brand),
        address: station.address,
        postcode: station.postcode,
        latitude: station.location.latitude,
        longitude: station.location.longitude,
        prices: {
          E10: sanitisePrice(station.prices?.E10),
          E5: sanitisePrice(station.prices?.E5),
          B7: sanitisePrice(station.prices?.B7),
          SDV: sanitisePrice(station.prices?.SDV),
        },
        lastUpdated: data.last_updated,
        source: 'cma' as const,
      }));
  } catch {
    console.error(`Failed to fetch ${brand} fuel data`);
    return [];
  }
}

export async function fetchAllStations(revalidate = 300): Promise<FuelStation[]> {
  // NEW: run Fuel Finder + all CMA feeds in parallel
  const [fuelFinderResult, ...cmaResults] = await Promise.allSettled([
    fetchFuelFinderStations(),
    ...Object.entries(CMA_FEEDS).map(([brand, url]) => fetchCMAFeed(brand, url, revalidate)),
  ]);

  const ffStations: FuelStation[] =
    fuelFinderResult.status === 'fulfilled' ? fuelFinderResult.value : [];

  const cmaStations: FuelStation[] = cmaResults
    .filter((r): r is PromiseFulfilledResult<FuelStation[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Fuel Finder takes priority — skip CMA stations with matching postcode
  const seenPostcodes = new Set(ffStations.map(s => s.postcode.replace(/\s/g, '').toLowerCase()));
  const dedupedCma = cmaStations.filter(s => !seenPostcodes.has(s.postcode.replace(/\s/g, '').toLowerCase()));

  return [...ffStations, ...dedupedCma];
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function getStationsNear(allStations: FuelStation[], lat: number, lng: number, radiusKm: number): FuelStation[] {
  return allStations
    .filter(s => haversineDistance(lat, lng, s.latitude, s.longitude) <= radiusKm)
    .sort((a, b) =>
      haversineDistance(lat, lng, a.latitude, a.longitude) -
      haversineDistance(lat, lng, b.latitude, b.longitude)
    );
}
