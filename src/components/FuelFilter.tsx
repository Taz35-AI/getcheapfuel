'use client';

import type { FuelType } from '@/lib/types';
import { FUEL_COLORS } from '@/lib/types';

interface FuelFilterProps {
  selected: FuelType[];
  onChange: (fuels: FuelType[]) => void;
}

const ALL_FUELS: { key: FuelType; short: string; full: string }[] = [
  { key: 'E10', short: 'E10', full: 'Unleaded (E10)' },
  { key: 'E5', short: 'E5', full: 'Premium (E5)' },
  { key: 'B7', short: 'B7', full: 'Diesel (B7)' },
  { key: 'SDV', short: 'SDV', full: 'Super Diesel' },
  { key: 'EV', short: 'EV', full: 'EV Charging' },
];

export default function FuelFilter({ selected, onChange }: FuelFilterProps) {
  const toggle = (fuel: FuelType) => {
    if (selected.includes(fuel)) {
      if (selected.length === 1) return;
      onChange(selected.filter(f => f !== fuel));
    } else {
      onChange([...selected, fuel]);
    }
  };

  return (
    <div className="flex gap-1 md:gap-1.5">
      {ALL_FUELS.map(fuel => {
        const isActive = selected.includes(fuel.key);
        return (
          <button
            key={fuel.key}
            onClick={() => toggle(fuel.key)}
            className="px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold border-2 transition-all whitespace-nowrap"
            style={{
              borderColor: FUEL_COLORS[fuel.key],
              backgroundColor: isActive ? FUEL_COLORS[fuel.key] : 'transparent',
              color: isActive ? 'white' : FUEL_COLORS[fuel.key],
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <span className="md:hidden">{fuel.short}</span>
            <span className="hidden md:inline">{fuel.full}</span>
          </button>
        );
      })}
    </div>
  );
}
