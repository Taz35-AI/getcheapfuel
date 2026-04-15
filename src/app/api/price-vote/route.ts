import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_FUELS = ['E10', 'E5', 'B7', 'SDV'] as const;
const VALID_VOTES = ['up', 'down'] as const;

function isValidFuel(f: string): f is (typeof VALID_FUELS)[number] {
  return (VALID_FUELS as readonly string[]).includes(f);
}
function isValidVote(v: string): v is (typeof VALID_VOTES)[number] {
  return (VALID_VOTES as readonly string[]).includes(v);
}

// GET /api/price-vote?stationId=X&fuelType=Y
// Returns up/down counts for the last 24 hours only so the warning
// threshold resets naturally once a day.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');
  const fuelType = searchParams.get('fuelType');

  if (!stationId || !fuelType || !isValidFuel(fuelType)) {
    return NextResponse.json({ error: 'stationId and valid fuelType required' }, { status: 400 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('station_price_votes')
    .select('vote')
    .eq('station_id', stationId)
    .eq('fuel_type', fuelType)
    .gte('voted_at', since);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const up = (data || []).filter((r) => r.vote === 'up').length;
  const down = (data || []).filter((r) => r.vote === 'down').length;

  return NextResponse.json({ stationId, fuelType, up, down });
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
