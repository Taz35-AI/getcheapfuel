'use client';

import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';

interface ComparisonTableProps {
  stations: FuelStation[];
  compareIds: Set<string>;
  onRemove: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function ComparisonTable({ stations, compareIds, onRemove, open, onClose }: ComparisonTableProps) {
  if (!open || compareIds.size === 0) return null;

  const selected = stations.filter(s => compareIds.has(s.id));
  if (selected.length === 0) return null;

  const fuelTypes: Exclude<FuelType, 'EV'>[] = ['E10', 'E5', 'B7', 'SDV'];
  const availableFuels = fuelTypes.filter(f =>
    selected.some(s => s.prices[f] != null)
  );

  const getMin = (fuel: Exclude<FuelType, 'EV'>) => {
    const prices = selected.map(s => s.prices[fuel]).filter((p): p is number => p != null);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            Compare ({selected.length} station{selected.length !== 1 ? 's' : ''})
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">Station</th>
                {availableFuels.map(fuel => (
                  <th key={fuel} className="text-center px-3 py-2 text-xs font-medium" style={{ color: FUEL_COLORS[fuel] }}>
                    {fuel}
                  </th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {selected.map(station => (
                <tr key={station.id} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 sticky left-0 bg-white">
                    <div className="font-semibold text-gray-900 text-sm">{station.brand}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[120px]">{station.postcode}</div>
                  </td>
                  {availableFuels.map(fuel => {
                    const price = station.prices[fuel];
                    const min = getMin(fuel);
                    const isCheapest = price != null && price === min;
                    return (
                      <td key={fuel} className="text-center px-3 py-2.5">
                        {price != null ? (
                          <span className={`font-bold ${isCheapest ? 'text-green-600' : 'text-gray-900'}`}>
                            {price.toFixed(1)}p
                            {isCheapest && selected.length > 1 && (
                              <span className="block text-[10px] text-green-500 font-medium">BEST</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2">
                    <button
                      onClick={() => onRemove(station.id)}
                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
