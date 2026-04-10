import { NextResponse } from 'next/server';
import { fetchAllStations, getStationsNear } from '@/lib/fuel-data';

// First-call cold start fetches all 7,640 Fuel Finder stations + prices
// (~30s). Bump from default 10s to 60s so it doesn't time out.
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '54.5');
  const lng = parseFloat(searchParams.get('lng') || '-2');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km

  const allStations = await fetchAllStations(300);
  const filtered = getStationsNear(allStations, lat, lng, radius);

  return NextResponse.json({
    stations: filtered,
    total: filtered.length,
    center: { lat, lng },
    radius,
  });
}
