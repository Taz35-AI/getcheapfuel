import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UK_CITIES } from '@/lib/cities';
import { fetchAllStations, getStationsNear, haversineDistance } from '@/lib/fuel-data';

// Rebuild 3 times a day (every 8 hours)
export const revalidate = 28800;

// First-call cold start fetches all 7,640 Fuel Finder stations + prices (~30s)
export const maxDuration = 60;

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

  // Calculate price stats
  interface FuelStat {
    fuel: FuelKey;
    label: string;
    cheapestPrice: number;
    cheapestBrand: string;
    cheapestDist: string;
    avgPrice: string;
    highestPrice: number;
    stationCount: number;
    top5: { brand: string; price: number; address: string; dist: string }[];
  }

  const fuelKeys: FuelKey[] = ['E10', 'E5', 'B7', 'SDV'];
  const stats: FuelStat[] = fuelKeys.map((fuel): FuelStat | null => {
    const withPrice = nearbyStations
      .filter(s => s.prices[fuel] != null)
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

  const jsonLd = {
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
      containedInPlace: {
        '@type': 'Country',
        name: 'United Kingdom',
      },
    },
  };

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

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Cheap Petrol & Diesel in {city.name}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Compare live fuel prices from {nearbyStations.length} stations within 10 miles of {city.name}.
          Find the cheapest petrol, diesel, and EV charging near you.
        </p>

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
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Postcode</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {s.top5.map((station, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{station.brand}</td>
                      <td className="px-4 py-2.5 text-gray-500">{station.address}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{station.price.toFixed(1)}p</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{station.dist} mi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

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
            petrol, diesel, and EV charging prices from 7,500+ stations across the country.
            Prices come directly from the retailers — the same prices you see at
            the pump. No sign-up needed.
          </p>
        </section>

        <footer className="border-t border-gray-200 pt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} GetCheapFuel</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms of Service</Link>
          <a href="mailto:support@getcheapfuel.co.uk" className="hover:text-gray-700 hover:underline">Contact</a>
        </footer>
      </div>
    </main>
  );
}
