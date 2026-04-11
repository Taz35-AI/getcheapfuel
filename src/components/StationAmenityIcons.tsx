'use client';

import { useState } from 'react';
import type { StationAmenities } from '@/lib/types';

interface Props {
  amenities: StationAmenities | undefined;
  size?: 'sm' | 'md';
}

interface IconDef {
  label: string;
  tone?: string;
  /** Path under /public — preferred over inline svg if both are set. */
  src?: string;
  /** Inline SVG fallback for amenities without a custom image. */
  svg?: React.ReactNode;
}

const ICONS: Record<string, IconDef> = {
  twenty_four_hour_fuel: {
    label: '24 hour fuel',
    tone: 'bg-emerald-50 text-emerald-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="15.5" fontSize="7.5" fontWeight="700" textAnchor="middle" stroke="none" fill="currentColor">24</text>
      </svg>
    ),
  },
  car_wash: {
    label: 'Car wash',
    tone: 'bg-white',
    src: '/forecourt/carwash.png',
  },
  adblue_pumps: {
    label: 'AdBlue pump',
    tone: 'bg-white',
    src: '/forecourt/adblue-pump.png',
  },
  adblue_packaged: {
    label: 'AdBlue (bottled)',
    tone: 'bg-blue-50 text-blue-700',
    svg: (
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
    tone: 'bg-white',
    src: '/forecourt/pgl.png',
  },
  air_pump_or_screenwash: {
    label: 'Air & screenwash',
    tone: 'bg-white',
    src: '/forecourt/air-screen.png',
  },
  water_filling: {
    label: 'Water',
    tone: 'bg-cyan-50 text-cyan-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2.5C12 2.5 5 11 5 16a7 7 0 0014 0c0-5-7-13.5-7-13.5z" />
      </svg>
    ),
  },
  customer_toilets: {
    label: 'Toilets',
    tone: 'bg-white',
    src: '/forecourt/toilets.svg',
  },
};

export default function StationAmenityIcons({ amenities, size = 'md' }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (!amenities) return null;

  const active = Object.entries(ICONS)
    .filter(([key]) => amenities[key as keyof StationAmenities])
    .slice(0, 8);

  if (active.length === 0) return null;

  // File-based icons need a bigger box than the inline SVGs because the
  // images carry their own outline/colour and need a bit of breathing room.
  // md size is used inside the station popup, sm inside the list card.
  const boxSize = size === 'sm' ? 'w-7 h-7' : 'w-12 h-12';
  const imgSize = size === 'sm' ? 'w-5 h-5' : 'w-9 h-9';
  const svgSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

  const selectedLabel = active.find(([k]) => k === selectedKey)?.[1].label;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {active.map(([key, info]) => {
          const isSelected = selectedKey === key;
          return (
            <button
              type="button"
              key={key}
              title={info.label}
              aria-label={info.label}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedKey(isSelected ? null : key);
              }}
              className={`${boxSize} flex items-center justify-center rounded-lg border border-gray-200 transition-all ${info.tone || 'bg-gray-100 text-gray-600'} ${isSelected ? 'ring-2 ring-offset-1 ring-green-500 scale-110' : 'hover:brightness-95'}`}
            >
              {info.src ? (
                <img
                  src={info.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`${imgSize} object-contain`}
                />
              ) : (
                <div className={svgSize}>{info.svg}</div>
              )}
            </button>
          );
        })}
      </div>
      {selectedLabel && (
        <div className="mt-1.5 text-[11px] font-medium text-gray-700 animate-in fade-in slide-in-from-top-1 duration-150">
          {selectedLabel}
        </div>
      )}
    </div>
  );
}
