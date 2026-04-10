import type { FuelStation } from './types';

export type FuelKey = 'E10' | 'E5' | 'B7' | 'SDV';

export const FUEL_LABEL: Record<FuelKey, string> = {
  E10: 'Unleaded (E10)',
  E5: 'Premium Unleaded (E5)',
  B7: 'Diesel (B7)',
  SDV: 'Super Diesel',
};

// UK regional bounding boxes. The order matters because some boxes overlap.
// London is checked first to avoid being absorbed by South East.
export const UK_REGIONS = [
  { name: 'Greater London',           latMin: 51.28, latMax: 51.72, lngMin: -0.55, lngMax: 0.36 },
  { name: 'South East',               latMin: 50.70, latMax: 51.95, lngMin: -1.85, lngMax: 1.50 },
  { name: 'South West',               latMin: 49.90, latMax: 51.85, lngMin: -6.50, lngMax: -1.85 },
  { name: 'Wales',                    latMin: 51.38, latMax: 53.45, lngMin: -5.60, lngMax: -2.65 },
  { name: 'West Midlands',            latMin: 52.00, latMax: 53.00, lngMin: -2.65, lngMax: -1.05 },
  { name: 'East Midlands',            latMin: 52.30, latMax: 53.55, lngMin: -1.65, lngMax: 0.50 },
  { name: 'East of England',          latMin: 51.85, latMax: 53.00, lngMin: -0.70, lngMax: 1.85 },
  { name: 'Yorkshire and the Humber', latMin: 53.00, latMax: 54.55, lngMin: -2.65, lngMax: 0.50 },
  { name: 'North West',               latMin: 53.00, latMax: 55.05, lngMin: -3.65, lngMax: -1.85 },
  { name: 'North East',               latMin: 54.55, latMax: 55.85, lngMin: -2.65, lngMax: -1.00 },
  { name: 'Scotland',                 latMin: 54.60, latMax: 60.90, lngMin: -8.70, lngMax: -0.65 },
  { name: 'Northern Ireland',         latMin: 54.00, latMax: 55.40, lngMin: -8.50, lngMax: -5.30 },
] as const;

export function regionForStation(s: FuelStation): string {
  for (const r of UK_REGIONS) {
    if (
      s.latitude >= r.latMin && s.latitude <= r.latMax &&
      s.longitude >= r.lngMin && s.longitude <= r.lngMax
    ) {
      return r.name;
    }
  }
  return 'Other';
}

const SUPERMARKET_BRANDS = new Set(['tesco', "sainsbury's", 'asda', 'morrisons', 'co-op', 'costco']);

export function isSupermarket(brand: string): boolean {
  return SUPERMARKET_BRANDS.has(brand.toLowerCase().trim());
}

function avg(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface NationalSummary {
  fuel: FuelKey;
  label: string;
  stationCount: number;
  average: number;
  median: number;
  cheapest: number;
  mostExpensive: number;
  spread: number;
  cheapestStation: { brand: string; postcode: string; address: string } | null;
  mostExpensiveStation: { brand: string; postcode: string; address: string } | null;
}

export function computeNationalSummary(stations: FuelStation[], fuel: FuelKey): NationalSummary {
  const withPrice = stations.filter(s => s.prices[fuel] != null) as Array<FuelStation & { prices: Record<FuelKey, number> }>;
  if (withPrice.length === 0) {
    return {
      fuel,
      label: FUEL_LABEL[fuel],
      stationCount: 0,
      average: 0,
      median: 0,
      cheapest: 0,
      mostExpensive: 0,
      spread: 0,
      cheapestStation: null,
      mostExpensiveStation: null,
    };
  }
  const prices = withPrice.map(s => s.prices[fuel]);
  const sorted = [...withPrice].sort((a, b) => a.prices[fuel] - b.prices[fuel]);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return {
    fuel,
    label: FUEL_LABEL[fuel],
    stationCount: withPrice.length,
    average: avg(prices),
    median: median(prices),
    cheapest: min.prices[fuel],
    mostExpensive: max.prices[fuel],
    spread: max.prices[fuel] - min.prices[fuel],
    cheapestStation: { brand: min.brand, postcode: min.postcode, address: min.address },
    mostExpensiveStation: { brand: max.brand, postcode: max.postcode, address: max.address },
  };
}

export interface RegionStats {
  region: string;
  stationCount: number;
  e10: number | null;
  b7: number | null;
  e10VsNational: number | null;
  b7VsNational: number | null;
}

export function computeRegionalBreakdown(stations: FuelStation[]): RegionStats[] {
  const groups = new Map<string, FuelStation[]>();
  for (const s of stations) {
    const r = regionForStation(s);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(s);
  }

  const allE10 = stations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const allB7 = stations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const nationalE10 = avg(allE10);
  const nationalB7 = avg(allB7);

  const rows: RegionStats[] = [];
  for (const [region, regionStations] of groups.entries()) {
    if (region === 'Other') continue;
    const e10Prices = regionStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
    const b7Prices = regionStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
    const e10Avg = e10Prices.length > 0 ? avg(e10Prices) : null;
    const b7Avg = b7Prices.length > 0 ? avg(b7Prices) : null;
    rows.push({
      region,
      stationCount: regionStations.length,
      e10: e10Avg,
      b7: b7Avg,
      e10VsNational: e10Avg != null ? e10Avg - nationalE10 : null,
      b7VsNational: b7Avg != null ? b7Avg - nationalB7 : null,
    });
  }
  // Sort by E10 average ascending (cheapest first)
  rows.sort((a, b) => (a.e10 ?? 999) - (b.e10 ?? 999));
  return rows;
}

export interface BrandStats {
  brand: string;
  stationCount: number;
  e10Avg: number | null;
  b7Avg: number | null;
  isSupermarket: boolean;
}

export function computeBrandRankings(stations: FuelStation[], minStations = 5): BrandStats[] {
  const groups = new Map<string, FuelStation[]>();
  for (const s of stations) {
    const key = s.brand;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const rows: BrandStats[] = [];
  for (const [brand, brandStations] of groups.entries()) {
    if (brandStations.length < minStations) continue;
    const e10 = brandStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
    const b7 = brandStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
    rows.push({
      brand,
      stationCount: brandStations.length,
      e10Avg: e10.length > 0 ? avg(e10) : null,
      b7Avg: b7.length > 0 ? avg(b7) : null,
      isSupermarket: isSupermarket(brand),
    });
  }
  rows.sort((a, b) => (a.e10Avg ?? 999) - (b.e10Avg ?? 999));
  return rows;
}

export interface InsightSet {
  petrolDieselGap: number;
  premiumPetrolPremium: number; // E5 - E10
  superDieselPremium: number;   // SDV - B7
  supermarketDiscount: number;  // (branded avg - supermarket avg) for E10
  supermarketCount: number;
  brandedCount: number;
  cheapestRegionName: string;
  cheapestRegionPrice: number;
  mostExpensiveRegionName: string;
  mostExpensiveRegionPrice: number;
  regionalRange: number;
  totalSavingPerTank: number; // 50L * (mostExpensive - cheapest national) / 100
  coverageStations: number;
  coverageBrands: number;
}

export function computeInsights(stations: FuelStation[], regions: RegionStats[]): InsightSet {
  const e10 = stations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const e5 = stations.filter(s => s.prices.E5 != null).map(s => s.prices.E5!);
  const b7 = stations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const sdv = stations.filter(s => s.prices.SDV != null).map(s => s.prices.SDV!);

  const supermarketE10 = stations
    .filter(s => isSupermarket(s.brand) && s.prices.E10 != null)
    .map(s => s.prices.E10!);
  const brandedE10 = stations
    .filter(s => !isSupermarket(s.brand) && s.prices.E10 != null)
    .map(s => s.prices.E10!);

  const validRegions = regions.filter(r => r.e10 != null);
  const cheapestRegion = validRegions[0];
  const mostExpensiveRegion = validRegions[validRegions.length - 1];

  const uniqueBrands = new Set(stations.map(s => s.brand));

  return {
    petrolDieselGap: avg(b7) - avg(e10),
    premiumPetrolPremium: avg(e5) - avg(e10),
    superDieselPremium: avg(sdv) - avg(b7),
    supermarketDiscount: avg(brandedE10) - avg(supermarketE10),
    supermarketCount: supermarketE10.length,
    brandedCount: brandedE10.length,
    cheapestRegionName: cheapestRegion?.region ?? '',
    cheapestRegionPrice: cheapestRegion?.e10 ?? 0,
    mostExpensiveRegionName: mostExpensiveRegion?.region ?? '',
    mostExpensiveRegionPrice: mostExpensiveRegion?.e10 ?? 0,
    regionalRange: (mostExpensiveRegion?.e10 ?? 0) - (cheapestRegion?.e10 ?? 0),
    totalSavingPerTank: 50 * ((Math.max(...e10) - Math.min(...e10)) / 100),
    coverageStations: stations.length,
    coverageBrands: uniqueBrands.size,
  };
}
