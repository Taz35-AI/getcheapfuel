import { NextResponse } from 'next/server';
import type { FuelStation } from '@/lib/types';

// CMA Open Data - 13 major UK fuel retailers publish JSON feeds
// No auth needed, publicly accessible
const CMA_FEEDS: Record<string, string> = {
  asda: 'https://storelocator.asda.com/fuel_prices_data.json',
  bp: 'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json',
  shell: 'https://www.shell.co.uk/fuel-prices-data.html',
  esso: 'https://fuelprices.esso.co.uk/latestdata.json',
  tesco: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json',
  morrisons: 'https://www.morrisons.com/fuel-prices/fuel_prices_data.json',
  sainsburys: 'https://www.sainsburys.co.uk/fuel-prices/fuel_prices_data.json',
  jet: 'https://jetlocal.co.uk/fuel_prices_data.json',
  murco: 'https://www.maboropetroleum.co.uk/fuel-prices/fuel_prices_data.json',
  sgn: 'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json',
  rontec: 'https://www.rontec-servicestations.co.uk/fuel-prices/fuel_prices_data.json',
  mfg: 'https://fuel.motorfuelgroup.com/fuel_prices_data.json',
  ascona: 'https://fuelprices.asconagroup.co.uk/newfuel_prices_data.json',
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

async function fetchCMAFeed(brand: string, url: string): Promise<FuelStation[]> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data: CMAFeed = await response.json();
    return (data.stations || [])
      .filter(s => s.location?.latitude && s.location?.longitude)
      .map(station => ({
        id: `${brand}-${station.site_id}`,
        brand: station.brand || brand,
        name: station.brand || brand,
        address: station.address,
        postcode: station.postcode,
        latitude: station.location.latitude,
        longitude: station.location.longitude,
        prices: {
          E10: station.prices?.E10 ?? null,
          E5: station.prices?.E5 ?? null,
          B7: station.prices?.B7 ?? null,
          SDV: station.prices?.SDV ?? null,
        },
        lastUpdated: data.last_updated,
        source: 'cma' as const,
      }));
  } catch {
    console.error(`Failed to fetch ${brand} fuel data`);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '54.5');
  const lng = parseFloat(searchParams.get('lng') || '-2');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km

  // Fetch all CMA feeds in parallel
  const feedPromises = Object.entries(CMA_FEEDS).map(([brand, url]) =>
    fetchCMAFeed(brand, url)
  );
  const results = await Promise.allSettled(feedPromises);
  const allStations: FuelStation[] = results
    .filter((r): r is PromiseFulfilledResult<FuelStation[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Filter by radius from the given coordinates
  const filtered = allStations.filter(station => {
    const dist = haversineDistance(lat, lng, station.latitude, station.longitude);
    return dist <= radius;
  });

  // Sort by distance
  filtered.sort((a, b) => {
    const distA = haversineDistance(lat, lng, a.latitude, a.longitude);
    const distB = haversineDistance(lat, lng, b.latitude, b.longitude);
    return distA - distB;
  });

  return NextResponse.json({
    stations: filtered,
    total: filtered.length,
    center: { lat, lng },
    radius,
  });
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
