import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UK_CITIES } from '@/lib/cities';
import { fetchAllStations, getStationsNear, haversineDistance } from '@/lib/fuel-data';
import { BRAND_SLUGS } from '@/lib/brand-slugs';
import { toTitleCase } from '@/lib/format-text';
import { isFreshFuelPrice } from '@/lib/freshness';

// Rebuild 3 times a day (every 8 hours)
export const revalidate = 28800;

export async function generateStaticParams() {
  return UK_CITIES.map(city => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = UK_CITIES.find(c => c.slug === slug);
  if (!city) return {};

  const title = `Cheap Petrol & Diesel in ${city.name} - Live Fuel Prices | GetCheapFuel`;
  const description = `Compare petrol, diesel and EV charging prices near ${city.name}. Find the cheapest fuel stations in ${city.name} and ${city.region}. Real-time prices updated daily from ${city.name} area stations.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://getcheapfuel.co.uk/cheap-fuel/${city.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://getcheapfuel.co.uk/cheap-fuel/${city.slug}`,
    },
  };
}

type FuelKey = 'E10' | 'E5' | 'B7' | 'SDV';

const FUEL_LABELS: Record<FuelKey, string> = {
  E10: 'Unleaded (E10)',
  E5: 'Premium (E5)',
  B7: 'Diesel (B7)',
  SDV: 'Super Diesel',
};

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = UK_CITIES.find(c => c.slug === slug);
  if (!city) notFound();

  // Fetch real fuel data (cached, revalidates every 8 hours)
  const allStations = await fetchAllStations(28800);
  const radiusKm = 16; // ~10 miles
  const nearbyStations = getStationsNear(allStations, city.lat, city.lng, radiusKm);

  // Calculate price stats (7-day fresh data only for reports)
  interface TopRow {
    brand: string;
    price: number;
    address: string;
    dist: string;
  }
  interface FuelStat {
    fuel: FuelKey;
    label: string;
    cheapestPrice: number;
    cheapestBrand: string;
    cheapestDist: string;
    avgPrice: string;
    highestPrice: number;
    stationCount: number;
    top5: TopRow[];
  }

  const fuelKeys: FuelKey[] = ['E10', 'E5', 'B7', 'SDV'];
  const stats: FuelStat[] = fuelKeys.map((fuel): FuelStat | null => {
    const withPrice = nearbyStations
      .filter(s => s.prices[fuel] != null && isFreshFuelPrice(s, fuel, 7))
      .sort((a, b) => (a.prices[fuel] ?? 999) - (b.prices[fuel] ?? 999));
    if (withPrice.length === 0) return null;

    const prices = withPrice.map(s => s.prices[fuel]!);
    const cheapest = withPrice[0];
    const cheapestDist = haversineDistance(city.lat, city.lng, cheapest.latitude, cheapest.longitude) * 0.6214;

    return {
      fuel,
      label: FUEL_LABELS[fuel],
      cheapestPrice: prices[0],
      cheapestBrand: cheapest.brand,
      cheapestDist: cheapestDist.toFixed(1),
      avgPrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
      highestPrice: prices[prices.length - 1],
      stationCount: withPrice.length,
      top5: withPrice.slice(0, 5).map(s => ({
        brand: s.brand,
        price: s.prices[fuel]!,
        address: s.postcode || s.address,
        dist: (haversineDistance(city.lat, city.lng, s.latitude, s.longitude) * 0.6214).toFixed(1),
      })),
    };
  }).filter((s): s is FuelStat => s !== null);

  const nearbyCities = UK_CITIES.filter(c => c.slug !== city.slug)
    .map(c => ({
      ...c,
      dist: Math.sqrt(
        Math.pow(c.lat - city.lat, 2) + Math.pow(c.lng - city.lng, 2)
      ),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);

  // Brand breakdown for this city — average unleaded by retailer
  const brandStatsMap = new Map<string, { count: number; e10Sum: number; e10Count: number; b7Sum: number; b7Count: number }>();
  for (const s of nearbyStations) {
    if (!brandStatsMap.has(s.brand)) {
      brandStatsMap.set(s.brand, { count: 0, e10Sum: 0, e10Count: 0, b7Sum: 0, b7Count: 0 });
    }
    const entry = brandStatsMap.get(s.brand)!;
    entry.count++;
    if (s.prices.E10 != null && isFreshFuelPrice(s, 'E10', 7)) { entry.e10Sum += s.prices.E10; entry.e10Count++; }
    if (s.prices.B7 != null && isFreshFuelPrice(s, 'B7', 7)) { entry.b7Sum += s.prices.B7; entry.b7Count++; }
  }
  const cityBrands = Array.from(brandStatsMap.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([brand, v]) => ({
      brand,
      count: v.count,
      avgE10: v.e10Count > 0 ? v.e10Sum / v.e10Count : null,
      avgB7: v.b7Count > 0 ? v.b7Sum / v.b7Count : null,
      slug: BRAND_SLUGS.find(b => b.name === brand)?.slug,
    }))
    .sort((a, b) => (a.avgE10 ?? 999) - (b.avgE10 ?? 999))
    .slice(0, 10);

  const today = new Date();
  const todayLong = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  const e10Stat = stats.find(s => s.fuel === 'E10');
  const b7Stat = stats.find(s => s.fuel === 'B7');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Cheap Fuel in ${city.name}`,
      description: `Compare petrol, diesel and EV charging prices near ${city.name}. Real-time data from fuel stations in ${city.name} and ${city.region}.`,
      url: `https://getcheapfuel.co.uk/cheap-fuel/${city.slug}`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'GetCheapFuel',
        url: 'https://getcheapfuel.co.uk',
      },
      about: {
        '@type': 'City',
        name: city.name,
        containedInPlace: { '@type': 'Country', name: 'United Kingdom' },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `Where is the cheapest petrol in ${city.name} today?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: e10Stat
              ? `The cheapest unleaded petrol in ${city.name} today is ${e10Stat.cheapestPrice.toFixed(1)} pence per litre at ${e10Stat.cheapestBrand}, ${e10Stat.cheapestDist} miles away. The average price across ${e10Stat.stationCount} forecourts is ${e10Stat.avgPrice} pence.`
              : `Petrol price data is not available for ${city.name} today.`,
          },
        },
        {
          '@type': 'Question',
          name: `Where is the cheapest diesel in ${city.name} today?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: b7Stat
              ? `The cheapest diesel in ${city.name} today is ${b7Stat.cheapestPrice.toFixed(1)} pence per litre at ${b7Stat.cheapestBrand}. The average diesel price across ${b7Stat.stationCount} forecourts in the ${city.name} area is ${b7Stat.avgPrice} pence.`
              : `Diesel price data is not available for ${city.name} today.`,
          },
        },
        {
          '@type': 'Question',
          name: `How many petrol stations are there in ${city.name}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `GetCheapFuel tracks ${nearbyStations.length} fuel stations within 10 miles of ${city.name}, including major retailers like Tesco, BP, Shell, Esso, Sainsbury's, Morrisons, Asda and Texaco.`,
          },
        },
        {
          '@type': 'Question',
          name: `How often are ${city.name} fuel prices updated?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `All ${city.name} fuel prices on GetCheapFuel come directly from the UK Government and are refreshed daily. UK retailers are required to publish any pump price changes within 30 minutes.`,
          },
        },
      ],
    },
  ];

  return (
    <main className="h-screen overflow-y-auto bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-6"
        >
          &larr; Back to GetCheapFuel
        </Link>

        <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-2">
          Daily report · {todayLong}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Cheap Petrol &amp; Diesel in {city.name}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Live fuel prices for {nearbyStations.length} petrol stations within 10 miles of {city.name},
          {' '}{city.region}. See today&apos;s cheapest unleaded and diesel, updated daily from the UK
          Government.
        </p>

        {/* Today's cheapest callout */}
        {(e10Stat || b7Stat) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {e10Stat && (
              <div className="border border-green-200 bg-green-50/40 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-green-700 font-semibold mb-1">
                  Cheapest petrol in {city.name} today
                </div>
                <div className="text-2xl font-bold text-green-700 tabular-nums">
                  {e10Stat.cheapestPrice.toFixed(1)}p
                </div>
                <div className="text-sm text-gray-700">
                  at <strong>{e10Stat.cheapestBrand}</strong>
                  <span className="text-gray-400"> · {e10Stat.cheapestDist} mi away</span>
                </div>
              </div>
            )}
            {b7Stat && (
              <div className="border border-green-200 bg-green-50/40 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-green-700 font-semibold mb-1">
                  Cheapest diesel in {city.name} today
                </div>
                <div className="text-2xl font-bold text-green-700 tabular-nums">
                  {b7Stat.cheapestPrice.toFixed(1)}p
                </div>
                <div className="text-sm text-gray-700">
                  at <strong>{b7Stat.cheapestBrand}</strong>
                  <span className="text-gray-400"> · {b7Stat.cheapestDist} mi away</span>
                </div>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/?lat=${city.lat}&lng=${city.lng}&zoom=12&name=${encodeURIComponent(city.name)}`}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg mb-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          View {city.name} Fuel Prices Map
        </Link>

        {/* Live price summary cards */}
        {stats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Fuel Prices in {city.name} Today
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {stats.map(s => (
                <div key={s.fuel} className="border border-gray-200 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">{s.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">{s.cheapestPrice.toFixed(1)}p</span>
                    <span className="text-sm text-gray-400">cheapest</span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    at <span className="font-semibold">{s.cheapestBrand}</span>
                    <span className="text-gray-400"> &middot; {s.cheapestDist} mi away</span>
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>Avg: <span className="font-semibold text-gray-700">{s.avgPrice}p</span></span>
                    <span>Highest: <span className="font-semibold text-gray-700">{s.highestPrice.toFixed(1)}p</span></span>
                    <span>{s.stationCount} stations</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 5 cheapest stations tables */}
        {stats.filter(s => s.top5.length > 0).map(s => (
          <section key={s.fuel} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Cheapest {s.label} in {city.name}
            </h3>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Station</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Postcode</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {s.top5.map((station, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{station.brand}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{station.address}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{station.price.toFixed(1)}p</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">{station.dist} mi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* Brand breakdown table for this city */}
        {cityBrands.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Fuel retailers in {city.name} ranked cheapest
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Average unleaded and diesel prices by retailer in the {city.name} area today,
              ranked from cheapest to most expensive.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Brand</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Stations</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Unleaded</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Diesel</th>
                  </tr>
                </thead>
                <tbody>
                  {cityBrands.map((b, i) => (
                    <tr key={b.brand} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {b.slug ? (
                          <Link href={`/brand/${b.slug}`} className="hover:text-green-700 hover:underline">
                            {b.brand}
                          </Link>
                        ) : (
                          b.brand
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{b.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        {b.avgE10 != null ? `${b.avgE10.toFixed(1)}p` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        {b.avgB7 != null ? `${b.avgB7.toFixed(1)}p` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How to Find Cheap Fuel in {city.name}
          </h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center">1</span>
              <span>Click the button above or search for &quot;{city.name}&quot; on the map</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center">2</span>
              <span>Select your fuel type — Unleaded (E10), Premium (E5), Diesel (B7), or Super Diesel</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center">3</span>
              <span>Compare prices across nearby stations sorted by distance or price</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center">4</span>
              <span>Tap a station for directions via Google Maps or Waze</span>
            </li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            About Fuel Prices in {city.name}
          </h2>
          <div className="prose prose-gray max-w-none text-gray-700 space-y-3">
            <p>
              GetCheapFuel shows real-time petrol and diesel prices from major fuel stations
              in {city.name}, including Asda, Tesco, Sainsbury&apos;s, Morrisons, BP, Shell,
              Esso, and Jet. Prices are updated daily directly from each retailer.
            </p>
            <p>
              With a population of {city.population} people, {city.name} has {nearbyStations.length} fuel
              stations within 10 miles competing on price. Use our map to find the cheapest option near you and
              save money on every fill-up.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {city.name} Fuel Prices FAQ
          </h2>
          <div className="space-y-3">
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                Where is the cheapest petrol in {city.name} today?
              </summary>
              <p className="text-gray-600 text-sm mt-2">
                {e10Stat
                  ? `The cheapest unleaded petrol in ${city.name} today is ${e10Stat.cheapestPrice.toFixed(1)} pence per litre at ${e10Stat.cheapestBrand}, ${e10Stat.cheapestDist} miles away. The average unleaded price across ${e10Stat.stationCount} forecourts in the area is ${e10Stat.avgPrice} pence.`
                  : `Petrol price data is not available for ${city.name} today.`}
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                Where is the cheapest diesel in {city.name} today?
              </summary>
              <p className="text-gray-600 text-sm mt-2">
                {b7Stat
                  ? `The cheapest diesel in ${city.name} today is ${b7Stat.cheapestPrice.toFixed(1)} pence per litre at ${b7Stat.cheapestBrand}. The average diesel price across ${b7Stat.stationCount} forecourts in the ${city.name} area is ${b7Stat.avgPrice} pence.`
                  : `Diesel price data is not available for ${city.name} today.`}
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                How many petrol stations are there in {city.name}?
              </summary>
              <p className="text-gray-600 text-sm mt-2">
                GetCheapFuel tracks {nearbyStations.length} fuel stations within 10 miles of {city.name},
                including major retailers like Tesco, BP, Shell, Esso, Sainsbury&apos;s, Morrisons,
                Asda and Texaco.
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                How often are {city.name} fuel prices updated?
              </summary>
              <p className="text-gray-600 text-sm mt-2">
                All {city.name} fuel prices on GetCheapFuel come directly from the UK Government
                and are refreshed daily. UK retailers are required to publish any pump price
                changes within 30 minutes.
              </p>
            </details>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            EV Charging in {city.name}
          </h2>
          <p className="text-gray-700 mb-3">
            Looking for EV charging stations in {city.name}? GetCheapFuel also shows electric
            vehicle chargers across the {city.region} area, including connector types, power
            output (7kW to 150kW+), and availability. Data is sourced from Open Charge Map.
          </p>
          <Link
            href={`/?lat=${city.lat}&lng=${city.lng}&zoom=12&name=${encodeURIComponent(city.name)}`}
            className="text-green-600 hover:text-green-700 font-medium hover:underline"
          >
            Find EV chargers in {city.name} &rarr;
          </Link>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Fuel Prices Near {city.name}
          </h2>
          <p className="text-gray-700 mb-4">
            Also compare fuel prices in nearby cities:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {nearbyCities.map(c => (
              <Link
                key={c.slug}
                href={`/cheap-fuel/${c.slug}`}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About GetCheapFuel</h2>
          <p className="text-sm text-gray-600">
            GetCheapFuel is a free fuel price comparison tool for the UK. We show real-time
            petrol, diesel, and EV charging prices from 8,200+ stations across the country.
            Prices come directly from the retailers — the same prices you see at
            the pump. No sign-up needed.
          </p>
        </section>

        <footer className="border-t border-gray-200 pt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} GetCheapFuel</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms of Service</Link>
          <a href="mailto:contact@getcheapfuel.co.uk" className="hover:text-gray-700 hover:underline">Contact</a>
        </footer>
      </div>
    </main>
  );
}
