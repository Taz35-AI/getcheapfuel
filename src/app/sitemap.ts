import type { MetadataRoute } from 'next'
import { UK_CITIES } from '@/lib/cities'
import { BRAND_SLUGS } from '@/lib/brand-slugs'
import { UNIQUE_POSTCODE_AREAS } from '@/lib/uk-postcodes'

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
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
