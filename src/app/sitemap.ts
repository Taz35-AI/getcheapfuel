import type { MetadataRoute } from 'next'
import { UK_CITIES } from '@/lib/cities'
import { BRAND_SLUGS } from '@/lib/brand-slugs'
import { UNIQUE_POSTCODE_AREAS } from '@/lib/uk-postcodes'
import { fetchAllStations } from '@/lib/fuel-data'
import { stationToSlug } from '@/lib/station-slug'

// Revalidate once per day - keeps the sitemap fresh as stations come
// and go from the Fuel Finder dataset, without re-querying Supabase on
// every Googlebot hit.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://getcheapfuel.co.uk'
  const now = new Date()

  const cityPages = UK_CITIES.map(city => ({
    url: `${baseUrl}/cheap-fuel/${city.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const brandPages = BRAND_SLUGS.map(b => ({
    url: `${baseUrl}/brand/${b.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  const postcodePages = UNIQUE_POSTCODE_AREAS.map(p => ({
    url: `${baseUrl}/postcode/${p.area.toLowerCase()}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  // Per-station pages - one entry per Fuel Finder station. De-duped by
  // slug so that if two stations happen to produce the same slug (very
  // rare, same brand + same postcode + same street) Google only sees
  // one URL. Slugs are lowercased and match the canonical exactly.
  let stationPages: MetadataRoute.Sitemap = [];
  try {
    const stations = await fetchAllStations(86400);
    const seen = new Set<string>();
    stationPages = stations
      .map(s => ({ slug: stationToSlug(s), lastUpdated: s.lastUpdated }))
      .filter(s => s.slug && !seen.has(s.slug) && (seen.add(s.slug), true))
      .map(s => ({
        url: `${baseUrl}/petrol-station/${s.slug}`,
        lastModified: s.lastUpdated ? new Date(s.lastUpdated) : now,
        changeFrequency: 'daily' as const,
        priority: 0.5,
      }));
  } catch (err) {
    // Never fail the sitemap over a Supabase hiccup - serve the rest.
    console.error('[sitemap] failed to fetch stations:', err);
  }

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/fuel-index`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...cityPages,
    ...brandPages,
    ...postcodePages,
    ...stationPages,
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/diesel-outrunning-petrol-april-2026`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/trump-strait-of-hormuz-blockade-uk-fuel-prices`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
