import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchAllStations } from '@/lib/fuel-data';
import {
  computeNationalSummary,
  computeRegionalBreakdown,
  computeBrandRankings,
  computeInsights,
  FUEL_LABEL,
  type FuelKey,
} from '@/lib/fuel-index-stats';
import { toTitleCase } from '@/lib/format-text';
import { formatUKDateTime } from '@/lib/format-date';

// Rebuild once a day
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'UK Fuel Price Index | Live Petrol & Diesel Data | GetCheapFuel',
  description:
    'The UK Fuel Price Index from GetCheapFuel. Live national and regional averages for petrol and diesel, brand league tables and price spread analysis. Data from 7,500+ UK stations, updated daily.',
  alternates: { canonical: 'https://getcheapfuel.co.uk/fuel-index' },
  openGraph: {
    title: 'UK Fuel Price Index | Live Data from 7,500+ Stations',
    description:
      'Daily fuel price analysis covering every region of the UK. National averages, brand rankings, regional breakdowns, and the cheapest pumps in the country.',
    url: 'https://getcheapfuel.co.uk/fuel-index',
    type: 'article',
  },
};

function fmtPence(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'n/a';
  return `${n.toFixed(1)}p`;
}

function fmtDelta(n: number | null | undefined): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (n == null || isNaN(n) || Math.abs(n) < 0.05) return { text: 'in line with average', tone: 'flat' };
  if (n > 0) return { text: `${n.toFixed(1)}p above average`, tone: 'up' };
  return { text: `${Math.abs(n).toFixed(1)}p below average`, tone: 'down' };
}

export default async function FuelIndexPage() {
  const stations = await fetchAllStations(86400);
  const fuelKeys: FuelKey[] = ['E10', 'E5', 'B7', 'SDV'];

  const summaries = fuelKeys.map(f => computeNationalSummary(stations, f));
  const e10Summary = summaries[0];
  const e5Summary = summaries[1];
  const b7Summary = summaries[2];
  const sdvSummary = summaries[3];

  const regions = computeRegionalBreakdown(stations);
  const brands = computeBrandRankings(stations).slice(0, 12);
  const insights = computeInsights(stations, regions);

  const today = new Date();
  const todayLong = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  // 50 litre tank saving from a representative cheap vs average example
  const tankSavingVsAverage = 50 * ((e10Summary.average - e10Summary.cheapest) / 100);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'UK Fuel Price Index',
    description:
      'Daily aggregated dataset of UK petrol and diesel prices, sourced from the UK Government Fuel Finder API and the published price feeds of 13 major UK retailers. Includes national averages, regional breakdowns, brand league tables and individual station prices.',
    url: 'https://getcheapfuel.co.uk/fuel-index',
    keywords: [
      'UK fuel prices',
      'petrol price index',
      'diesel price index',
      'fuel price comparison',
      'CMA fuel data',
    ],
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: {
      '@type': 'Organization',
      name: 'GetCheapFuel',
      url: 'https://getcheapfuel.co.uk',
    },
    spatialCoverage: {
      '@type': 'Place',
      name: 'United Kingdom',
    },
    temporalCoverage: today.toISOString().split('T')[0],
    distribution: {
      '@type': 'DataDownload',
      contentUrl: 'https://getcheapfuel.co.uk/fuel-index',
      encodingFormat: 'text/html',
    },
    variableMeasured: [
      'Average petrol price (E10)',
      'Average premium unleaded price (E5)',
      'Average diesel price (B7)',
      'Average super diesel price (SDV)',
      'Regional fuel price averages',
      'Retailer brand price averages',
    ],
  };

  return (
    <main className="h-screen overflow-y-auto bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-green-700 hover:text-green-900 hover:underline">
            GetCheapFuel
          </Link>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600">UK Fuel Price Index</span>
        </nav>

        {/* Header */}
        <header className="mb-12 pb-8 border-b border-gray-200">
          <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-3">
            Daily Report · {todayLong}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            UK Fuel Price Index
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A daily analysis of petrol and diesel prices across the United Kingdom, drawing on
            live data from {insights.coverageStations.toLocaleString()} forecourts and{' '}
            {insights.coverageBrands} retailers. All prices come directly from the UK Government
            and are refreshed regularly throughout the day.
          </p>
        </header>

        {/* National snapshot cards */}
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">National averages today</h2>
            <span className="text-xs text-gray-500">All prices in pence per litre</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summaries.filter(s => s.stationCount > 0).map(s => (
              <div key={s.fuel} className="border border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  {s.label}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-bold text-gray-900 tabular-nums">{s.average.toFixed(1)}</span>
                  <span className="text-base text-gray-500">p / litre average</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Cheapest</div>
                    <div className="font-semibold text-green-700 tabular-nums">{fmtPence(s.cheapest)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Median</div>
                    <div className="font-semibold text-gray-700 tabular-nums">{fmtPence(s.median)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Highest</div>
                    <div className="font-semibold text-red-600 tabular-nums">{fmtPence(s.mostExpensive)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Sampled across {s.stationCount.toLocaleString()} stations. Spread of {fmtPence(s.spread)} between
                  cheapest and most expensive.
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Headline insights */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">What the data shows today</h2>
          <div className="space-y-4 text-base text-gray-700 leading-relaxed">
            <p>
              The cheapest litre of unleaded petrol in the UK today is{' '}
              <strong className="text-gray-900">{fmtPence(e10Summary.cheapest)}</strong>, found at{' '}
              <strong className="text-gray-900">
                {e10Summary.cheapestStation && toTitleCase(e10Summary.cheapestStation.brand)}
              </strong>{' '}
              ({e10Summary.cheapestStation?.postcode}). That is{' '}
              <strong className="text-green-700">{(e10Summary.average - e10Summary.cheapest).toFixed(1)}p</strong>{' '}
              below the national average. Drivers filling a 50 litre tank at the cheapest
              forecourt save approximately{' '}
              <strong className="text-green-700">£{tankSavingVsAverage.toFixed(2)}</strong>{' '}
              compared with the average price.
            </p>
            <p>
              Diesel costs an average of{' '}
              <strong className="text-gray-900">{fmtPence(b7Summary.average)}</strong> per litre,{' '}
              <strong className="text-gray-900">{insights.petrolDieselGap.toFixed(1)}p</strong>{' '}
              more than unleaded. The premium-unleaded grade (E5) sits{' '}
              <strong className="text-gray-900">{insights.premiumPetrolPremium.toFixed(1)}p</strong>{' '}
              above standard unleaded. Super diesel commands an additional{' '}
              <strong className="text-gray-900">{insights.superDieselPremium.toFixed(1)}p</strong>{' '}
              premium over the standard B7 grade.
            </p>
            <p>
              Supermarket forecourts continue to undercut branded sites. Tesco, Asda,
              Sainsbury&apos;s and Morrisons sell unleaded for an average of{' '}
              <strong className="text-green-700">{insights.supermarketDiscount.toFixed(1)}p</strong>{' '}
              less per litre than independent and branded competitors such as Shell, BP, Esso
              and Texaco. Across the {insights.supermarketCount.toLocaleString()} supermarket
              forecourts in the dataset, the discount holds in every region.
            </p>
            <p>
              On a regional basis, the cheapest place to fill up is{' '}
              <strong className="text-gray-900">{insights.cheapestRegionName}</strong>, with an
              average of <strong className="text-green-700">{fmtPence(insights.cheapestRegionPrice)}</strong>{' '}
              for unleaded. The most expensive is{' '}
              <strong className="text-gray-900">{insights.mostExpensiveRegionName}</strong>, where
              drivers pay an average of{' '}
              <strong className="text-red-600">{fmtPence(insights.mostExpensiveRegionPrice)}</strong>.
              The gap between the cheapest and most expensive region is{' '}
              <strong className="text-gray-900">{insights.regionalRange.toFixed(1)}p</strong> per litre.
            </p>
          </div>
        </section>

        {/* Regional breakdown */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Regional breakdown</h2>
          <p className="text-sm text-gray-600 mb-5">
            Average prices for each UK region, ranked from cheapest to most expensive for
            standard unleaded. Coverage varies by region depending on the number of
            forecourts in the area.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Region</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Stations</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Unleaded</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Diesel</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">vs UK avg</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r, i) => {
                  const delta = fmtDelta(r.e10VsNational);
                  const tone =
                    delta.tone === 'down' ? 'text-green-700' :
                    delta.tone === 'up' ? 'text-red-600' :
                    'text-gray-500';
                  return (
                    <tr key={r.region} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.region}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{r.stationCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtPence(r.e10)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtPence(r.b7)}</td>
                      <td className={`px-4 py-3 text-right text-xs hidden sm:table-cell ${tone}`}>{delta.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Brand league table */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Brand league table</h2>
          <p className="text-sm text-gray-600 mb-5">
            Average unleaded and diesel prices by retailer, ranked from cheapest to most
            expensive. Only brands with at least 15 forecourts are listed to ensure a
            representative sample.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Brand</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Stations</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Unleaded</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Diesel</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b, i) => (
                  <tr key={b.brand} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.brand}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                      {b.isSupermarket ? 'Supermarket' : 'Branded / Independent'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{b.stationCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtPence(b.e10Avg)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtPence(b.b7Avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cheapest stations */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Today&apos;s extremes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {e10Summary.cheapestStation && (
              <div className="border border-green-200 bg-green-50/40 rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-green-700 font-semibold mb-2">
                  Cheapest unleaded in the UK
                </div>
                <div className="text-3xl font-bold text-green-700 tabular-nums mb-1">{fmtPence(e10Summary.cheapest)}</div>
                <div className="text-sm font-semibold text-gray-900">{toTitleCase(e10Summary.cheapestStation.brand)}</div>
                <div className="text-xs text-gray-600 mt-1">{toTitleCase(e10Summary.cheapestStation.address)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e10Summary.cheapestStation.postcode}</div>
              </div>
            )}
            {e10Summary.mostExpensiveStation && (
              <div className="border border-red-200 bg-red-50/40 rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-red-700 font-semibold mb-2">
                  Most expensive unleaded in the UK
                </div>
                <div className="text-3xl font-bold text-red-600 tabular-nums mb-1">{fmtPence(e10Summary.mostExpensive)}</div>
                <div className="text-sm font-semibold text-gray-900">{toTitleCase(e10Summary.mostExpensiveStation.brand)}</div>
                <div className="text-xs text-gray-600 mt-1">{toTitleCase(e10Summary.mostExpensiveStation.address)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e10Summary.mostExpensiveStation.postcode}</div>
              </div>
            )}
            {b7Summary.cheapestStation && (
              <div className="border border-green-200 bg-green-50/40 rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-green-700 font-semibold mb-2">
                  Cheapest diesel in the UK
                </div>
                <div className="text-3xl font-bold text-green-700 tabular-nums mb-1">{fmtPence(b7Summary.cheapest)}</div>
                <div className="text-sm font-semibold text-gray-900">{toTitleCase(b7Summary.cheapestStation.brand)}</div>
                <div className="text-xs text-gray-600 mt-1">{toTitleCase(b7Summary.cheapestStation.address)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{b7Summary.cheapestStation.postcode}</div>
              </div>
            )}
            {b7Summary.mostExpensiveStation && (
              <div className="border border-red-200 bg-red-50/40 rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-red-700 font-semibold mb-2">
                  Most expensive diesel in the UK
                </div>
                <div className="text-3xl font-bold text-red-600 tabular-nums mb-1">{fmtPence(b7Summary.mostExpensive)}</div>
                <div className="text-sm font-semibold text-gray-900">{toTitleCase(b7Summary.mostExpensiveStation.brand)}</div>
                <div className="text-xs text-gray-600 mt-1">{toTitleCase(b7Summary.mostExpensiveStation.address)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{b7Summary.mostExpensiveStation.postcode}</div>
              </div>
            )}
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Methodology</h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong className="text-gray-900">Data source.</strong> All forecourt prices are
              sourced live from the UK Government, which collects them directly from retailers
              within 30 minutes of any change at the pump. The data is open and updated
              continuously throughout the day.
            </p>
            <p>
              <strong className="text-gray-900">Coverage.</strong> {insights.coverageStations.toLocaleString()}{' '}
              forecourts across England, Scotland, Wales and Northern Ireland, representing{' '}
              {insights.coverageBrands} distinct retailer brands. Stations that are temporarily
              or permanently closed are excluded.
            </p>
            <p>
              <strong className="text-gray-900">Quality checks.</strong> Prices outside the
              normal range of 100 to 350 pence per litre are filtered out as data entry errors
              or placeholder values. Stations missing valid coordinates or with no published
              price for any fuel type are excluded from the relevant calculations.
            </p>
            <p>
              <strong className="text-gray-900">Refresh cadence.</strong> The dataset is
              re-synced from the official feed daily, and this report is rebuilt from the
              latest snapshot every morning.
            </p>
          </div>
        </section>

        {/* Citation block */}
        <section className="mb-14 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
          <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
            How to cite this report
          </div>
          <p className="text-sm text-gray-700 font-mono leading-relaxed">
            GetCheapFuel ({today.getFullYear()}). UK Fuel Price Index: {todayLong}. Retrieved
            from https://getcheapfuel.co.uk/fuel-index
          </p>
          <div className="mt-3 text-xs text-gray-500">
            Last refreshed: {formatUKDateTime(today.toISOString())}
          </div>
        </section>

        {/* Footer links */}
        <footer className="pt-8 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link href="/" className="text-green-700 hover:text-green-900 hover:underline font-semibold">
              ← Back to fuel finder map
            </Link>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <Link href="/cheap-fuel/london" className="hover:text-gray-700 hover:underline">London</Link>
              <Link href="/cheap-fuel/manchester" className="hover:text-gray-700 hover:underline">Manchester</Link>
              <Link href="/cheap-fuel/birmingham" className="hover:text-gray-700 hover:underline">Birmingham</Link>
              <Link href="/cheap-fuel/glasgow" className="hover:text-gray-700 hover:underline">Glasgow</Link>
              <Link href="/cheap-fuel/edinburgh" className="hover:text-gray-700 hover:underline">Edinburgh</Link>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}
