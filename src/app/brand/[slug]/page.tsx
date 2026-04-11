import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchAllStations } from '@/lib/fuel-data';
import { BRAND_SLUGS, findBrandBySlug } from '@/lib/brand-slugs';
import { toTitleCase } from '@/lib/format-text';
import BrandLogo from '@/components/BrandLogo';

export const revalidate = 86400;

export async function generateStaticParams() {
  return BRAND_SLUGS.map(b => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = findBrandBySlug(slug);
  if (!brand) return {};

  const title = `${brand.name} Petrol Prices Today | ${brand.name} Fuel Prices UK | GetCheapFuel`;
  const description = `Live ${brand.name} petrol and diesel prices across the UK, updated daily. See the cheapest ${brand.name} forecourts today, average ${brand.name} prices, and how ${brand.name} compares to other retailers.`;

  return {
    title,
    description,
    alternates: { canonical: `https://getcheapfuel.co.uk/brand/${brand.slug}` },
    openGraph: {
      title,
      description,
      url: `https://getcheapfuel.co.uk/brand/${brand.slug}`,
      type: 'article',
    },
  };
}

function fmtPence(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'n/a';
  return `${n.toFixed(1)}p`;
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = findBrandBySlug(slug);
  if (!brand) notFound();

  const allStations = await fetchAllStations(86400);
  const brandStations = allStations.filter(s => s.brand === brand.name);

  if (brandStations.length === 0) {
    notFound();
  }

  // National average for comparison
  const allE10 = allStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const allB7 = allStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const nationalE10 = allE10.reduce((a, b) => a + b, 0) / (allE10.length || 1);
  const nationalB7 = allB7.reduce((a, b) => a + b, 0) / (allB7.length || 1);

  // Brand stats
  const brandE10 = brandStations.filter(s => s.prices.E10 != null).map(s => s.prices.E10!);
  const brandE5 = brandStations.filter(s => s.prices.E5 != null).map(s => s.prices.E5!);
  const brandB7 = brandStations.filter(s => s.prices.B7 != null).map(s => s.prices.B7!);
  const brandSDV = brandStations.filter(s => s.prices.SDV != null).map(s => s.prices.SDV!);

  const avgE10 = brandE10.length > 0 ? brandE10.reduce((a, b) => a + b, 0) / brandE10.length : null;
  const avgE5 = brandE5.length > 0 ? brandE5.reduce((a, b) => a + b, 0) / brandE5.length : null;
  const avgB7 = brandB7.length > 0 ? brandB7.reduce((a, b) => a + b, 0) / brandB7.length : null;
  const avgSDV = brandSDV.length > 0 ? brandSDV.reduce((a, b) => a + b, 0) / brandSDV.length : null;

  // Top cheapest unleaded and diesel from this brand
  const cheapestE10 = [...brandStations]
    .filter(s => s.prices.E10 != null)
    .sort((a, b) => (a.prices.E10 ?? 999) - (b.prices.E10 ?? 999))
    .slice(0, 10);
  const cheapestB7 = [...brandStations]
    .filter(s => s.prices.B7 != null)
    .sort((a, b) => (a.prices.B7 ?? 999) - (b.prices.B7 ?? 999))
    .slice(0, 10);

  // vs national average delta
  const e10Delta = avgE10 != null ? avgE10 - nationalE10 : 0;
  const b7Delta = avgB7 != null ? avgB7 - nationalB7 : 0;

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
      name: `${brand.name} Petrol Prices Today`,
      description: `Live ${brand.name} fuel prices across the UK, updated daily.`,
      url: `https://getcheapfuel.co.uk/brand/${brand.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How much is ${brand.name} petrol today?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: avgE10 != null
              ? `${brand.name} unleaded petrol costs an average of ${avgE10.toFixed(1)} pence per litre today across ${brandE10.length} UK forecourts.`
              : `No ${brand.name} petrol price data available today.`,
          },
        },
        {
          '@type': 'Question',
          name: `How much is ${brand.name} diesel today?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: avgB7 != null
              ? `${brand.name} diesel costs an average of ${avgB7.toFixed(1)} pence per litre today across ${brandB7.length} UK forecourts.`
              : `No ${brand.name} diesel price data available today.`,
          },
        },
        {
          '@type': 'Question',
          name: `Is ${brand.name} cheaper than other petrol stations?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: e10Delta < 0
              ? `Yes. On average, ${brand.name} sells unleaded for ${Math.abs(e10Delta).toFixed(1)} pence per litre less than the UK national average.`
              : e10Delta > 0
              ? `${brand.name} sells unleaded for ${e10Delta.toFixed(1)} pence per litre more than the UK national average, so you will typically find cheaper options at supermarket forecourts.`
              : `${brand.name} prices its unleaded in line with the UK national average.`,
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
          <Link href="/fuel-index" className="text-green-700 hover:text-green-900 hover:underline">Fuel Index</Link>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">{brand.name}</span>
        </nav>

        {/* Header with logo */}
        <header className="mb-10 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <BrandLogo brand={brand.name} size={72} />
            <div>
              <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-1">
                Daily report · {todayLong}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {brand.name} Petrol Prices Today
              </h1>
            </div>
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            Live {brand.name} fuel prices across {brandStations.length.toLocaleString()} UK forecourts,
            updated daily directly from the UK Government. See today&apos;s cheapest {brand.name}
            stations and how {brand.name} compares to other retailers.
          </p>
        </header>

        {/* National average cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">
            Average {brand.name} fuel prices today
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
                  Based on {brandE10.length.toLocaleString()} {brand.name} forecourts.
                  {e10Delta < -0.05 && <span className="text-green-700 font-semibold"> {Math.abs(e10Delta).toFixed(1)}p below UK average.</span>}
                  {e10Delta > 0.05 && <span className="text-red-600 font-semibold"> {e10Delta.toFixed(1)}p above UK average.</span>}
                </div>
              </div>
            )}
            {avgE5 != null && (
              <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Premium Unleaded (E5)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">{avgE5.toFixed(1)}</span>
                  <span className="text-base text-gray-500">p / litre</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Based on {brandE5.length.toLocaleString()} {brand.name} forecourts.
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
                  Based on {brandB7.length.toLocaleString()} {brand.name} forecourts.
                  {b7Delta < -0.05 && <span className="text-green-700 font-semibold"> {Math.abs(b7Delta).toFixed(1)}p below UK average.</span>}
                  {b7Delta > 0.05 && <span className="text-red-600 font-semibold"> {b7Delta.toFixed(1)}p above UK average.</span>}
                </div>
              </div>
            )}
            {avgSDV != null && (
              <div className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Super Diesel</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">{avgSDV.toFixed(1)}</span>
                  <span className="text-base text-gray-500">p / litre</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Based on {brandSDV.length.toLocaleString()} {brand.name} forecourts.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About the brand */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About {brand.name}</h2>
          <p className="text-gray-700 leading-relaxed">{brand.description}</p>
        </section>

        {/* Cheapest unleaded stations */}
        {cheapestE10.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cheapest {brand.name} petrol in the UK today
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              The 10 cheapest {brand.name} forecourts for standard unleaded (E10) across the UK.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Postcode</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Unleaded</th>
                  </tr>
                </thead>
                <tbody>
                  {cheapestE10.map((s, i) => (
                    <tr key={s.id} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{toTitleCase(s.address).slice(0, 55)}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.postcode}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{fmtPence(s.prices.E10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Cheapest diesel stations */}
        {cheapestB7.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cheapest {brand.name} diesel in the UK today
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              The 10 cheapest {brand.name} forecourts for standard diesel (B7) across the UK.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Postcode</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Diesel</th>
                  </tr>
                </thead>
                <tbody>
                  {cheapestB7.map((s, i) => (
                    <tr key={s.id} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{toTitleCase(s.address).slice(0, 55)}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.postcode}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{fmtPence(s.prices.B7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">How much is {brand.name} petrol today?</summary>
              <p className="text-gray-600 text-sm mt-2">
                {avgE10 != null
                  ? `${brand.name} unleaded petrol costs an average of ${avgE10.toFixed(1)} pence per litre today across ${brandE10.length} UK forecourts. The cheapest ${brand.name} forecourt for unleaded is priced at ${cheapestE10[0] ? fmtPence(cheapestE10[0].prices.E10) : 'n/a'}.`
                  : `No ${brand.name} petrol price data is available today.`}
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">How much is {brand.name} diesel today?</summary>
              <p className="text-gray-600 text-sm mt-2">
                {avgB7 != null
                  ? `${brand.name} diesel costs an average of ${avgB7.toFixed(1)} pence per litre today across ${brandB7.length} UK forecourts. The cheapest ${brand.name} forecourt for diesel is priced at ${cheapestB7[0] ? fmtPence(cheapestB7[0].prices.B7) : 'n/a'}.`
                  : `No ${brand.name} diesel price data is available today.`}
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">Is {brand.name} cheaper than other petrol stations?</summary>
              <p className="text-gray-600 text-sm mt-2">
                {e10Delta < -0.05
                  ? `Yes. On average, ${brand.name} sells unleaded for ${Math.abs(e10Delta).toFixed(1)} pence per litre less than the UK national average of ${nationalE10.toFixed(1)} pence.`
                  : e10Delta > 0.05
                  ? `${brand.name} sells unleaded for ${e10Delta.toFixed(1)} pence per litre more than the UK national average of ${nationalE10.toFixed(1)} pence. Supermarket forecourts like Tesco, Asda, Sainsbury\u2019s and Morrisons typically sell fuel for less.`
                  : `${brand.name} prices its unleaded in line with the UK national average of ${nationalE10.toFixed(1)} pence per litre.`}
              </p>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">How often are {brand.name} prices updated?</summary>
              <p className="text-gray-600 text-sm mt-2">
                All {brand.name} prices on this page come directly from the UK Government and are refreshed daily.
                UK retailers are required to publish price changes within 30 minutes of updating them at the pump.
              </p>
            </details>
          </div>
        </section>

        {/* Other brands */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Compare other fuel retailers</h2>
          <div className="flex flex-wrap gap-2">
            {BRAND_SLUGS.filter(b => b.slug !== brand.slug).map(b => (
              <Link
                key={b.slug}
                href={`/brand/${b.slug}`}
                className="text-sm text-green-700 hover:text-green-900 hover:underline px-3 py-1.5 bg-green-50 rounded-lg"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
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
