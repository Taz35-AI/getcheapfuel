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

// ─── Fuel Finder (UK Gov CMA) ────────────────────────────────────────────────
const FUEL_FINDER_BASE = 'https://www.fuel-finder.service.gov.uk';

interface FuelFinderLocation {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  country?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}

interface FuelFinderStation {
  node_id: string;
  trading_name: string;
  brand_name?: string;
  temporary_closure?: boolean;
  permanent_closure?: boolean | null;
  location?: FuelFinderLocation;
}

interface FuelFinderFuelPrice {
  fuel_type: string;
  price: number;
  price_last_updated?: string;
  price_change_effective_timestamp?: string;
}

interface FuelFinderPriceEntry {
  node_id: string;
  trading_name: string;
  fuel_prices: FuelFinderFuelPrice[];
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let firstCallLogged = false;

async function getFuelFinderToken(): Promise<string | null> {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  try {
    const res = await fetch(`${FUEL_FINDER_BASE}/api/v1/oauth/generate_access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Fuel Finder token failed:', res.status, text.slice(0, 300));
      return null;
    }
    const json = await res.json();
    // Response shape is { success, data, message } — token nested inside data
    const data = json.data ?? json;
    const token = data.access_token ?? data.token ?? data.accessToken ?? json.access_token;
    if (!token) {
      console.error('Fuel Finder token response had no access_token. Top keys:', Object.keys(json), 'data keys:', data && typeof data === 'object' ? Object.keys(data) : 'n/a');
      return null;
    }
    const expiresIn = data.expires_in ?? data.expiresIn ?? json.expires_in ?? 3600;
    cachedToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    console.log('[FuelFinder] Token acquired, expires in', expiresIn, 'seconds');
    return token;
  } catch (err) {
    console.error('Fuel Finder token error:', err);
    return null;
  }
}

function normaliseFuelType(raw: string): 'E10' | 'E5' | 'B7' | 'SDV' | null {
  if (!raw) return null;
  const u = raw.toUpperCase().replace(/[\s_-]/g, '');
  // Order matters — check super/premium variants before generic
  if (u === 'SDV' || u === 'SDVSTANDARD' || u.includes('SUPERDIESEL') || u.includes('PREMIUMDIESEL')) return 'SDV';
  if (u === 'E5' || u === 'E5STANDARD' || u.includes('PREMIUMUNLEADED') || u.includes('SUPERUNLEADED')) return 'E5';
  if (u === 'E10' || u === 'E10STANDARD' || u === 'UNLEADED' || u === 'PETROL') return 'E10';
  if (u === 'B7' || u === 'B7STANDARD' || u === 'DIESEL') return 'B7';
  return null;
}

// Fetch all batches of an endpoint until we get an empty array
async function fetchAllBatches<T>(path: string, token: string): Promise<T[]> {
  const all: T[] = [];
  for (let batch = 1; batch <= 50; batch++) {
    try {
      const url = `${FUEL_FINDER_BASE}${path}${path.includes('?') ? '&' : '?'}batch-number=${batch}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        console.error(`[FuelFinder] ${path} batch ${batch} failed:`, res.status);
        break;
      }
      const data: T[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < 500) break; // last batch
    } catch (err) {
      console.error(`[FuelFinder] ${path} batch ${batch} error:`, err);
      break;
    }
  }
  return all;
}

// Cache for the full Fuel Finder dataset — refreshed on demand
let ffCache: { stations: FuelStation[]; expiresAt: number } | null = null;

async function fetchFuelFinderStations(): Promise<FuelStation[]> {
  // Cache the full dataset for 1 hour — fetching all 7,600 stations takes ~30s
  if (ffCache && ffCache.expiresAt > Date.now()) {
    return ffCache.stations;
  }

  const token = await getFuelFinderToken();
  if (!token) return [];

  try {
    const [stations, prices] = await Promise.all([
      fetchAllBatches<FuelFinderStation>('/api/v1/pfs', token),
      fetchAllBatches<FuelFinderPriceEntry>('/api/v1/pfs/fuel-prices', token),
    ]);

    if (!firstCallLogged) {
      firstCallLogged = true;
      console.log('[FuelFinder] Stations:', stations.length, 'Prices:', prices.length);
    }

    // Build a price map keyed by node_id
    const priceMap = new Map<string, Partial<Record<'E10' | 'E5' | 'B7' | 'SDV', number>>>();
    for (const p of prices) {
      if (!Array.isArray(p.fuel_prices)) continue;
      const fuelObj: Partial<Record<'E10' | 'E5' | 'B7' | 'SDV', number>> = {};
      for (const fp of p.fuel_prices) {
        const fuel = normaliseFuelType(fp.fuel_type);
        if (fuel && typeof fp.price === 'number') {
          fuelObj[fuel] = fp.price;
        }
      }
      if (Object.keys(fuelObj).length > 0) priceMap.set(p.node_id, fuelObj);
    }

    // Convert stations to our shape
    const result: FuelStation[] = [];
    for (const s of stations) {
      if (s.temporary_closure || s.permanent_closure) continue;
      const loc = s.location;
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;

      const stationPrices = priceMap.get(s.node_id) ?? {};
      const addressParts = [loc.address_line_1, loc.address_line_2, loc.city, loc.county]
        .filter((p): p is string => Boolean(p && p.trim()));

      result.push({
        id: `ff-${s.node_id}`,
        brand: normaliseBrand(s.brand_name || s.trading_name || 'Unknown'),
        name: normaliseBrand(s.brand_name || s.trading_name || 'Unknown'),
        address: addressParts.join(', ') || s.trading_name,
        postcode: loc.postcode || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        prices: {
          E10: sanitisePrice(stationPrices.E10),
          E5: sanitisePrice(stationPrices.E5),
          B7: sanitisePrice(stationPrices.B7),
          SDV: sanitisePrice(stationPrices.SDV),
        },
        lastUpdated: new Date().toISOString(),
        source: 'fuelfinder' as const,
      });
    }

    console.log(`[FuelFinder] Returning ${result.length} usable stations`);

    // Cache for 1 hour
    ffCache = { stations: result, expiresAt: Date.now() + 60 * 60 * 1000 };
    return result;
  } catch (err) {
    console.error('Failed to fetch Fuel Finder stations:', err);
    return [];
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Reject prices outside a sane range (100p–350p) to filter out
// data entry errors, placeholders (e.g. 999.9), and pound/pence mixups
function sanitisePrice(price: number | null | undefined): number | null {
  if (price == null) return null;
  if (price >= 100 && price <= 350) return price;
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
