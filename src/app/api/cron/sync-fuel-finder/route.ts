import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// Vercel Cron hits this once a day. Fetches all UK Fuel Finder stations
// + prices + opening hours + amenities, then replaces the Supabase cache.
// Function takes ~30s to complete, so we need the long timeout.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const FUEL_FINDER_BASE = 'https://www.fuel-finder.service.gov.uk';

interface FFLocation {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}

interface FFStation {
  node_id: string;
  trading_name: string;
  brand_name?: string;
  temporary_closure?: boolean;
  permanent_closure?: boolean | null;
  location?: FFLocation;
  amenities?: string[];
  // Per Fuel Finder API docs the daily entries use `open`/`close`, but
  // the bank_holiday block uses `open_time`/`close_time`. Accept both on
  // either side so we're tolerant if the upstream field naming shifts.
  opening_times?: {
    usual_days?: Record<
      string,
      { open?: string; close?: string; open_time?: string; close_time?: string; is_24_hours?: boolean }
    >;
    bank_holiday?: {
      standard?: { open?: string; close?: string; open_time?: string; close_time?: string; is_24_hours?: boolean };
    };
  };
}

interface FFFuelPrice {
  fuel_type: string;
  price: number;
  price_last_updated?: string;
  price_change_effective_timestamp?: string;
}

interface FFPriceEntry {
  node_id: string;
  fuel_prices: FFFuelPrice[];
}

function normaliseFuelType(raw: string): 'E10' | 'E5' | 'B7' | 'SDV' | null {
  if (!raw) return null;
  const u = raw.toUpperCase().replace(/[\s_-]/g, '');
  if (u === 'SDV' || u === 'SDVSTANDARD' || u === 'B7PREMIUM' || u.includes('SUPERDIESEL') || u.includes('PREMIUMDIESEL')) return 'SDV';
  if (u === 'E5' || u === 'E5STANDARD' || u.includes('PREMIUMUNLEADED') || u.includes('SUPERUNLEADED')) return 'E5';
  if (u === 'E10' || u === 'E10STANDARD' || u === 'UNLEADED' || u === 'PETROL') return 'E10';
  if (u === 'B7' || u === 'B7STANDARD' || u === 'DIESEL') return 'B7';
  return null;
}

function normaliseBrand(raw: string): string {
  if (!raw) return 'Unknown';
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('sainsbury')) return "Sainsbury's";
  if (lower.includes('tesco')) return 'Tesco';
  if (lower.includes('asda')) return 'Asda';
  if (lower.includes('morrisons')) return 'Morrisons';
  if (lower.includes('coop') || lower.includes('cooperative')) return 'Co-op';
  if (lower.includes('costco')) return 'Costco';
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
  if (lower.includes('moto') && !lower.includes('motor')) return 'Moto';
  if (lower.includes('roadchef')) return 'RoadChef';
  if (lower.includes('welcomebreak')) return 'Welcome Break';
  if (lower.includes('rontec')) return 'Rontec';
  if (lower.includes('ascona')) return 'Ascona';
  if (lower.includes('mfg') || lower.includes('motorfuelgroup')) return 'Motor Fuel Group';
  if (lower.includes('eg') && lower.length <= 8) return 'EG Group';
  if (lower.includes('bp')) return 'BP';
  return raw;
}

// Reject obvious garbage like 999.9 placeholders, leave individual prices alone.
function sanitisePrice(p: number | null | undefined): number | null {
  if (p == null) return null;
  if (p >= 100 && p <= 350) return p;
  return null;
}

async function getToken(): Promise<string> {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing FF credentials');
  const res = await fetch(`${FUEL_FINDER_BASE}/api/v1/oauth/generate_access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const json = await res.json();
  const token = json.data?.access_token ?? json.access_token;
  if (!token) throw new Error('No access_token in response');
  return token;
}

async function fetchWithRetry(url: string, token: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return res;
      // 429 / 5xx - retry after a short pause
      if (attempt < retries && (res.status === 429 || res.status >= 500)) {
        console.warn(`[sync] ${url} returned ${res.status}, retrying (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return res; // non-retryable error
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[sync] ${url} failed, retrying (${attempt + 1}/${retries})...`, (err as Error).message);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[sync] ${url} failed after ${retries + 1} attempts`);
}

async function fetchAllBatches<T>(path: string, token: string): Promise<T[]> {
  const all: T[] = [];
  for (let batch = 1; batch <= 50; batch++) {
    const url = `${FUEL_FINDER_BASE}${path}${path.includes('?') ? '&' : '?'}batch-number=${batch}`;
    const res = await fetchWithRetry(url, token);
    if (!res.ok) {
      console.error(`[sync] ${path} batch ${batch} failed: ${res.status}`);
      break;
    }
    const data: T[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < 500) break;
  }
  return all;
}

// Fuel Finder amenities come back as a flat string array, e.g.
// ["adblue_packaged", "customer_toilets", "water_filling"]. Convert to flags.
function parseAmenities(raw: string[] | undefined): Record<string, boolean> {
  const a: Record<string, boolean> = {};
  if (!Array.isArray(raw)) return a;
  for (const key of raw) {
    if (typeof key === 'string') a[key] = true;
  }
  return a;
}

export async function GET(request: Request) {
  // Accept either ?secret= query param (manual triggers) or
  // Authorization: Bearer header (Vercel Cron automatic)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  console.log('[sync-ff] Starting at', new Date().toISOString());

  try {
    const token = await getToken();
    console.log('[sync-ff] Token acquired');

    const [stations, prices] = await Promise.all([
      fetchAllBatches<FFStation>('/api/v1/pfs', token),
      fetchAllBatches<FFPriceEntry>('/api/v1/pfs/fuel-prices', token),
    ]);
    console.log(`[sync-ff] Fetched ${stations.length} stations, ${prices.length} price entries`);

    type FuelKey = 'E10' | 'E5' | 'B7' | 'SDV';
    interface FuelPriceData {
      price: number;
      updatedAt: string | null;
    }
    const priceMap = new Map<string, Partial<Record<FuelKey, FuelPriceData>>>();
    for (const p of prices) {
      if (!Array.isArray(p.fuel_prices)) continue;
      const fuelObj: Partial<Record<FuelKey, FuelPriceData>> = {};
      for (const fp of p.fuel_prices) {
        const fuel = normaliseFuelType(fp.fuel_type);
        if (fuel && typeof fp.price === 'number') {
          // Prefer the "effective at the pump" timestamp, fall back to
          // when the API last received the update.
          const updatedAt = fp.price_change_effective_timestamp ?? fp.price_last_updated ?? null;
          fuelObj[fuel] = { price: fp.price, updatedAt };
        }
      }
      if (Object.keys(fuelObj).length > 0) priceMap.set(p.node_id, fuelObj);
    }

    type Row = {
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
      opening_times: unknown;
      amenities: unknown;
      last_updated: string;
    };

    const rows: Row[] = [];
    for (const s of stations) {
      if (s.temporary_closure || s.permanent_closure) continue;
      const loc = s.location;
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;

      const stationPrices = priceMap.get(s.node_id) ?? {};
      const addressParts = [loc.address_line_1, loc.address_line_2, loc.city, loc.county]
        .filter((p): p is string => Boolean(p && p.trim()));

      // Parse opening hours into a simple per-day shape we can use in the
      // UI. Fuel Finder's daily entries come back as { open, close,
      // is_24_hours } - NOT open_time/close_time, which is only used on
      // bank holidays. If we only read open_time/close_time, every
      // non-24h station ends up with just { is_24_hours: false } in the
      // DB and no times to display. Normalise to open_time/close_time on
      // the way into the DB so downstream parsing has one consistent
      // shape.
      const usualDays = s.opening_times?.usual_days ?? {};
      const openingTimes: Record<string, unknown> = {};
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
        const d = usualDays[day];
        if (d) {
          openingTimes[day] = {
            open_time: d.open ?? d.open_time,
            close_time: d.close ?? d.close_time,
            is_24_hours: d.is_24_hours,
          };
        }
      }
      const bh = s.opening_times?.bank_holiday?.standard;
      if (bh) {
        openingTimes.bank_holiday = {
          open_time: bh.open_time ?? bh.open,
          close_time: bh.close_time ?? bh.close,
          is_24_hours: bh.is_24_hours,
        };
      }

      rows.push({
        id: `ff-${s.node_id}`,
        brand: normaliseBrand(s.brand_name || s.trading_name || 'Unknown'),
        name: normaliseBrand(s.brand_name || s.trading_name || 'Unknown'),
        address: addressParts.join(', ') || s.trading_name,
        postcode: loc.postcode || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        e10: sanitisePrice(stationPrices.E10?.price),
        e5: sanitisePrice(stationPrices.E5?.price),
        b7: sanitisePrice(stationPrices.B7?.price),
        sdv: sanitisePrice(stationPrices.SDV?.price),
        e10_updated_at: stationPrices.E10?.updatedAt ?? null,
        e5_updated_at: stationPrices.E5?.updatedAt ?? null,
        b7_updated_at: stationPrices.B7?.updatedAt ?? null,
        sdv_updated_at: stationPrices.SDV?.updatedAt ?? null,
        opening_times: Object.keys(openingTimes).length > 0 ? openingTimes : null,
        amenities: parseAmenities(s.amenities),
        last_updated: new Date().toISOString(),
      });
    }

    const supabase = getServiceClient();

    // Wipe and replace
    console.log('[sync-ff] Clearing existing rows...');
    const { error: deleteError } = await supabase
      .from('fuel_stations_ff')
      .delete()
      .neq('id', '__sentinel_value_that_will_never_match__');
    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

    console.log(`[sync-ff] Inserting ${rows.length} rows in chunks of 500...`);
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('fuel_stations_ff').insert(chunk);
      if (error) throw new Error(`Insert chunk ${i / chunkSize} failed: ${error.message}`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[sync-ff] Done in ${elapsed}s - ${rows.length} stations synced`);

    return NextResponse.json({
      success: true,
      stationsSynced: rows.length,
      durationSeconds: parseFloat(elapsed),
    });
  } catch (err) {
    console.error('[sync-ff] FAILED:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
