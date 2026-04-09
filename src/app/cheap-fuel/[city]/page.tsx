import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UK_CITIES } from '@/lib/cities';

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

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = UK_CITIES.find(c => c.slug === slug);
  if (!city) notFound();

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
          Compare live fuel prices from stations across {city.name} and the {city.region} area.
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

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Fuel Prices in {city.name} Today
          </h2>
          <div className="prose prose-gray max-w-none text-gray-700 space-y-3">
            <p>
              GetCheapFuel shows real-time petrol and diesel prices from major fuel stations
              in {city.name}, including Asda, Tesco, Sainsbury&apos;s, Morrisons, BP, Shell,
              Esso, and Jet. Prices are sourced directly from the UK Competition and Markets
              Authority (CMA) open data feeds, updated daily by each retailer.
            </p>
            <p>
              With a population of {city.population} people, {city.name} has dozens of fuel
              stations competing on price. Use our map to find the cheapest option near you and
              save money on every fill-up.
            </p>
          </div>
        </section>

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
            Our data comes directly from the CMA open data feeds — the same prices you see at
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
