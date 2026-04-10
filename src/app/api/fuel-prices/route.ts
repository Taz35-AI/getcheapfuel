import { NextResponse } from 'next/server';
import { fetchAllStations, getStationsNear } from '@/lib/fuel-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '54.5');
  const lng = parseFloat(searchParams.get('lng') || '-2');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km
  const debug = searchParams.get('debug') === '1';

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
