import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { FuelStation } from '@/lib/types';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
const FUEL_TYPES = ['E10', 'E5', 'B7', 'SDV'] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const today = new Date().toISOString().split('T')[0];
  let totalInserted = 0;

  // Use the internal fuel-prices API which already handles all CMA feeds
  // with proper caching — avoids bot-blocking issues
  const baseUrl = new URL(request.url).origin;
  const regions = [
    { lat: 51.5, lng: -0.1, r: 100 },   // London & South East
    { lat: 52.5, lng: -1.9, r: 100 },   // Midlands
    { lat: 53.5, lng: -2.3, r: 100 },   // North West
    { lat: 53.8, lng: -1.5, r: 100 },   // Yorkshire
    { lat: 54.9, lng: -1.6, r: 100 },   // North East
    { lat: 55.9, lng: -3.2, r: 100 },   // Scotland Central
    { lat: 57.5, lng: -4.2, r: 150 },   // Scotland North
    { lat: 51.5, lng: -3.2, r: 100 },   // Wales
    { lat: 50.7, lng: -3.5, r: 100 },   // South West
    { lat: 52.6, lng: 1.3, r: 100 },    // East Anglia
  ];

  const seen = new Set<string>();
  const allRows: {
    station_id: string;
    brand: string;
    fuel_type: string;
    price: number;
    snapshot_date: string;
  }[] = [];

  // Fetch stations from multiple UK regions to cover the whole country
  const results = await Promise.allSettled(
    regions.map(async ({ lat, lng, r }) => {
      const res = await fetch(
        `${baseUrl}/api/fuel-prices?lat=${lat}&lng=${lng}&radius=${r}`,
        { signal: AbortSignal.timeout(60000) }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.stations || []) as FuelStation[];
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const station of result.value) {
      for (const fuel of FUEL_TYPES) {
        const price = station.prices[fuel];
        if (price != null && price > 0) {
          const key = `${station.id}-${fuel}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allRows.push({
            station_id: station.id,
            brand: station.brand,
            fuel_type: fuel,
            price,
            snapshot_date: today,
          });
        }
      }
    }
  }

  // Upsert in batches of 1000
  for (let i = 0; i < allRows.length; i += 1000) {
    const batch = allRows.slice(i, i + 1000);
    const { error } = await supabase
      .from('price_history')
      .upsert(batch, { onConflict: 'station_id,fuel_type,snapshot_date' });

    if (error) {
      console.error(`Failed to insert batch ${i}:`, error.message);
    } else {
      totalInserted += batch.length;
    }
  }

  // Clean up data older than 90 days
  await supabase
    .from('price_history')
    .delete()
    .lt('snapshot_date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);

  return NextResponse.json({
    success: true,
    date: today,
    inserted: totalInserted,
    uniqueStations: seen.size,
    regions: regions.length,
  });
}
