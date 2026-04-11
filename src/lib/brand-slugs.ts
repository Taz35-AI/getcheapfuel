// Brand slug ↔ display name mapping. Used by /brand/[slug] pages.
// Slugs are URL-safe lowercase, display names match what normaliseBrand
// in fuel-data.ts produces.

export const BRAND_SLUGS: { slug: string; name: string; description: string }[] = [
  { slug: 'bp', name: 'BP', description: 'BP is one of the largest international oil and gas companies, with over 1,200 forecourts across the UK.' },
  { slug: 'shell', name: 'Shell', description: "Shell operates more than 1,000 service stations in the UK, known for its V-Power premium fuel range." },
  { slug: 'esso', name: 'Esso', description: 'Esso has around 1,100 service stations across the UK, operated by ExxonMobil and various franchise groups.' },
  { slug: 'texaco', name: 'Texaco', description: 'Texaco has approximately 800 forecourts in the UK, operated by Valero Energy and independent dealers.' },
  { slug: 'jet', name: 'Jet', description: 'Jet is a UK fuel brand owned by Phillips 66, with around 325 service stations across the country.' },
  { slug: 'gulf', name: 'Gulf', description: 'Gulf operates over 150 forecourts in the UK, part of the global Gulf Oil brand.' },
  { slug: 'tesco', name: 'Tesco', description: "Tesco is the UK's largest supermarket fuel retailer with more than 500 filling stations, typically among the cheapest in the country." },
  { slug: 'asda', name: 'Asda', description: 'Asda operates around 320 supermarket forecourts across the UK and consistently prices fuel below the national average.' },
  { slug: 'sainsburys', name: "Sainsbury's", description: "Sainsbury's has roughly 310 forecourts attached to its supermarkets, offering competitive supermarket fuel prices." },
  { slug: 'morrisons', name: 'Morrisons', description: 'Morrisons runs around 335 petrol stations next to its supermarkets, often matching competitor supermarket pricing.' },
  { slug: 'co-op', name: 'Co-op', description: 'Co-op Food stores operate roughly 120 petrol stations across the UK, focused on community locations.' },
  { slug: 'costco', name: 'Costco', description: 'Costco operates around 30 members-only petrol stations in the UK, often the very cheapest prices in their local area.' },
  { slug: 'murco', name: 'Murco', description: 'Murco is a UK fuel brand dealer network now owned by Harvest Energy, with around 150 forecourts.' },
];

export function findBrandBySlug(slug: string) {
  return BRAND_SLUGS.find(b => b.slug === slug);
}
