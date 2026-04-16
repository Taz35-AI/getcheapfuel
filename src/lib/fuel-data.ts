import type { FuelStation } from './types';
import type { OpeningHours, StationAmenities } from './types';

// ─── Fuel Finder (read from Supabase cache) ──────────────────────────────────
// FF data is synced once a day to the fuel_stations_ff table by the
// /api/cron/sync-fuel-finder route (Vercel Cron). We just read it here -
// instant, no 30s cold-start fetch.

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
  e10_updated_at: string | null;
  e5_updated_at: string | null;
  b7_updated_at: string | null;
  sdv_updated_at: string | null;
  opening_times: OpeningHours | null;
  amenities: StationAmenities | null;
  last_updated: string | null;
}

// Per-bbox cache so repeated queries for the same area are instant
const ffBboxCache = new Map<string, { stations: FuelStation[]; expiresAt: number }>();
// Full-dataset cache for callers that don't pass a bounding box (city pages,
// fuel-index page)
let ffFullCache: { stations: FuelStation[]; expiresAt: number } | null = null;

interface BBox {
  lat: number;
  lng: number;
  radiusKm: number;
}

// Reject obvious garbage like 999.9 placeholders, but otherwise leave
// individual prices alone. Averages absorb the rare outliers.
function sanitisePrice(price: number | null | undefined): number | null {
  if (price == null) return null;
  if (price >= 100 && price <= 350) return price;
  return null;
}

function normaliseBrand(raw: string): string {
  if (!raw) return 'Unknown';
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Supermarkets
  if (lower.includes('sainsbury')) return "Sainsbury's";
  if (lower.includes('tesco')) return 'Tesco';
  if (lower.includes('asda')) return 'Asda';
  if (lower.includes('morrisons')) return 'Morrisons';
  if (lower.includes('coop') || lower.includes('cooperative')) return 'Co-op';
  if (lower.includes('costco')) return 'Costco';
  // Major branded
  if (lower.includes('shell')) return 'Shell';
  if (lower.includes('esso')) return 'Esso';
  if (lower.includes('texaco')) return 'Texaco';
  if (lower.includes('jet')) return 'Jet';
  if (lower.includes('gulf')) return 'Gulf';
  if (lower.includes('murco')) return 'Murco';
  if (lower.includes('maxol')) return 'Maxol';
  if (lower.includes('applegreen')) return 'Applegreen';
  if (lower.includes('harvest')) return 'Harvest Energy';
  if (lower.includes('certas')) return 'Certas Energy';
  // Motorway services
  if (lower.includes('moto') && !lower.includes('motor')) return 'Moto';
  if (lower.includes('roadchef')) return 'RoadChef';
  if (lower.includes('welcomebreak')) return 'Welcome Break';
  // Operators (often run forecourts under multiple brand names)
  if (lower.includes('rontec')) return 'Rontec';
  if (lower.includes('ascona')) return 'Ascona';
  if (lower.includes('mfg') || lower.includes('motorfuelgroup')) return 'Motor Fuel Group';
  if (lower.includes('eg') && lower.length <= 8) return 'EG Group';
  // BP last (would otherwise catch "MFG BP" etc.)
  if (lower.includes('bp')) return 'BP';
  return raw;
}

function rowToStation(row: FuelStationRow): FuelStation {
  return {
    id: row.id,
    brand: normaliseBrand(row.brand),
    name: normaliseBrand(row.name),
    address: row.address,
    postcode: row.postcode,
    latitude: row.latitude,
    longitude: row.longitude,
    prices: {
      E10: sanitisePrice(row.e10),
      E5: sanitisePrice(row.e5),
      B7: sanitisePrice(row.b7),
      SDV: sanitisePrice(row.sdv),
    },
    lastUpdated: row.last_updated ?? undefined,
    priceUpdatedAt: {
      E10: row.e10_updated_at,
      E5: row.e5_updated_at,
      B7: row.b7_updated_at,
      SDV: row.sdv_updated_at,
    },
    source: 'fuelfinder' as const,
    openingHours: row.opening_times ?? undefined,
    amenities: row.amenities ?? undefined,
  };
}

async function fetchFuelFinderStations(bbox?: BBox): Promise<FuelStation[]> {
  // Bounded queries - use per-bbox cache
  if (bbox) {
    const key = `${bbox.lat.toFixed(2)}|${bbox.lng.toFixed(2)}|${bbox.radiusKm}`;
    const cached = ffBboxCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.stations;
  } else if (ffFullCache && ffFullCache.expiresAt > Date.now()) {
    return ffFullCache.stations;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the query - bounding box if provided, otherwise full dataset
    let stations: FuelStation[];

    if (bbox) {
      // 1 deg lat ≈ 111 km. 1 deg lng ≈ 111 * cos(lat) km.
      // Add a small buffer (radius * 1.05) so we never miss edge cases.
      const dLat = (bbox.radiusKm * 1.05) / 111;
      const dLng = (bbox.radiusKm * 1.05) / (111 * Math.cos((bbox.lat * Math.PI) / 180));
      const minLat = bbox.lat - dLat;
      const maxLat = bbox.lat + dLat;
      const minLng = bbox.lng - dLng;
      const maxLng = bbox.lng + dLng;

      const { data, error } = await supabase
        .from('fuel_stations_ff')
        .select('*')
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng)
        .limit(2000);

      if (error) {
        console.error('[FuelFinder] Supabase bbox read error:', error.message);
        return [];
      }
      stations = (data ?? []).map(rowToStation);

      const key = `${bbox.lat.toFixed(2)}|${bbox.lng.toFixed(2)}|${bbox.radiusKm}`;
      ffBboxCache.set(key, { stations, expiresAt: Date.now() + 30 * 60 * 1000 });
      // Cap cache size to avoid unbounded growth
      if (ffBboxCache.size > 200) {
        const firstKey = ffBboxCache.keys().next().value;
        if (firstKey) ffBboxCache.delete(firstKey);
      }
    } else {
      // Full dataset - paginate through all rows
      const allRows: FuelStationRow[] = [];
      const pageSize = 1000;
      for (let from = 0; from < 20000; from += pageSize) {
        const { data, error } = await supabase
          .from('fuel_stations_ff')
          .select('*')
          .range(from, from + pageSize - 1);
        if (error) {
          console.error('[FuelFinder] Supabase full read error:', error.message);
          break;
        }
        if (!data || data.length === 0) break;
        allRows.push(...(data as FuelStationRow[]));
        if (data.length < pageSize) break;
      }
      stations = allRows.map(rowToStation);
      ffFullCache = { stations, expiresAt: Date.now() + 30 * 60 * 1000 };
    }

    return stations;
  } catch (err) {
    console.error('[FuelFinder] Failed to read from Supabase:', err);
    return [];
  }
}

export async function fetchAllStations(_revalidate = 300, bbox?: BBox): Promise<FuelStation[]> {
  return fetchFuelFinderStations(bbox);
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
