'use client';

import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';

interface CheapestCardProps {
  stations: FuelStation[];
  selectedFuels: FuelType[];
  onStationClick: (station: FuelStation) => void;
}

export default function CheapestCard({ stations, selectedFuels, onStationClick }: CheapestCardProps) {
  const fuelTypes = selectedFuels.filter(f => f !== 'EV') as Exclude<FuelType, 'EV'>[];
  if (fuelTypes.length === 0 || stations.length === 0) return null;

  const cheapest = fuelTypes
    .map(fuel => {
      const sorted = stations
        .filter(s => s.prices[fuel] != null)
        .sort((a, b) => (a.prices[fuel] ?? 999) - (b.prices[fuel] ?? 999));
      const best = sorted[0];
      if (!best) return null;
      return { fuel, station: best, price: best.prices[fuel]! };
    })
    .filter(Boolean) as { fuel: Exclude<FuelType, 'EV'>; station: FuelStation; price: number }[];

  if (cheapest.length === 0) return null;

  return (
    <div className="absolute bottom-16 md:bottom-4 left-2 md:left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-3 max-w-[280px]">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cheapest Nearby</div>
      <div className="space-y-2">
        {cheapest.map(({ fuel, station, price }) => (
          <button
            key={fuel}
            onClick={() => onStationClick(station)}
            className="w-full flex items-center gap-2 text-left hover:bg-gray-50 rounded-lg p-1.5 -m-1.5 transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: FUEL_COLORS[fuel] }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">{FUEL_LABELS[fuel]}</div>
              <div className="text-sm font-bold text-gray-900 truncate">{station.brand}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold" style={{ color: FUEL_COLORS[fuel] }}>
                {price.toFixed(1)}p
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
