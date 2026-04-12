'use client';

import type { FuelType } from '@/lib/types';

interface FuelFilterProps {
  selected: FuelType[];
  onChange: (fuels: FuelType[]) => void;
}

/** Small colored chip showing the fuel code — acts as the visual anchor. */
function FuelCodeChip({ code, isActive, activeBg, inactiveText }: { code: string; isActive: boolean; activeBg: string; inactiveText: string }) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[28px] px-1.5 py-0.5
        rounded text-[9px] md:text-[10px] font-black tracking-wide leading-none
        ${isActive ? `${activeBg} text-white` : `${inactiveText} bg-white/80 ring-1 ring-current/20`}
      `}
    >
      {code}
    </span>
  );
}

const FUEL_CONFIG: { key: FuelType; label: string; mobileLabel: string; color: string; activeBg: string; activeText: string; inactiveBg: string; inactiveText: string; inactiveBorder: string }[] = [
  {
    key: 'E10',
    label: 'Unleaded',
    mobileLabel: 'E10',
    color: '#22c55e',
    activeBg: 'bg-green-600',
    activeText: 'text-white',
    inactiveBg: 'bg-green-50',
    inactiveText: 'text-green-700',
    inactiveBorder: 'border-green-200',
  },
  {
    key: 'E5',
    label: 'Premium',
    mobileLabel: 'E5',
    color: '#3b82f6',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    inactiveBg: 'bg-blue-50',
    inactiveText: 'text-blue-700',
    inactiveBorder: 'border-blue-200',
  },
  {
    key: 'B7',
    label: 'Diesel',
    mobileLabel: 'Diesel',
    color: '#f59e0b',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    inactiveBg: 'bg-amber-50',
    inactiveText: 'text-amber-700',
    inactiveBorder: 'border-amber-200',
  },
  {
    key: 'SDV',
    label: 'Super Diesel',
    mobileLabel: 'S.Diesel',
    color: '#ef4444',
    activeBg: 'bg-red-500',
    activeText: 'text-white',
    inactiveBg: 'bg-red-50',
    inactiveText: 'text-red-600',
    inactiveBorder: 'border-red-200',
  },
  {
    key: 'EV',
    label: 'EV Charging',
    mobileLabel: 'EV',
    color: '#8b5cf6',
    activeBg: 'bg-violet-600',
    activeText: 'text-white',
    inactiveBg: 'bg-violet-50',
    inactiveText: 'text-violet-700',
    inactiveBorder: 'border-violet-200',
  },
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
    <div className="flex gap-1.5 md:gap-2">
      {FUEL_CONFIG.map(fuel => {
        const isActive = selected.includes(fuel.key);
        return (
          <button
            key={fuel.key}
            onClick={() => toggle(fuel.key)}
            className={`
              inline-flex items-center gap-1.5
              px-1.5 py-1 md:px-2.5 md:py-1.5
              rounded-lg
              text-[10px] md:text-xs font-semibold
              border transition-all whitespace-nowrap
              ${isActive
                ? `${fuel.inactiveBg} ${fuel.inactiveText} ${fuel.inactiveBorder} shadow-sm`
                : `bg-white/50 text-gray-400 border-gray-200 opacity-60 hover:opacity-100`
              }
            `}
          >
            <FuelCodeChip
              code={fuel.mobileLabel}
              isActive={isActive}
              activeBg={fuel.activeBg}
              inactiveText={fuel.inactiveText}
            />
            <span className="hidden md:inline">{fuel.label}</span>
          </button>
        );
      })}
    </div>
  );
}
