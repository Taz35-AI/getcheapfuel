import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_FUELS = ['E10', 'E5', 'B7', 'SDV'] as const;
const VALID_VOTES = ['up', 'down'] as const;

// Column name on fuel_stations_ff that holds the retailer's own
// "last updated" timestamp for each fuel type. Used to invalidate
// stale thumbs votes the moment a fresh price is pushed from the
// UK gov feed.
const FUEL_UPDATED_COLUMN: Record<(typeof VALID_FUELS)[number], string> = {
  E10: 'e10_updated_at',
  E5: 'e5_updated_at',
  B7: 'b7_updated_at',
  SDV: 'sdv_updated_at',
};

function isValidFuel(f: string): f is (typeof VALID_FUELS)[number] {
  return (VALID_FUELS as readonly string[]).includes(f);
}
function isValidVote(v: string): v is (typeof VALID_VOTES)[number] {
  return (VALID_VOTES as readonly string[]).includes(v);
}

// GET /api/price-vote?stationId=X&fuelType=Y
//
// Returns up/down counts in the "effective window" for this fuel:
//
//   since = MAX(fuel_updated_at, now - 24h)
//
// In other words, votes only count from whichever is MORE RECENT:
// the retailer's last price update (per fuel), or 24 hours ago.
// This means the moment the daily cron syncs fresh prices from the
// UK gov feed, old thumbs-down votes against the previous stale
// price stop being shown — the user never sees a false "price may
// be outdated" warning on a freshly-verified price.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');
  const fuelType = searchParams.get('fuelType');

  if (!stationId || !fuelType || !isValidFuel(fuelType)) {
    return NextResponse.json({ error: 'stationId and valid fuelType required' }, { status: 400 });
  }

  // Pull the retailer's last-updated timestamp for this specific
  // fuel. If the station is missing from the cache or the column
  // is null we fall back to the 24h rolling window below.
  const column = FUEL_UPDATED_COLUMN[fuelType];
  const { data: stationRow } = await supabase
    .from('fuel_stations_ff')
    .select(column)
    .eq('id', stationId)
    .maybeSingle();

  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fuelUpdatedRaw = (stationRow as Record<string, unknown> | null)?.[column];
  const fuelUpdatedAt =
    typeof fuelUpdatedRaw === 'string' && fuelUpdatedRaw.length > 0
      ? new Date(fuelUpdatedRaw)
      : null;

  // MAX(fuel_updated_at, now - 24h)
  const since =
    fuelUpdatedAt && !Number.isNaN(fuelUpdatedAt.getTime()) && fuelUpdatedAt > rolling24h
      ? fuelUpdatedAt
      : rolling24h;

  const { data, error } = await supabase
    .from('station_price_votes')
    .select('vote')
    .eq('station_id', stationId)
    .eq('fuel_type', fuelType)
    .gte('voted_at', since.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const up = (data || []).filter((r) => r.vote === 'up').length;
  const down = (data || []).filter((r) => r.vote === 'down').length;

  return NextResponse.json({
    stationId,
    fuelType,
    up,
    down,
    // Helpful metadata so the frontend can (later) show "resets when
    // the retailer updates the price" explainers if we want.
    since: since.toISOString(),
    resetReason: fuelUpdatedAt && fuelUpdatedAt > rolling24h ? 'price-refreshed' : 'rolling-24h',
  });
}

// POST /api/price-vote { stationId, fuelType, vote, voterEmail }
// Records a vote on price accuracy. The client must be signed in —
// the UI opens the auth modal for anonymous visitors before the
// vote ever reaches this endpoint. The email is validated as a real
// shape but the server trusts what the authenticated client sends.
export async function POST(request: Request) {
  let body: {
    stationId?: string;
    fuelType?: string;
    vote?: string;
    voterEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { stationId, fuelType, vote, voterEmail } = body;

  if (!stationId || !fuelType || !vote || !voterEmail) {
    return NextResponse.json(
      { error: 'stationId, fuelType, vote and voterEmail required' },
      { status: 400 },
    );
  }
  if (!isValidFuel(fuelType)) {
    return NextResponse.json({ error: 'invalid fuelType' }, { status: 400 });
  }
  if (!isValidVote(vote)) {
    return NextResponse.json({ error: 'invalid vote — must be up or down' }, { status: 400 });
  }
  // Cheap shape check — prevents empty / absurdly long inputs
  if (!voterEmail.includes('@') || voterEmail.length > 320) {
    return NextResponse.json({ error: 'invalid voterEmail' }, { status: 400 });
  }

  const { error } = await supabase
    .from('station_price_votes')
    .insert({
      station_id: stationId,
      fuel_type: fuelType,
      vote,
      voter_email: voterEmail.toLowerCase().trim(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
