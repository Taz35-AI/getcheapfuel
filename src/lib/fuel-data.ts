import type { FuelStation } from './types';

export const CMA_FEEDS: Record<string, string> = {
  asda: 'https://storelocator.asda.com/fuel_prices_data.json',
  bp: 'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json',
  shell: 'https://www.shell.co.uk/fuel-prices-data.html',
  esso: 'https://fuelprices.esso.co.uk/latestdata.json',
  tesco: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json',
  morrisons: 'https://www.morrisons.com/fuel-prices/fuel.json',
  sainsburys: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json',
  jet: 'https://jetlocal.co.uk/fuel_prices_data.json',
  sgn: 'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json',
  rontec: 'https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json',
  mfg: 'https://fuel.motorfuelgroup.com/fuel_prices_data.json',
  ascona: 'https://fuelprices.asconagroup.co.uk/newfuel.json',
  moto: 'https://moto-way.com/fuel-price/fuel_prices.json',
  karan: 'https://devapi.krlpos.com/integration/live_price/krl',
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

// Reject prices outside a sane range (100p–350p) to filter out
// data entry errors, placeholders (e.g. 999.9), and pound/pence mixups
function sanitisePrice(price: number | null | undefined): number | null {
  if (price == null) return null;
  if (price >= 100 && price <= 350) return price;
  return null;
}
function normaliseBrand(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('sainsbury')) return "Sainsbury's";
  if (lower.includes('tesco')) return 'Tesco';
  if (lower.includes('asda')) return 'Asda';
  if (lower.includes('morrisons')) return 'Morrisons';
  if (lower.includes('shell')) return 'Shell';
  if (lower.includes('bp')) return 'BP';
  if (lower.includes('esso')) return 'Esso';
  return raw;
}
export async function fetchCMAFeed(brand: string, url: string, revalidate = 300): Promise<FuelStation[]> {
  try {
    const response = await fetch(url, {
  next: { revalidate: brand === 'sainsburys' ? 3600 : revalidate },
  signal: AbortSignal.timeout(8000),
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GetCheapFuel/1.0)',
    'Accept': 'application/json',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Referer': 'https://www.sainsburys.co.uk/',
  },
});
    if (!response.ok) return [];
    const data: CMAFeed = await response.json();
    return (data.stations || [])
      .filter(s => s.location?.latitude && s.location?.longitude)
      .map(station => ({
        id: `${brand}-${station.site_id}`,
        brand: normaliseBrand(station.brand || brand),
        name: normaliseBrand(station.brand || brand),
        address: station.address,
        postcode: station.postcode,
        latitude: station.location.latitude,
        longitude: station.location.longitude,
        prices: {
          E10: sanitisePrice(station.prices?.E10),
          E5: sanitisePrice(station.prices?.E5),
          B7: sanitisePrice(station.prices?.B7),
          SDV: sanitisePrice(station.prices?.SDV),
        },
        lastUpdated: data.last_updated,
        source: 'cma' as const,
      }));
  } catch {
    console.error(`Failed to fetch ${brand} fuel data`);
    return [];
  }
}

export async function fetchAllStations(revalidate = 300): Promise<FuelStation[]> {
  const feedPromises = Object.entries(CMA_FEEDS).map(([brand, url]) =>
    fetchCMAFeed(brand, url, revalidate)
  );
  const results = await Promise.allSettled(feedPromises);
  return results
    .filter((r): r is PromiseFulfilledResult<FuelStation[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function getStationsNear(allStations: FuelStation[], lat: number, lng: number, radiusKm: number): FuelStation[] {
  return allStations
    .filter(s => haversineDistance(lat, lng, s.latitude, s.longitude) <= radiusKm)
    .sort((a, b) =>
      haversineDistance(lat, lng, a.latitude, a.longitude) -
      haversineDistance(lat, lng, b.latitude, b.longitude)
    );
}
