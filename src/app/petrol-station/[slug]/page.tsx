import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
// NOTE: the brand logo lives at /icons/logo.webp (with .png fallback)
// - /log.svg is the unrelated FuelTracker "logbook" icon.
import { notFound } from 'next/navigation';
import { fetchAllStations, haversineDistance } from '@/lib/fuel-data';
import { findPostcodeArea } from '@/lib/uk-postcodes';
import { findBrandBySlug } from '@/lib/brand-slugs';
import { findStationBySlug, stationToSlug } from '@/lib/station-slug';
import { FUEL_COLORS } from '@/lib/types';
import { toTitleCase } from '@/lib/format-text';
import BrandLogo from '@/components/BrandLogo';
import OpenStatusBadge from '@/components/OpenStatusBadge';
import StationAmenityIcons from '@/components/StationAmenityIcons';

// ISR - pages regenerate at most once an hour. Fresh enough for
// daily-updated prices, cheap enough for Google crawl budget.
export const revalidate = 3600;
// dynamicParams: true (default) means slugs not returned from
// generateStaticParams still render on demand, then cache.
export const dynamicParams = true;

// Canonical origin - must match Vercel's primary domain (apex) to
// avoid "Alternative page with proper canonical tag" SEO issues.
const SITE_ORIGIN = 'https://getcheapfuel.co.uk';

type PageParams = Promise<{ slug: string }>;

// ─── Metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const station = await findStationBySlug(slug);
  if (!station) {
    return {
      title: 'Station not found · GetCheapFuel',
      robots: { index: false, follow: false },
    };
  }

  const streetTitle = streetNameOnly(station.address);
  const locality = extractLocality(station.address);
  // Clean up SHOUTY brand names from raw Fuel Finder rows ("TOTAL",
  // "GULF"). Length >3 keeps real acronyms like "BP" intact, and the
  // all-upper check leaves already-cased brands like "Shell" and
  // "TotalEnergies" alone.
  const brandDisplay = station.brand.length > 3 && station.brand === station.brand.toUpperCase()
    ? toTitleCase(station.brand)
    : station.brand;
  const priceE10 = station.prices.E10;
  const priceB7 = station.prices.B7;

  const pricePreview = [
    priceE10 != null ? `Unleaded ${priceE10.toFixed(1)}p` : '',
    priceB7 != null ? `Diesel ${priceB7.toFixed(1)}p` : '',
  ]
    .filter(Boolean)
    .join(', ');

  // Check if this station is open 24/7 for the "Open 24h" signal.
  const is24hMeta = station.openingHours
    ? (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).every(
        (d) => station.openingHours?.[d]?.is_24_hours === true,
      )
    : false;

  // Locality-aware SEO copy. Title leads with the intent keyword
  // ("Cheap petrol [town]") so the page lines up with the highest-volume
  // long-tail searches. Falls back to a clean brand+street+postcode form
  // when the address doesn't yield a reliable town name.
  // No trailing " | GetCheapFuel" - layout.tsx's title.template adds it.
  const title = locality
    ? `Cheap petrol ${locality} - ${brandDisplay} ${streetTitle} ${station.postcode}`
    : `${brandDisplay} ${streetTitle} ${station.postcode} - Cheap petrol & diesel`;

  // Description mirrors the title intent and packs in the actual prices,
  // the 24h signal when true, and ends with a live-prices tail.
  const descriptionLead = locality
    ? `Cheap petrol & diesel in ${locality} - ${brandDisplay} ${streetTitle} (${station.postcode}).`
    : `${brandDisplay} ${streetTitle} (${station.postcode}) - cheap petrol & diesel prices.`;

  const priceLine = pricePreview ? ` ${pricePreview} today.` : '';
  const openTail = is24hMeta ? ' Open 24h.' : '';
  const tail = ' Live fuel prices across UK stations.';

  const description = `${descriptionLead}${priceLine}${openTail}${tail}`;

  const canonical = `${SITE_ORIGIN}/petrol-station/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      images: [{ url: `${SITE_ORIGIN}/opengraph-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_ORIGIN}/opengraph-image.png`],
    },
  };
}

// ─── Small helpers ─────────────────────────────────────────────────────
function fmtPence(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}p`;
}

// Pull just the road name - drop leading house numbers ("109-113 YORK WAY"
// → "York Way") so the hero H1 reads cleanly.
function streetNameOnly(address: string | undefined): string {
  if (!address) return '';
  const first = address.split(',')[0] || '';
  const stripped = first.replace(/^[\d\s\-/]+/, '').trim();
  return toTitleCase(stripped);
}

// Pick the locality (town/city) out of a Fuel Finder address. Addresses
// come as "STREET, LOCALITY, COUNTY" most of the time, but some stations
// use "SERVICES NAME, STREET, TOWN, COUNTY" or lead with a brand name.
// We skip any segment that looks like a road/services/facility to avoid
// outputting "Cheap petrol Brompton Road" etc.
const ROAD_LIKE_PATTERN = /\b(road|rd|street|st|avenue|ave|way|lane|ln|close|services|drive|dr|crescent|place|pl|court|ct|gardens|terrace|ter|grove|mews|parade|walk|broadway|rise|hill|garage|park|filling|station|service|motorway|m\d)\b/i;

function extractLocality(address: string | undefined): string | null {
  if (!address) return null;
  const segs = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Skip segs[0] (always street) and walk forward, returning the first
  // segment that doesn't look like a road/facility and isn't trivial.
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.length < 3) continue;
    if (ROAD_LIKE_PATTERN.test(seg)) continue;
    // Strip any trailing postcode fragment (some addresses tack the
    // postcode onto the locality segment in free-form).
    const cleaned = seg.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i, '').trim();
    if (!cleaned) continue;
    return toTitleCase(cleaned);
  }
  return null;
}

type Fuel = 'E10' | 'E5' | 'B7' | 'SDV';
const FUEL_LABELS: Record<Fuel, { short: string; long: string; code: string }> = {
  E10: { short: 'Unleaded', long: 'Unleaded', code: 'E10' },
  E5: { short: 'Premium', long: 'Premium Unleaded', code: 'E5' },
  B7: { short: 'Diesel', long: 'Diesel', code: 'B7' },
  SDV: { short: 'Super', long: 'Super Diesel', code: 'SDV' },
};

// ─── Page ──────────────────────────────────────────────────────────────
export default async function PetrolStationPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const station = await findStationBySlug(slug);
  if (!station) notFound();

  // Enforce canonical slug: if someone hits a slightly-different slug that
  // happens to resolve to the same station (case, trailing dashes), we
  // only accept the exact canonical form so Google doesn't see dupes.
  const canonicalSlug = stationToSlug(station);
  if (canonicalSlug !== slug.toLowerCase()) {
    notFound();
  }

  // Fetch all stations for nearby calculations. Hits the shared cache.
  const allStations = await fetchAllStations(86400);

  // Nearby - up to 6 stations within ~2 km, excluding this one.
  const nearby = allStations
    .filter((s) => s.id !== station.id && s.postcode)
    .map((s) => ({
      station: s,
      distanceKm: haversineDistance(
        station.latitude,
        station.longitude,
        s.latitude,
        s.longitude,
      ),
    }))
    .filter((n) => n.distanceKm < 2)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);

  // Area averages / comparisons
  const e10Prices = nearby.map((n) => n.station.prices.E10).filter((p): p is number => p != null);
  const b7Prices = nearby.map((n) => n.station.prices.B7).filter((p): p is number => p != null);
  const areaAvgE10 = e10Prices.length ? e10Prices.reduce((a, b) => a + b, 0) / e10Prices.length : null;
  const areaAvgB7 = b7Prices.length ? b7Prices.reduce((a, b) => a + b, 0) / b7Prices.length : null;

  const e10Delta = areaAvgE10 != null && station.prices.E10 != null
    ? Math.round((areaAvgE10 - station.prices.E10) * 10) / 10
    : null;
  const b7Delta = areaAvgB7 != null && station.prices.B7 != null
    ? Math.round((areaAvgB7 - station.prices.B7) * 10) / 10
    : null;

  const cheaperThanCount = nearby.filter((n) => {
    const p = n.station.prices.E10;
    return p != null && station.prices.E10 != null && p > station.prices.E10;
  }).length;

  const savings50L = e10Delta != null && e10Delta > 0 ? (e10Delta * 50) / 100 : 0;

  // Derive a simple "is 24h" flag from opening hours
  const is24h = station.openingHours
    ? (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).every(
        (d) => station.openingHours?.[d]?.is_24_hours === true,
      )
    : false;

  // UK postcode has two halves: outcode (district, e.g. "N7") and incode
  // (e.g. "9QE"). The /postcode/[area] route only accepts the *letter
  // prefix* of the outcode ("N", "NW", "EC") so we extract that here -
  // not the full outcode, which would 404.
  const postcodeArea = (station.postcode?.match(/^[A-Za-z]+/)?.[0] || '').toUpperCase();
  const postcodeDistrict = station.postcode?.split(' ')[0] || '';
  // Only link to /postcode/[area] if the area has a dedicated page.
  // A handful of UK postcode areas (FY, AB, BT, NP, TQ etc.) aren't in
  // UNIQUE_POSTCODE_AREAS yet - sending Google or users to those URLs
  // would 404. When the area isn't covered we render the label as
  // plain text so the breadcrumb still reads correctly.
  const postcodeAreaHasPage = !!findPostcodeArea(postcodeArea.toLowerCase());
  // Same defensive check for brand: many Fuel Finder stations come in
  // with one-off brand names ("Toomey Filling Station Basildon",
  // "Nicholl Fuels") that don't have a dedicated /brand/[slug] page.
  // Linking the breadcrumb to a brand page that 404s is exactly the
  // pattern that filled up Google's 404 report.
  const brandSlug = (station.brand || '').toLowerCase().replace(/\s+/g, '-');
  const brandHasPage = brandSlug ? !!findBrandBySlug(brandSlug) : false;
  const addressPretty = toTitleCase(station.address);
  // Station addresses come as "STREET, CITY, COUNTY" - the second
  // segment is nearly always the locality for schema.org purposes.
  const cityGuess = toTitleCase((station.address || '').split(',')[1]?.trim() || station.brand);
  const streetPretty = streetNameOnly(station.address) || station.brand;

  // Today's date formatted for human copy
  const todayLong = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // URLs
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  const wazeUrl = `https://waze.com/ul?ll=${station.latitude},${station.longitude}&navigate=yes&q=${encodeURIComponent(`${station.brand} ${station.postcode}`)}`;

  // JSON-LD - unique per station, feeds Google rich results
  const gasStationLd = {
    '@context': 'https://schema.org',
    '@type': 'GasStation',
    name: `${station.brand} ${streetPretty}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: streetPretty,
      addressLocality: cityGuess,
      postalCode: station.postcode,
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: station.latitude,
      longitude: station.longitude,
    },
    ...(is24h && {
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
      ],
    }),
    url: `${SITE_ORIGIN}/petrol-station/${slug}`,
  };

  // Build the BreadcrumbList dynamically so we only include the brand
  // and postcode-area steps when those pages actually exist. Google's
  // BreadcrumbList spec requires every 'item' URL to return a 200 -
  // linking to a 404 was the other half of our Search Console noise.
  const breadcrumbLd = (() => {
    const items: Array<{
      '@type': 'ListItem';
      position: number;
      name: string;
      item: string;
    }> = [];
    let position = 1;
    items.push({ '@type': 'ListItem', position: position++, name: 'GetCheapFuel', item: SITE_ORIGIN });
    items.push({ '@type': 'ListItem', position: position++, name: 'Petrol stations', item: `${SITE_ORIGIN}/` });
    if (brandHasPage) {
      items.push({ '@type': 'ListItem', position: position++, name: station.brand, item: `${SITE_ORIGIN}/brand/${brandSlug}` });
    }
    if (postcodeAreaHasPage) {
      items.push({ '@type': 'ListItem', position: position++, name: postcodeArea, item: `${SITE_ORIGIN}/postcode/${postcodeArea.toLowerCase()}` });
    }
    items.push({ '@type': 'ListItem', position: position++, name: `${station.brand} ${station.postcode}`, item: `${SITE_ORIGIN}/petrol-station/${slug}` });
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
  })();

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      station.prices.E10 != null && {
        '@type': 'Question',
        name: `What is the petrol price at ${station.brand} ${station.postcode} today?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Unleaded (E10) is ${station.prices.E10.toFixed(1)}p per litre${station.prices.B7 != null ? `, Diesel (B7) is ${station.prices.B7.toFixed(1)}p per litre` : ''}, at ${station.brand} on ${streetPretty}, ${station.postcode}. Updated today.`,
        },
      },
      is24h && {
        '@type': 'Question',
        name: `Is ${station.brand} ${station.postcode} open 24 hours?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes - this ${station.brand} station is open 24 hours a day, 7 days a week.`,
        },
      },
      e10Delta != null && {
        '@type': 'Question',
        name: `How does ${station.brand} ${station.postcode} compare to nearby stations?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            e10Delta > 0
              ? `At ${station.prices.E10?.toFixed(1)}p, Unleaded here is ${e10Delta.toFixed(1)}p per litre cheaper than the ${nearby.length}-station area average of ${areaAvgE10?.toFixed(1)}p.`
              : e10Delta < 0
              ? `At ${station.prices.E10?.toFixed(1)}p, Unleaded here is ${Math.abs(e10Delta).toFixed(1)}p per litre above the ${nearby.length}-station area average of ${areaAvgE10?.toFixed(1)}p.`
              : `Unleaded here matches the local area average exactly.`,
        },
      },
    ].filter(Boolean),
  };

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gasStationLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Top nav */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <picture>
              <source srcSet="/icons/logo.webp" type="image/webp" />
              <img src="/icons/logo.png" alt="GetCheapFuel" width={32} height={32} className="h-8 w-auto" />
            </picture>
            <span className="font-black text-[15px] hidden sm:inline">GetCheapFuel</span>
          </Link>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <Link href="/" className="hover:text-gray-900">Map</Link>
            <Link href="/fuel-index" className="hover:text-gray-900">Cities</Link>
            <Link href="/blog" className="hover:text-gray-900">Blog</Link>
          </div>
          <Link href="/" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg">
            📍 My Location
          </Link>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between flex-wrap gap-2">
        <ol className="flex items-center gap-1.5 text-xs text-gray-500">
          <li><Link href="/" className="hover:text-green-700">Home</Link></li>
          <li className="text-gray-300">/</li>
          <li>
            {brandHasPage ? (
              <Link href={`/brand/${brandSlug}`} className="hover:text-green-700">{station.brand}</Link>
            ) : (
              <span className="text-gray-600">{station.brand}</span>
            )}
          </li>
          <li className="text-gray-300">/</li>
          <li>
            {postcodeAreaHasPage ? (
              <Link href={`/postcode/${postcodeArea.toLowerCase()}`} className="hover:text-green-700">{postcodeArea}</Link>
            ) : (
              <span className="text-gray-600">{postcodeArea}</span>
            )}
          </li>
          <li className="text-gray-300">/</li>
          <li className="font-semibold text-gray-900 truncate">{station.brand} {station.postcode}</li>
        </ol>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span>Updated {todayLong}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ========== HERO ==========
            Clean white card matching the rest of the page. Logo + brand +
            street name + address + a row of status chips. No gradient, no
            glows - keeps the focus on the information. */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-center">
              <BrandLogo brand={station.brand} size={72} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {is24h && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
                    Open 24 hours · 7 days
                  </span>
                )}
                {e10Delta != null && e10Delta > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                    ★ {e10Delta.toFixed(1)}p cheaper than area avg
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-gray-900">
                {station.brand} {streetPretty}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                {addressPretty} · <span className="font-bold text-gray-900">{station.postcode}</span>
              </p>
            </div>
          </div>

          {/* Savings callout - compact line, no dark backdrop */}
          {savings50L > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">You save here</span>
              <span className="text-2xl sm:text-3xl font-black tabular-nums text-gray-900">£{savings50L.toFixed(2)}</span>
              <span className="text-sm text-gray-500">per 50-litre fill</span>
              <span className="text-sm text-gray-500 basis-full sm:basis-auto sm:ml-2">
                Unleaded is <span className="font-bold text-gray-900">{e10Delta?.toFixed(1)}p cheaper</span> than the {nearby.length}-station average
                {b7Delta != null && b7Delta > 0 && (
                  <> · Diesel saves another <span className="font-bold text-gray-900">{b7Delta.toFixed(1)}p/L</span></>
                )}.
              </span>
            </div>
          )}
        </section>

        {/* ========== PRICES ========== */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Today&apos;s prices</div>
              <h2 className="text-2xl font-black tracking-tight">Pump prices · per litre</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600">
              {todayLong}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['E10', 'E5', 'B7', 'SDV'] as Fuel[]).map((fuel) => {
              const price = station.prices[fuel];
              const info = FUEL_LABELS[fuel];
              const color = FUEL_COLORS[fuel];
              const tints: Record<Fuel, { border: string; bg: string; chip: string }> = {
                E10: { border: 'border-green-100', bg: 'from-green-50', chip: 'bg-green-500' },
                E5: { border: 'border-blue-100', bg: 'from-blue-50', chip: 'bg-blue-500' },
                B7: { border: 'border-amber-100', bg: 'from-amber-50', chip: 'bg-amber-500' },
                SDV: { border: 'border-red-100', bg: 'from-red-50', chip: 'bg-red-500' },
              };
              const delta = fuel === 'E10' ? e10Delta : fuel === 'B7' ? b7Delta : null;
              const tint = tints[fuel];

              return (
                <div key={fuel} className={`rounded-2xl border-2 ${tint.border} bg-gradient-to-br ${tint.bg} to-white p-4 relative overflow-hidden`}>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-black tracking-wide ${tint.chip}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white" />
                    {info.code} {info.short.toUpperCase()}
                  </div>
                  <div className="mt-3 flex items-baseline gap-0.5">
                    <span className="text-4xl sm:text-5xl font-black tabular-nums text-gray-900" style={{ letterSpacing: '-0.025em' }}>
                      {price != null ? price.toFixed(1) : '-'}
                    </span>
                    {price != null && <span className="text-gray-400 text-lg font-bold">p</span>}
                  </div>
                  <div className="mt-2">
                    {delta != null && delta > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold">▼ {delta.toFixed(1)}p vs area</span>
                    ) : delta != null && delta < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">▲ {Math.abs(delta).toFixed(1)}p vs area</span>
                    ) : price != null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">- Area avg</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">No data</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions row */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a href={googleUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold">
              🧭 Directions on Google Maps
            </a>
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold">
              📍 Navigate with Waze
            </a>
          </div>
        </section>

        {/* ========== HOURS + AMENITIES ========== */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Availability</div>
                <h2 className="text-2xl font-black tracking-tight">Opening hours</h2>
              </div>
            </div>
            {station.openingHours ? (
              <OpenStatusBadge hours={station.openingHours} variant="full" />
            ) : (
              <p className="text-sm text-gray-500 italic">Opening hours not published for this station.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7 lg:col-span-3">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Forecourt</div>
                <h2 className="text-2xl font-black tracking-tight">What&apos;s on site</h2>
              </div>
            </div>
            {station.amenities && Object.values(station.amenities).some(Boolean) ? (
              <StationAmenityIcons amenities={station.amenities} size="md" />
            ) : (
              <p className="text-sm text-gray-500 italic">No amenity data published for this station.</p>
            )}
          </div>
        </section>

        {/* ========== NEARBY ========== */}
        {nearby.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Nearby stations</div>
                <h2 className="text-2xl font-black tracking-tight">Compare within ~1 mile</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600">
                Sorted by distance
              </span>
            </div>
            <div className="space-y-2">
              {nearby.map(({ station: n, distanceKm }) => {
                const nSlug = stationToSlug(n);
                const myPrice = station.prices.E10;
                const theirPrice = n.prices.E10;
                const delta =
                  myPrice != null && theirPrice != null
                    ? Math.round((theirPrice - myPrice) * 10) / 10
                    : null;
                return (
                  <Link
                    key={n.id}
                    href={`/petrol-station/${nSlug}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl hover:bg-gray-50 border border-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl border border-gray-100 p-1.5 flex items-center justify-center">
                      <BrandLogo brand={n.brand} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">
                        {n.brand} {toTitleCase((n.address || '').split(',')[0]).slice(0, 40)}
                      </div>
                      <div className="text-[11px] text-gray-500 tabular-nums">
                        {n.postcode} · {distanceKm.toFixed(1)} km
                        {delta != null && delta > 0 && <span className="text-red-500 font-bold"> · +{delta.toFixed(1)}p Unleaded</span>}
                        {delta != null && delta < 0 && <span className="text-green-600 font-bold"> · {delta.toFixed(1)}p Unleaded</span>}
                        {delta != null && delta === 0 && <span className="text-gray-500 font-bold"> · Same price</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black tabular-nums text-gray-900">{fmtPence(n.prices.E10)}</div>
                      <div className="text-[10px] font-bold text-gray-500">E10</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xl font-black tabular-nums text-gray-900">{fmtPence(n.prices.B7)}</div>
                      <div className="text-[10px] font-bold text-gray-500">B7</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ========== FAQ ========== */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.03] p-5 sm:p-7">
          <div className="mb-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Common questions</div>
            <h2 className="text-2xl font-black tracking-tight">Quick answers</h2>
          </div>
          <div className="space-y-2">
            <details className="rounded-2xl border border-gray-100 p-4 group" open>
              <summary className="font-black text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>What is the fuel price at {station.brand} {station.postcode} today?</span>
                <span className="text-gray-400 text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                {station.prices.E10 != null && <>Unleaded (E10) is <strong className="text-gray-900">{station.prices.E10.toFixed(1)}p</strong>. </>}
                {station.prices.E5 != null && <>Premium (E5) is {station.prices.E5.toFixed(1)}p. </>}
                {station.prices.B7 != null && <>Diesel (B7) is <strong className="text-gray-900">{station.prices.B7.toFixed(1)}p</strong>. </>}
                {station.prices.SDV != null && <>Super Diesel is {station.prices.SDV.toFixed(1)}p per litre. </>}
                Prices refresh daily from the UK Government&apos;s Fuel Finder scheme.
              </div>
            </details>
            {is24h && (
              <details className="rounded-2xl border border-gray-100 p-4 group">
                <summary className="font-black text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  <span>Is {station.brand} {station.postcode} open 24 hours?</span>
                  <span className="text-gray-400 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                  Yes - this {station.brand} station is open <strong>24 hours a day, 7 days a week</strong>, including bank holidays.
                </div>
              </details>
            )}
            {e10Delta != null && nearby.length > 0 && (
              <details className="rounded-2xl border border-gray-100 p-4 group">
                <summary className="font-black text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  <span>How does this station compare to nearby ones?</span>
                  <span className="text-gray-400 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {e10Delta > 0 ? (
                    <>Unleaded at <strong>{station.prices.E10?.toFixed(1)}p</strong> is <strong>{e10Delta.toFixed(1)}p cheaper</strong> than the {nearby.length}-station area average of {areaAvgE10?.toFixed(1)}p, beating {cheaperThanCount} of {nearby.length} nearby rivals.</>
                  ) : e10Delta < 0 ? (
                    <>Unleaded at {station.prices.E10?.toFixed(1)}p sits <strong>{Math.abs(e10Delta).toFixed(1)}p above</strong> the {nearby.length}-station area average of {areaAvgE10?.toFixed(1)}p.</>
                  ) : (
                    <>Unleaded here matches the {nearby.length}-station area average exactly.</>
                  )}
                </div>
              </details>
            )}
            <details className="rounded-2xl border border-gray-100 p-4 group">
              <summary className="font-black text-gray-900 cursor-pointer list-none flex items-center justify-between">
                <span>How accurate are the prices shown?</span>
                <span className="text-gray-400 text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                Prices are supplied by the retailer directly through the UK Department for Transport&apos;s <strong>Fuel Finder scheme</strong> - a legally mandated price reporting system. Our database refreshes every 30 minutes.
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-6 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet="/icons/logo.webp" type="image/webp" />
              <img src="/icons/logo.png" alt="" width={36} height={36} className="h-9 w-auto" />
            </picture>
            <div>
              <div className="font-black text-gray-900">GetCheapFuel</div>
              <div className="text-[11px] text-gray-500">The UK&apos;s live fuel price map · Updated daily</div>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <a href="mailto:contact@getcheapfuel.co.uk" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
