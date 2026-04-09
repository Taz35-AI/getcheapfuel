import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

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
  prices: {
    E10?: number | null;
    E5?: number | null;
    B7?: number | null;
    SDV?: number | null;
  };
}

interface CMAFeed {
  stations: CMAStation[];
}

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
  const failed: string[] = [];

  // Fetch all feeds in parallel with generous timeout
  const results = await Promise.allSettled(
    Object.entries(CMA_FEEDS).map(async ([brandKey, url]) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: CMAFeed = await response.json();
      return { brandKey, data };
    })
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      failed.push('unknown');
      continue;
    }

    const { brandKey, data } = result.value;
    const rows: {
      station_id: string;
      brand: string;
      fuel_type: string;
      price: number;
      snapshot_date: string;
    }[] = [];

    for (const station of data.stations || []) {
      const stationId = `${brandKey}-${station.site_id}`;
      for (const fuel of FUEL_TYPES) {
        const price = station.prices?.[fuel];
        if (price != null && price > 0) {
          rows.push({
            station_id: stationId,
            brand: station.brand || brandKey,
            fuel_type: fuel,
            price,
            snapshot_date: today,
          });
        }
      }
    }

    if (rows.length > 0) {
      // Upsert in batches of 1000 to avoid payload limits
      for (let i = 0; i < rows.length; i += 1000) {
        const batch = rows.slice(i, i + 1000);
        const { error } = await supabase
          .from('price_history')
          .upsert(batch, { onConflict: 'station_id,fuel_type,snapshot_date' });

        if (error) {
          console.error(`Failed to insert ${brandKey} batch:`, error.message);
          failed.push(brandKey);
          break;
        } else {
          totalInserted += batch.length;
        }
      }
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
    feeds: Object.keys(CMA_FEEDS).length,
    failed,
  });
}
