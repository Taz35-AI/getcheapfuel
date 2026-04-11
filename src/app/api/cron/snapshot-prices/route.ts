import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { fetchAllStations } from '@/lib/fuel-data';

// Full snapshot of ~11,000 stations + writing them to Supabase can easily
// exceed the default 10s function timeout.
export const maxDuration = 300;

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

  // Fetch the full dataset (not bbox-filtered) so we snapshot every station
  // in Supabase, not just the ones within a 100km radius of a handful of regions.
  // Calling fetchAllStations() directly bypasses the 2000-row bbox limit that
  // /api/fuel-prices applies per query.
  const allStations = await fetchAllStations(86400);

  const seen = new Set<string>();
  const allRows: {
    station_id: string;
    brand: string;
    fuel_type: string;
    price: number;
    snapshot_date: string;
  }[] = [];

  for (const station of allStations) {
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
    stationFuelCombinations: seen.size,
    stationsScanned: allStations.length,
  });
}
