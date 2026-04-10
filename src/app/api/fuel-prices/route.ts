import { NextResponse } from 'next/server';
import { fetchAllStations, getStationsNear } from '@/lib/fuel-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '54.5');
  const lng = parseFloat(searchParams.get('lng') || '-2');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km

  // Pass the bounding box to the data layer so Supabase only returns
  // stations near the user instead of the full 7,640-row dataset.
  const allStations = await fetchAllStations(300, { lat, lng, radiusKm: radius });
  const filtered = getStationsNear(allStations, lat, lng, radius);

  return NextResponse.json(
    {
      stations: filtered,
      total: filtered.length,
      center: { lat, lng },
      radius,
    },
    {
      headers: {
        // Cache at Vercel's edge for 5 minutes, serve stale up to 1 hour
        // while refreshing in the background. Users in the same area get
        // sub-100ms responses from the CDN.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    }
  );
}
