import HomeApp from '@/components/HomeApp';
import Link from 'next/link';
import { fetchAllStations } from '@/lib/fuel-data';
import { BRAND_SLUGS } from '@/lib/brand-slugs';
import { isFreshFuelPrice } from '@/lib/freshness';

// Rebuild 3 times a day (every 8 hours) - same cadence as city pages
export const revalidate = 28800;

type FuelKey = 'E10' | 'E5' | 'B7' | 'SDV';

const FUEL_LABELS: Record<FuelKey, string> = {
  E10: 'Unleaded (E10)',
  E5: 'Premium (E5)',
  B7: 'Diesel (B7)',
  SDV: 'Super Diesel',
};

const cities = [
  'london', 'manchester', 'birmingham', 'leeds', 'glasgow',
  'liverpool', 'edinburgh', 'bristol', 'sheffield', 'newcastle',
  'nottingham', 'cardiff',
];

export default async function Home() {
  // Fetch all UK fuel stations (cached via ISR, revalidates every 8 hours)
  const allStations = await fetchAllStations(28800);

  // ── National price stats (7-day fresh data only) ─────────────────────
  const fuelKeys: FuelKey[] = ['E10', 'E5', 'B7', 'SDV'];
  const nationalStats = fuelKeys.map(fuel => {
    const withPrice = allStations
      .filter(s => s.prices[fuel] != null && isFreshFuelPrice(s, fuel, 7))
      .sort((a, b) => (a.prices[fuel] ?? 999) - (b.prices[fuel] ?? 999));
    if (withPrice.length === 0) return null;

    const prices = withPrice.map(s => s.prices[fuel]!);
    const cheapest = withPrice[0];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return {
      fuel,
      label: FUEL_LABELS[fuel],
      cheapestPrice: prices[0],
      cheapestBrand: cheapest.brand,
      cheapestPostcode: cheapest.postcode,
      avgPrice: avg.toFixed(1),
      highestPrice: prices[prices.length - 1],
      stationCount: withPrice.length,
      top5: withPrice.slice(0, 5).map(s => ({
        brand: s.brand,
        price: s.prices[fuel]!,
        postcode: s.postcode,
      })),
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  // ── Supermarket vs branded split ───────────────────────────────────────
  const SUPERMARKETS = new Set(['Tesco', "Sainsbury's", 'Asda', 'Morrisons', 'Co-op', 'Costco']);
  const freshE10 = allStations.filter(s => s.prices.E10 != null && isFreshFuelPrice(s, 'E10', 7));
  const freshB7 = allStations.filter(s => s.prices.B7 != null && isFreshFuelPrice(s, 'B7', 7));

  const superE10 = freshE10.filter(s => SUPERMARKETS.has(s.brand)).map(s => s.prices.E10!);
  const brandedE10 = freshE10.filter(s => !SUPERMARKETS.has(s.brand)).map(s => s.prices.E10!);
  const superB7 = freshB7.filter(s => SUPERMARKETS.has(s.brand)).map(s => s.prices.B7!);
  const brandedB7 = freshB7.filter(s => !SUPERMARKETS.has(s.brand)).map(s => s.prices.B7!);

  const avgArr = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const supermarketAvgE10 = avgArr(superE10);
  const brandedAvgE10 = avgArr(brandedE10);
  const supermarketAvgB7 = avgArr(superB7);
  const brandedAvgB7 = avgArr(brandedB7);

  const e10Saving = supermarketAvgE10 != null && brandedAvgE10 != null
    ? (brandedAvgE10 - supermarketAvgE10).toFixed(1) : null;
  const b7Saving = supermarketAvgB7 != null && brandedAvgB7 != null
    ? (brandedAvgB7 - supermarketAvgB7).toFixed(1) : null;

  // ── Brand league table (7-day fresh data only) ────────────────────────
  const brandMap = new Map<string, { count: number; e10Sum: number; e10Count: number; b7Sum: number; b7Count: number }>();
  for (const s of allStations) {
    if (!brandMap.has(s.brand)) {
      brandMap.set(s.brand, { count: 0, e10Sum: 0, e10Count: 0, b7Sum: 0, b7Count: 0 });
    }
    const entry = brandMap.get(s.brand)!;
    entry.count++;
    if (s.prices.E10 != null && isFreshFuelPrice(s, 'E10', 7)) { entry.e10Sum += s.prices.E10; entry.e10Count++; }
    if (s.prices.B7 != null && isFreshFuelPrice(s, 'B7', 7)) { entry.b7Sum += s.prices.B7; entry.b7Count++; }
  }
  const brandLeague = Array.from(brandMap.entries())
    .filter(([, v]) => v.count >= 10)
    .map(([brand, v]) => ({
      brand,
      count: v.count,
      avgE10: v.e10Count > 0 ? v.e10Sum / v.e10Count : null,
      avgB7: v.b7Count > 0 ? v.b7Sum / v.b7Count : null,
      slug: BRAND_SLUGS.find(b => b.name === brand)?.slug,
    }))
    .sort((a, b) => (a.avgE10 ?? 999) - (b.avgE10 ?? 999))
    .slice(0, 12);

  const today = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const e10Stat = nationalStats.find(s => s.fuel === 'E10');
  const b7Stat = nationalStats.find(s => s.fuel === 'B7');

  // ── Structured data ──────────────────────────────────────────────────
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'GetCheapFuel',
      url: 'https://getcheapfuel.co.uk',
      description:
        'Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes, track your fuel spending and find the best deals. Real data from 8,200+ stations.',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GBP',
      },
      featureList: [
        'Real-time petrol and diesel prices from major UK retailers',
        'EV charging station finder',
        'Fuel cost calculator',
        'Route planner',
        'Station comparison tool',
        'Price alerts',
        'Fuel spending tracker with email sync',
      ],
      author: {
        '@type': 'Organization',
        name: 'GetCheapFuel',
        url: 'https://getcheapfuel.co.uk',
        email: 'contact@getcheapfuel.co.uk',
      },
      areaServed: {
        '@type': 'Country',
        name: 'United Kingdom',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'GetCheapFuel',
      url: 'https://getcheapfuel.co.uk',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the average petrol price in the UK today?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: e10Stat
              ? `The average unleaded petrol (E10) price across ${e10Stat.stationCount} UK stations today is ${e10Stat.avgPrice} pence per litre. The cheapest is ${e10Stat.cheapestPrice.toFixed(1)}p at ${e10Stat.cheapestBrand}.`
              : 'Petrol price data is currently being updated.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the average diesel price in the UK today?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: b7Stat
              ? `The average diesel (B7) price across ${b7Stat.stationCount} UK stations today is ${b7Stat.avgPrice} pence per litre. The cheapest diesel is ${b7Stat.cheapestPrice.toFixed(1)}p at ${b7Stat.cheapestBrand}.`
              : 'Diesel price data is currently being updated.',
          },
        },
        {
          '@type': 'Question',
          name: 'How often are fuel prices updated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Fuel prices on GetCheapFuel are updated daily using official data from 8,200+ UK petrol stations including Tesco, Sainsbury\'s, Asda, Morrisons, Shell, BP, and Esso.',
          },
        },
        {
          '@type': 'Question',
          name: 'How many petrol stations does GetCheapFuel cover?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `GetCheapFuel covers ${allStations.length.toLocaleString()} fuel stations across the United Kingdom, plus thousands of EV charging points via the Open Charge Map network.`,
          },
        },
        {
          '@type': 'Question',
          name: 'Is GetCheapFuel free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, GetCheapFuel is completely free. You can compare fuel prices, plan routes, use the fuel calculator, track your spending, and set up price alerts at no cost.',
          },
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* The only H1 on the page - server-rendered, visible to Google immediately */}
      <h1 className="sr-only">
        GetCheapFuel - Compare Cheap Petrol, Diesel &amp; EV Charging Prices UK
      </h1>

      <HomeApp />

      {/* Server-rendered crawlable content for SEO - visible below the fold */}
      <section className="bg-white border-t border-gray-200 px-6 py-12 md:px-12 md:py-16 max-w-5xl mx-auto">

        {/* ── Live national fuel prices ─────────────────────────────────── */}
        <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-2">
          Daily report · {today}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          UK Fuel Prices Today
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Live national average fuel prices across the United Kingdom,
          updated daily from 8,200+ petrol stations.
        </p>

        {/* National average callout cards */}
        {(e10Stat || b7Stat) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {e10Stat && (
              <div className="border border-green-200 bg-green-50/40 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-green-700 font-semibold mb-1">
                  UK average petrol (E10) today
                </div>
                <div className="text-2xl font-bold text-green-700 tabular-nums">
                  {e10Stat.avgPrice}p
                  <span className="text-sm font-normal text-gray-400 ml-1">per litre</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Prices range from {e10Stat.cheapestPrice.toFixed(1)}p to {e10Stat.highestPrice.toFixed(1)}p across
                  the UK - a spread of {(e10Stat.highestPrice - e10Stat.cheapestPrice).toFixed(1)}p per litre.
                  {e10Saving && ` Supermarkets are on average ${e10Saving}p cheaper than branded forecourts.`}
                </div>
              </div>
            )}
            {b7Stat && (
              <div className="border border-green-200 bg-green-50/40 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-green-700 font-semibold mb-1">
                  UK average diesel (B7) today
                </div>
                <div className="text-2xl font-bold text-green-700 tabular-nums">
                  {b7Stat.avgPrice}p
                  <span className="text-sm font-normal text-gray-400 ml-1">per litre</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Diesel ranges from {b7Stat.cheapestPrice.toFixed(1)}p to {b7Stat.highestPrice.toFixed(1)}p across
                  the UK - a spread of {(b7Stat.highestPrice - b7Stat.cheapestPrice).toFixed(1)}p per litre.
                  {b7Saving && ` Supermarket diesel averages ${b7Saving}p less than branded stations.`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live price summary cards per fuel type */}
        {nationalStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {nationalStats.map(s => (
              <div key={s.fuel} className="border border-gray-200 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">{s.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-600">{s.avgPrice}p</span>
                  <span className="text-sm text-gray-400">UK average</span>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>Low: <span className="font-semibold text-gray-700">{s.cheapestPrice.toFixed(1)}p</span></span>
                  <span>High: <span className="font-semibold text-gray-700">{s.highestPrice.toFixed(1)}p</span></span>
                  <span>Spread: <span className="font-semibold text-gray-700">{(s.highestPrice - s.cheapestPrice).toFixed(1)}p</span></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top 5 cheapest unleaded in the UK */}
        {e10Stat && e10Stat.top5.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              5 Cheapest Petrol Stations in the UK Today
            </h3>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Station</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Postcode</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {e10Stat.top5.map((station, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{station.brand}</td>
                      <td className="px-4 py-2.5 text-gray-500">{station.postcode}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{station.price.toFixed(1)}p</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top 5 cheapest diesel in the UK */}
        {b7Stat && b7Stat.top5.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              5 Cheapest Diesel Stations in the UK Today
            </h3>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Station</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Postcode</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {b7Stat.top5.map((station, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{station.brand}</td>
                      <td className="px-4 py-2.5 text-gray-500">{station.postcode}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{station.price.toFixed(1)}p</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Brand league table ────────────────────────────────────────── */}
        {brandLeague.length > 0 && (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              UK Fuel Retailers Ranked Cheapest to Most Expensive
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Average unleaded and diesel prices by retailer across the UK today.
            </p>
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Retailer</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Stations</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Unleaded</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Diesel</th>
                  </tr>
                </thead>
                <tbody>
                  {brandLeague.map((b, i) => (
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
                        {b.avgE10 != null ? `${b.avgE10.toFixed(1)}p` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        {b.avgB7 != null ? `${b.avgB7.toFixed(1)}p` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── UK Fuel Price Index promo ─────────────────────────────────── */}
        <Link
          href="/fuel-index"
          className="block mb-12 p-6 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-green-700 font-semibold mb-2">
                Daily report
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5 group-hover:text-green-900">
                UK Fuel Price Index
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Live national and regional averages for petrol and diesel, brand league tables,
                cheapest pumps in the country and price spread analysis. Updated daily from
                {allStations.length.toLocaleString()}+ UK forecourts.
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-green-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </Link>

        {/* ── About & features ──────────────────────────────────────────── */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Compare Cheap Petrol, Diesel &amp; EV Charging Prices Across the UK
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          GetCheapFuel helps you find the cheapest fuel near you. We compare real-time petrol and diesel prices from over {allStations.length.toLocaleString()} stations
          across the UK, including Tesco, Sainsbury&apos;s, Asda, Morrisons, Shell, BP, Esso, and more. Whether you drive a petrol car,
          diesel van, or electric vehicle, GetCheapFuel shows you where to fill up for less.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Fuel Prices</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              See today&apos;s petrol and diesel prices updated daily from 8,200+ UK petrol stations.
              Compare unleaded (E10), premium (E5), diesel (B7), and super diesel prices side by side
              on an interactive map.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">EV Charging Finder</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Find electric vehicle charging stations near you with connector types, power ratings,
              and operator details. Filter by rapid, fast, or standard chargers to find what suits your EV.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fuel Cost Calculator</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Calculate exactly how much your journey will cost based on current fuel prices and your
              vehicle&apos;s fuel economy. Plan ahead and budget your travel costs accurately.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fuel Spending Tracker</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Log every fill-up and track your fuel spending over time. Sync your data with your email
              so you can access your fuel history from any device. See how much you spend on fuel each month.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Route Planner</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Plan your journey and find the cheapest fuel stops along your route. Save money on long
              trips by knowing where to fill up before you set off.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Price Alerts</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Set up notifications to get alerted when fuel prices drop in your area.
              Never miss a cheap fill-up again with personalised price alerts.
            </p>
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4 mb-12">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">What is the average petrol price in the UK today?</summary>
            <p className="text-gray-600 text-sm mt-2">
              {e10Stat
                ? `The average unleaded petrol (E10) price across ${e10Stat.stationCount.toLocaleString()} UK stations today is ${e10Stat.avgPrice} pence per litre. The cheapest petrol in the UK right now is ${e10Stat.cheapestPrice.toFixed(1)}p at ${e10Stat.cheapestBrand}.`
                : 'Petrol price data is currently being updated.'}
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">What is the average diesel price in the UK today?</summary>
            <p className="text-gray-600 text-sm mt-2">
              {b7Stat
                ? `The average diesel (B7) price across ${b7Stat.stationCount.toLocaleString()} UK stations today is ${b7Stat.avgPrice} pence per litre. The cheapest diesel in the UK right now is ${b7Stat.cheapestPrice.toFixed(1)}p at ${b7Stat.cheapestBrand}.`
                : 'Diesel price data is currently being updated.'}
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">How often are fuel prices updated?</summary>
            <p className="text-gray-600 text-sm mt-2">
              Fuel prices on GetCheapFuel are updated daily using official data from 8,200+ UK petrol stations
              including Tesco, Sainsbury&apos;s, Asda, Morrisons, Shell, BP, and Esso.
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">How many petrol stations does GetCheapFuel cover?</summary>
            <p className="text-gray-600 text-sm mt-2">
              GetCheapFuel covers {allStations.length.toLocaleString()} fuel stations across the United Kingdom, plus thousands of EV
              charging points via the Open Charge Map network.
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">Is GetCheapFuel free to use?</summary>
            <p className="text-gray-600 text-sm mt-2">
              Yes, GetCheapFuel is completely free. You can compare fuel prices, plan routes, use the fuel calculator,
              track your spending, and set up price alerts at no cost.
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">Can I track my fuel spending?</summary>
            <p className="text-gray-600 text-sm mt-2">
              Yes. Use the built-in Fuel Spending Tracker to log every fill-up with the station name, fuel type,
              litres, and cost. Enter your email to sync your data across devices and see your spending history,
              monthly totals, and average cost per litre over time.
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">Does GetCheapFuel show EV charging prices?</summary>
            <p className="text-gray-600 text-sm mt-2">
              GetCheapFuel shows EV charging station locations, connector types, and power ratings across the UK.
              Where available, usage costs from the charging operator are displayed. For stations without listed pricing,
              we recommend checking the operator&apos;s app for current rates.
            </p>
          </details>
        </div>

        {/* ── Latest from the blog ───────────────────────────────────────── */}
        <Link
          href="/blog/trump-strait-of-hormuz-blockade-uk-fuel-prices"
          className="block mb-10 p-6 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-red-700 font-semibold">Breaking</span>
                <span className="text-[10px] text-gray-400">13 April 2026</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5 group-hover:text-red-900">
                Trump&apos;s Strait of Hormuz Blockade: What It Means for UK Fuel Prices
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Oil pushes past $100 a barrel as the US Navy blockades Iranian ports. Here&apos;s how it could
                affect your fuel bill and what you can do about it.
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-red-600 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </Link>

        {/* ── Internal links ────────────────────────────────────────────── */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Find Cheap Fuel Near You</h3>
        <nav className="flex flex-wrap gap-2 mb-8">
          {cities.map(city => (
            <Link
              key={city}
              href={`/cheap-fuel/${city}`}
              className="text-sm text-green-700 hover:text-green-900 hover:underline capitalize px-3 py-1.5 bg-green-50 rounded-lg"
            >
              {city.replace('-', ' ')}
            </Link>
          ))}
        </nav>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Prices by Retailer</h3>
        <nav className="flex flex-wrap gap-2 mb-8">
          {[
            { slug: 'tesco', name: 'Tesco' },
            { slug: 'asda', name: 'Asda' },
            { slug: 'sainsburys', name: "Sainsbury's" },
            { slug: 'morrisons', name: 'Morrisons' },
            { slug: 'bp', name: 'BP' },
            { slug: 'shell', name: 'Shell' },
            { slug: 'esso', name: 'Esso' },
            { slug: 'texaco', name: 'Texaco' },
            { slug: 'jet', name: 'Jet' },
            { slug: 'gulf', name: 'Gulf' },
            { slug: 'co-op', name: 'Co-op' },
            { slug: 'costco', name: 'Costco' },
          ].map(b => (
            <Link
              key={b.slug}
              href={`/brand/${b.slug}`}
              className="text-sm text-blue-700 hover:text-blue-900 hover:underline px-3 py-1.5 bg-blue-50 rounded-lg"
            >
              {b.name} prices today
            </Link>
          ))}
        </nav>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Popular UK Postcode Areas</h3>
        <nav className="flex flex-wrap gap-2">
          {[
            { area: 'SW', name: 'South West London' },
            { area: 'SE', name: 'South East London' },
            { area: 'N', name: 'North London' },
            { area: 'E', name: 'East London' },
            { area: 'M', name: 'Manchester' },
            { area: 'B', name: 'Birmingham' },
            { area: 'L', name: 'Liverpool' },
            { area: 'LS', name: 'Leeds' },
            { area: 'G', name: 'Glasgow' },
            { area: 'EH', name: 'Edinburgh' },
            { area: 'CF', name: 'Cardiff' },
            { area: 'BS', name: 'Bristol' },
          ].map(p => (
            <Link
              key={p.area}
              href={`/postcode/${p.area.toLowerCase()}`}
              className="text-sm text-indigo-700 hover:text-indigo-900 hover:underline px-3 py-1.5 bg-indigo-50 rounded-lg"
            >
              {p.area} · {p.name}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
