import { NextResponse } from 'next/server';

// OpenStreetMap Nominatim - free geocoding, no API key needed
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  // Append UK to bias results
  const searchQuery = query.match(/uk|united kingdom|england|scotland|wales/i)
    ? query
    : `${query}, United Kingdom`;

  try {
    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      limit: '5',
      countrycodes: 'gb',
    });

    const response = await fetch(`${NOMINATIM_API}?${params}`, {
      headers: {
        'User-Agent': 'GetCheapFuel/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();
    const results = data.map((item: { display_name: string; lat: string; lon: string }) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
