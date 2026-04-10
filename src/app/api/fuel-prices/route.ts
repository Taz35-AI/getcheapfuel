import { NextResponse } from 'next/server';
import { fetchAllStations, getStationsNear } from '@/lib/fuel-data';

async function probeFuelFinder() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { stage: 'env', error: 'missing credentials' };
  }
  try {
    const res = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch {}
    return {
      stage: 'token-request',
      httpStatus: res.status,
      httpStatusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyRaw: text.slice(0, 1000),
      bodyParsed: parsed,
    };
  } catch (err) {
    return {
      stage: 'token-request',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      cause: err instanceof Error && 'cause' in err ? String((err as { cause?: unknown }).cause) : undefined,
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '54.5');
  const lng = parseFloat(searchParams.get('lng') || '-2');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km
  const debug = searchParams.get('debug') === '1';
  const probe = searchParams.get('probe') === '1';

  if (probe) {
    const probeResult = await probeFuelFinder();
    return NextResponse.json({ probe: probeResult });
  }

  const allStations = await fetchAllStations(300);
  const filtered = getStationsNear(allStations, lat, lng, radius);

  if (debug) {
    const ffAll = allStations.filter(s => s.source === 'fuelfinder');
    const cmaAll = allStations.filter(s => s.source === 'cma');
    return NextResponse.json({
      diagnostics: {
        envCheck: {
          fuelFinderClientIdPresent: !!process.env.FUEL_FINDER_CLIENT_ID,
          fuelFinderClientIdLength: process.env.FUEL_FINDER_CLIENT_ID?.length ?? 0,
          fuelFinderClientSecretPresent: !!process.env.FUEL_FINDER_CLIENT_SECRET,
          fuelFinderClientSecretLength: process.env.FUEL_FINDER_CLIENT_SECRET?.length ?? 0,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
        },
        totalStationsLoaded: allStations.length,
        fuelFinderCount: ffAll.length,
        cmaCount: cmaAll.length,
        filteredInRadius: filtered.length,
      },
      stations: filtered,
      total: filtered.length,
      center: { lat, lng },
      radius,
    });
  }

  return NextResponse.json({
    stations: filtered,
    total: filtered.length,
    center: { lat, lng },
    radius,
  });
}
