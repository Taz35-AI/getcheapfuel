import HomeApp from '@/components/HomeApp';
import Link from 'next/link';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GetCheapFuel',
    url: 'https://getcheapfuel.co.uk',
    description:
      'Find the cheapest fuel and save money. Compare petrol, diesel and EV charging prices near you across the UK. Calculate fuel costs, plan routes, track your fuel spending and find the best deals. Real data from 7,500+ stations.',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
    },
    featureList: [
      'Real-time petrol and diesel prices from 13 UK retailers',
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
      email: 'support@getcheapfuel.co.uk',
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
        name: 'How often are fuel prices updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Fuel prices on GetCheapFuel are updated daily using official data from 13 major UK retailers including Tesco, Sainsbury\'s, Asda, Morrisons, Shell, BP, and Esso.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many petrol stations does GetCheapFuel cover?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'GetCheapFuel covers over 7,500 fuel stations across the United Kingdom, plus thousands of EV charging points via the Open Charge Map network.',
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

const cities = [
  'london', 'manchester', 'birmingham', 'leeds', 'glasgow',
  'liverpool', 'edinburgh', 'bristol', 'sheffield', 'newcastle',
  'nottingham', 'cardiff',
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeApp />

      {/* Server-rendered crawlable content for SEO — visible below the fold */}
      <section className="bg-white border-t border-gray-200 px-6 py-12 md:px-12 md:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Compare Cheap Petrol, Diesel & EV Charging Prices Across the UK
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          GetCheapFuel helps you find the cheapest fuel near you. We compare real-time petrol and diesel prices from over 7,500 stations
          across the UK, including Tesco, Sainsbury&apos;s, Asda, Morrisons, Shell, BP, Esso, and more. Whether you drive a petrol car,
          diesel van, or electric vehicle, GetCheapFuel shows you where to fill up for less.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Fuel Prices</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              See today&apos;s petrol and diesel prices updated daily from 13 major UK retailers.
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

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4 mb-12">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">How often are fuel prices updated?</summary>
            <p className="text-gray-600 text-sm mt-2">
              Fuel prices on GetCheapFuel are updated daily using official data from 13 major UK retailers
              including Tesco, Sainsbury&apos;s, Asda, Morrisons, Shell, BP, and Esso.
            </p>
          </details>
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">How many petrol stations does GetCheapFuel cover?</summary>
            <p className="text-gray-600 text-sm mt-2">
              GetCheapFuel covers over 7,500 fuel stations across the United Kingdom, plus thousands of EV
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

        {/* UK Fuel Price Index promo */}
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
                7,500+ UK forecourts.
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
