import type { StationAmenities } from '@/lib/types';

interface Props {
  amenities: StationAmenities | undefined;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, { label: string; svg: React.ReactNode; tone?: string }> = {
  twenty_four_hour_fuel: {
    label: '24 hour fuel',
    tone: 'bg-emerald-50 text-emerald-700',
    svg: (
      // Clock with "24" — universally understood
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" stroke="none" fill="currentColor">24</text>
      </svg>
    ),
  },
  car_wash: {
    label: 'Car wash',
    tone: 'bg-sky-50 text-sky-700',
    svg: (
      // Car silhouette with droplets above
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* droplets */}
        <path d="M5 4c0 .8.7 1.5 1.5 1.5S8 4.8 8 4c0-1-1.5-2.5-1.5-2.5S5 3 5 4z" fill="currentColor" stroke="none" />
        <path d="M11 3c0 .8.7 1.5 1.5 1.5S14 3.8 14 3c0-1-1.5-2.5-1.5-2.5S11 2 11 3z" fill="currentColor" stroke="none" />
        <path d="M17 4c0 .8.7 1.5 1.5 1.5S20 4.8 20 4c0-1-1.5-2.5-1.5-2.5S17 3 17 4z" fill="currentColor" stroke="none" />
        {/* car body */}
        <path d="M3 17v-3l2-5h14l2 5v3" />
        <path d="M3 17h18" />
        <circle cx="7" cy="18.5" r="1.8" />
        <circle cx="17" cy="18.5" r="1.8" />
      </svg>
    ),
  },
  adblue_pumps: {
    label: 'AdBlue pump',
    tone: 'bg-blue-50 text-blue-700',
    svg: (
      // Fuel pump silhouette
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="11" height="18" rx="1.5" />
        <line x1="6" y1="7" x2="11" y2="7" />
        <rect x="6" y="11" width="5" height="4" rx="0.5" />
        <path d="M14 9h2.5a2 2 0 012 2v7a1.5 1.5 0 003 0v-9l-2.5-2.5" />
      </svg>
    ),
  },
  adblue_packaged: {
    label: 'AdBlue (bottled)',
    tone: 'bg-blue-50 text-blue-700',
    svg: (
      // Jerry can / fuel container
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7h11l2 2v11a1 1 0 01-1 1H6a1 1 0 01-1-1V7z" />
        <path d="M9 7V4h5v3" />
        <line x1="18" y1="9" x2="20" y2="7" />
        <line x1="8" y1="13" x2="14" y2="13" />
      </svg>
    ),
  },
  lpg_pumps: {
    label: 'LPG',
    tone: 'bg-orange-50 text-orange-700',
    svg: (
      // Flame
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2c0 4-4 5-4 9a4 4 0 008 0c0-1.5-.5-2.5-1.5-3.5C13 9 12 8 12 6c-1 1.5-2 2.5-2 4 0-2 1-3 2-4z" />
        <path d="M8 13c-1.5 1-2.5 2.8-2.5 4.5C5.5 20 8.4 22 12 22s6.5-2 6.5-4.5c0-1.7-1-3.5-2.5-4.5 .3 1 .5 2 .5 3a4.5 4.5 0 11-9 0c0-1 .2-2 .5-3z" />
      </svg>
    ),
  },
  air_pump_or_screenwash: {
    label: 'Air & screenwash',
    tone: 'bg-slate-100 text-slate-700',
    svg: (
      // Tyre / wheel
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
        <line x1="12" y1="3" x2="12" y2="8.5" />
        <line x1="12" y1="15.5" x2="12" y2="21" />
        <line x1="3" y1="12" x2="8.5" y2="12" />
        <line x1="15.5" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  water_filling: {
    label: 'Water',
    tone: 'bg-cyan-50 text-cyan-700',
    svg: (
      // Water droplet (filled)
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2.5C12 2.5 5 11 5 16a7 7 0 0014 0c0-5-7-13.5-7-13.5z" />
      </svg>
    ),
  },
  customer_toilets: {
    label: 'Toilets',
    tone: 'bg-purple-50 text-purple-700',
    svg: (
      // Two figures (man & woman) — universal WC sign
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        {/* Man */}
        <circle cx="7" cy="4" r="2" />
        <path d="M5 22v-7H3.5l2-6.5h3l2 6.5H9v7H5z" />
        {/* Divider */}
        <rect x="11.5" y="3" width="0.6" height="18" fill="currentColor" />
        {/* Woman */}
        <circle cx="17" cy="4" r="2" />
        <path d="M14 14l1.5-5.5a1.5 1.5 0 013 0L20 14h-1.7l-.3 8h-2l-.3-8H14z" />
      </svg>
    ),
  },
};

export default function StationAmenityIcons({ amenities, size = 'md' }: Props) {
  if (!amenities) return null;

  const active = Object.entries(ICONS)
    .filter(([key]) => amenities[key as keyof StationAmenities])
    .slice(0, 8);

  if (active.length === 0) return null;

  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const pad = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <div className="flex flex-wrap gap-1">
      {active.map(([key, info]) => (
        <div
          key={key}
          title={info.label}
          className={`${pad} rounded-md transition-colors ${info.tone || 'bg-gray-100 text-gray-600'}`}
        >
          <div className={dim}>{info.svg}</div>
        </div>
      ))}
    </div>
  );
}
