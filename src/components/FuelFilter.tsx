'use client';

import type { FuelType } from '@/lib/types';

interface FuelFilterProps {
  selected: FuelType[];
  onChange: (fuels: FuelType[]) => void;
}

// Mutually-exclusive fuel groups. A user who owns a petrol car
// doesn't want diesel prices in their results (and vice versa), so
// we only allow one group's fuels to be active at a time. EV is
// orthogonal and can be combined with either group.
const PETROL_GROUP: readonly FuelType[] = ['E10', 'E5'];
const DIESEL_GROUP: readonly FuelType[] = ['B7', 'SDV'];

function isPetrol(f: FuelType): boolean {
  return PETROL_GROUP.includes(f);
}
function isDiesel(f: FuelType): boolean {
  return DIESEL_GROUP.includes(f);
}

/** Small colored chip showing the fuel code — acts as the visual anchor. */
function FuelCodeChip({ code, isActive, activeBg, inactiveText }: { code: string; isActive: boolean; activeBg: string; inactiveText: string }) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[30px] px-1.5 py-0.5
        rounded text-[10px] md:text-[11px] font-black tracking-wide leading-none
        ${isActive ? `bg-white/25 text-white` : `${inactiveText} bg-white/80 ring-1 ring-current/20`}
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
  // Which fuel group is currently "active" — i.e. has at least one
  // member selected. Drives the dimming so the other (non-active)
  // group is visually muted but still tappable.
  const hasPetrolSelected = selected.some(isPetrol);
  const hasDieselSelected = selected.some(isDiesel);

  const toggle = (fuel: FuelType) => {
    // EV is orthogonal — toggle independently, no group swapping.
    if (fuel === 'EV') {
      if (selected.includes('EV')) {
        if (selected.length === 1) return;
        onChange(selected.filter(f => f !== 'EV'));
      } else {
        onChange([...selected, 'EV']);
      }
      return;
    }

    const clickedIsPetrol = isPetrol(fuel);
    const otherGroupHasMembers = clickedIsPetrol ? hasDieselSelected : hasPetrolSelected;

    if (otherGroupHasMembers) {
      // Swap groups — drop everything from the other fuel group and
      // replace with just the clicked fuel. EV stays if it was on.
      const next: FuelType[] = [fuel];
      if (selected.includes('EV')) next.push('EV');
      onChange(next);
      return;
    }

    // Normal in-group toggle
    if (selected.includes(fuel)) {
      // Prevent dropping the last fuel — always leave at least one
      // member of the active group selected.
      const next = selected.filter(f => f !== fuel);
      const nonEv = next.filter(f => f !== 'EV');
      if (nonEv.length === 0) return;
      onChange(next);
    } else {
      onChange([...selected, fuel]);
    }
  };

  const renderChip = (fuel: typeof FUEL_CONFIG[number]) => {
    const isActive = selected.includes(fuel.key);
    // Fuels in the OTHER group get dimmed so users can see at a
    // glance which group is currently active. Still clickable —
    // tapping one triggers a clean group swap.
    const isDimmed =
      (fuel.key === 'B7' || fuel.key === 'SDV') && hasPetrolSelected ||
      (fuel.key === 'E10' || fuel.key === 'E5') && hasDieselSelected;

    return (
      <button
        key={fuel.key}
        onClick={() => toggle(fuel.key)}
        className={`
          inline-flex items-center gap-1.5
          px-2 py-1.5 md:px-3 md:py-2
          rounded-xl
          text-xs md:text-sm font-bold
          border-2 transition-all whitespace-nowrap
          ${isActive
            ? `${fuel.activeBg} text-white ${fuel.inactiveBorder} shadow-md`
            : isDimmed
              ? `bg-white ${fuel.inactiveText} ${fuel.inactiveBorder} opacity-60 hover:opacity-100`
              : `bg-white ${fuel.inactiveText} ${fuel.inactiveBorder} hover:${fuel.inactiveBg}`
          }
        `}
        aria-pressed={isActive}
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
  };

  const petrolChips = FUEL_CONFIG.filter(f => isPetrol(f.key));
  const dieselChips = FUEL_CONFIG.filter(f => isDiesel(f.key));
  const evChips = FUEL_CONFIG.filter(f => f.key === 'EV');

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <div className="flex gap-1 md:gap-1.5">{petrolChips.map(renderChip)}</div>
      <span
        className="w-px h-5 md:h-6 bg-gray-300 mx-0.5 md:mx-1 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex gap-1 md:gap-1.5">{dieselChips.map(renderChip)}</div>
      <span
        className="w-px h-5 md:h-6 bg-gray-300 mx-0.5 md:mx-1 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex gap-1 md:gap-1.5">{evChips.map(renderChip)}</div>
    </div>
  );
}
