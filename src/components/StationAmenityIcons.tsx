import type { StationAmenities } from '@/lib/types';

interface Props {
  amenities: StationAmenities | undefined;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, { label: string; svg: React.ReactNode }> = {
  twenty_four_hour_fuel: {
    label: '24h Fuel',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  car_wash: {
    label: 'Car Wash',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h14M5 17a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zm-2-4l-1.5-4.5A2 2 0 0013.6 7h-3.2a2 2 0 00-1.9 1.5L7 13" />
        <path d="M3 8v.01M3 5v.01M7 5v.01M11 4v.01" />
      </svg>
    ),
  },
  adblue_pumps: {
    label: 'AdBlue Pump',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l-5 9a5 5 0 1010 0z" />
      </svg>
    ),
  },
  adblue_packaged: {
    label: 'AdBlue (Bottled)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2h6v3l1 2v13a2 2 0 01-2 2h-4a2 2 0 01-2-2V7l1-2V2z" />
      </svg>
    ),
  },
  lpg_pumps: {
    label: 'LPG',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
      </svg>
    ),
  },
  air_pump_or_screenwash: {
    label: 'Air & Water',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    ),
  },
  water_filling: {
    label: 'Water',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
  },
  customer_toilets: {
    label: 'Toilets',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="2" />
        <path d="M6 22V12L4 11l2-3h4l2 3-2 1v10" />
        <circle cx="17" cy="5" r="2" />
        <path d="M14 22h6l-1-7h2l-3-7-3 7h2l-1 7" />
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
          className={`${pad} rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors`}
        >
          <div className={dim}>{info.svg}</div>
        </div>
      ))}
    </div>
  );
}
