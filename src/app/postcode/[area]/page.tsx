import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchAllStations } from '@/lib/fuel-data';
import { UNIQUE_POSTCODE_AREAS, findPostcodeArea, postcodeMatchesArea } from '@/lib/uk-postcodes';
import { toTitleCase } from '@/lib/format-text';
import BrandLogo from '@/components/BrandLogo';

export const revalidate = 86400;

export async function generateStaticParams() {
  return UNIQUE_POSTCODE_AREAS.map(p => ({ area: p.area.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const pc = findPostcodeArea(area);
  if (!pc) return {};

  const title = `Cheap Diesel & Petrol Near ${pc.name} (${pc.area} postcodes) | GetCheapFuel`;
  const description = `Live fuel prices for all petrol stations in the ${pc.area} postcode area covering ${pc.name}. See today's cheapest unleaded and diesel near you, updated daily from official UK Government data.`;

  return {
    title,
    description,
    alternates: { canonical: `https://getcheapfuel.co.uk/postcode/${pc.area.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `https://getcheapfuel.co.uk/postcode/${pc.area.toLowerCase()}`,
      type: 'article',
    },
  };
}

function fmtPence(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'n/a';
  return `${n.toFixed(1)}p`;
}

export default async function PostcodePage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const pc = findPostcodeArea(area);
  if (!pc) notFound();

  const allStations = await fetchAllStations(86400);
  const localStations = allStations.filter(s => postcodeMatchesArea(s.postcode, pc.area));

  if (localStations.length === 0) {
    notFound();
  }

  // Stats
  const e10 = localStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const b7 = localStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const avgE10 = e10.length > 0 ? e10.reduce((a, b) => a + b, 0) / e10.length : null;
  const avgB7 = b7.length > 0 ? b7.reduce((a, b) => a + b, 0) / b7.length : null;

  const cheapestE10 = [...localStations]
    .filter(s => s.prices.E10 != null)
    .sort((a, b) => (a.prices.E10 ?? 999) - (b.prices.E10 ?? 999))
    .slice(0, 10);
  const cheapestB7 = [...localStations]
    .filter(s => s.prices.B7 != null)
    .sort((a, b) => (a.prices.B7 ?? 999) - (b.prices.B7 ?? 999))
    .slice(0, 10);

  // National averages for comparison
  const allE10 = allStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const allB7 = allStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const nationalE10 = allE10.reduce((a, b) => a + b, 0) / (allE10.length || 1);
  const nationalB7 = allB7.reduce((a, b) => a + b, 0) / (allB7.length || 1);

  const today = new Date();
  const todayLong = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Cheap Fuel in ${pc.name} (${pc.area} postcodes)`,
      url: `https://getcheapfuel.co.uk/postcode/${pc.area.toLowerCase()}`,
      about: {
        '@type': 'Place',
        name: pc.name,
        containedInPlace: { '@type': 'Country', name: 'United Kingdom' },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How much is petrol near ${pc.name}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: avgE10 != null
              ? `Unleaded petrol in the ${pc.area} postcode area averages ${avgE10.toFixed(1)} pence per litre today, based on ${e10.length} forecourts.`
              : `No petrol price data available for ${pc.name} today.`,
          },
        },
        {
          '@type': 'Question',
          name: `Where is the cheapest diesel near ${pc.name}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: cheapestB7[0]
              ? `The cheapest diesel in the ${pc.area} postcode area today is ${fmtPence(cheapestB7[0].prices.B7)} at ${cheapestB7[0].brand}, postcode ${cheapestB7[0].postcode}.`
              : `No diesel price data available for ${pc.name} today.`,
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

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-green-700 hover:text-green-900 hover:underline">GetCheapFuel</Link>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">{pc.area} — {pc.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-gray-200">
          <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-2">
            Daily report · {todayLong}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
            Cheap Diesel &amp; Petrol Near {pc.name}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Live fuel prices for all {localStations.length} petrol stations in the{' '}
            <strong className="text-gray-900">{pc.area}</strong> postcode area, covering {pc.name}
            {' '}and surrounding {pc.region}. Updated daily from the UK Government.
          </p>
        </header>

        {/* Quick map link */}
        <Link
          href={`/?lat=${pc.lat}&lng=${pc.lng}&zoom=12&name=${encodeURIComponent(pc.name)}`}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg mb-10"
        >
          View {pc.name} on the map
        </Link>

        {/* Averages */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">
            Average fuel prices in {pc.area} today
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {avgE10 != null && (
              <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Unleaded (E10)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">{avgE10.toFixed(1)}</span>
                  <span className="text-base text-gray-500">p / litre</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  {avgE10 < nationalE10 - 0.05
                    ? <span className="text-green-700 font-semibold">{(nationalE10 - avgE10).toFixed(1)}p cheaper than the UK average.</span>
                    : avgE10 > nationalE10 + 0.05
                    ? <span className="text-red-600 font-semibold">{(avgE10 - nationalE10).toFixed(1)}p above the UK average.</span>
                    : 'In line with the UK national average.'}
                </div>
              </div>
            )}
            {avgB7 != null && (
              <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Diesel (B7)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">{avgB7.toFixed(1)}</span>
                  <span className="text-base text-gray-500">p / litre</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  {avgB7 < nationalB7 - 0.05
                    ? <span className="text-green-700 font-semibold">{(nationalB7 - avgB7).toFixed(1)}p cheaper than the UK average.</span>
                    : avgB7 > nationalB7 + 0.05
                    ? <span className="text-red-600 font-semibold">{(avgB7 - nationalB7).toFixed(1)}p above the UK average.</span>
                    : 'In line with the UK national average.'}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Cheapest unleaded */}
        {cheapestE10.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cheapest petrol in {pc.area} today
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              The 10 cheapest petrol stations for unleaded (E10) in the {pc.area} postcode area.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Postcode</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Unleaded</th>
                  </tr>
                </thead>
                <tbody>
                  {cheapestE10.map((s, i) => (
                    <tr key={s.id} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BrandLogo brand={s.brand} size={24} />
                          <span className="font-medium text-gray-900">{s.brand}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{s.postcode}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{fmtPence(s.prices.E10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Cheapest diesel */}
        {cheapestB7.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cheapest diesel in {pc.area} today
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              The 10 cheapest petrol stations for diesel (B7) in the {pc.area} postcode area.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Postcode</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Diesel</th>
                  </tr>
                </thead>
                <tbody>
                  {cheapestB7.map((s, i) => (
                    <tr key={s.id} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BrandLogo brand={s.brand} size={24} />
                          <span className="font-medium text-gray-900">{s.brand}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{s.postcode}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{fmtPence(s.prices.B7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* About */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About fuel prices in {pc.name}</h2>
          <div className="prose prose-gray max-w-none text-gray-700 space-y-3">
            <p>
              The {pc.area} postcode area covers {pc.name} in {pc.region}. GetCheapFuel tracks
              {' '}{localStations.length} fuel stations in this area, including major retailers like
              Tesco, BP, Shell, Esso, Sainsbury&apos;s, Morrisons, Asda and Texaco alongside
              independent forecourts.
            </p>
            <p>
              All prices on this page are pulled directly from the UK Government daily and
              reflect what drivers actually pay at the pump. To find the cheapest fuel near
              your exact location, use the interactive map and tap &quot;Use My Location&quot;.
            </p>
          </div>
        </section>

        {/* Other postcode areas */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Other UK postcode areas</h2>
          <div className="flex flex-wrap gap-2">
            {UNIQUE_POSTCODE_AREAS.filter(p => p.area !== pc.area).slice(0, 24).map(p => (
              <Link
                key={p.area}
                href={`/postcode/${p.area.toLowerCase()}`}
                className="text-xs text-green-700 hover:text-green-900 hover:underline px-3 py-1.5 bg-green-50 rounded-lg"
              >
                {p.area} · {p.name}
              </Link>
            ))}
          </div>
        </section>

        <footer className="pt-8 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <Link href="/" className="hover:text-gray-700 hover:underline">Back to map</Link>
          <Link href="/fuel-index" className="hover:text-gray-700 hover:underline">UK Fuel Price Index</Link>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms</Link>
        </footer>
      </article>
    </main>
  );
}
