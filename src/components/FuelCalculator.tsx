'use client';

import { useState } from 'react';
import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';

interface FuelCalculatorProps {
  stations: FuelStation[];
  selectedFuels: FuelType[];
  open: boolean;
  onClose: () => void;
}

export default function FuelCalculator({ stations, selectedFuels, open, onClose }: FuelCalculatorProps) {
  const [tankSize, setTankSize] = useState(50);
  const [currentLevel, setCurrentLevel] = useState(25);

  if (!open) return null;

  const litresNeeded = tankSize - currentLevel;
  const fuelTypes = selectedFuels.filter(f => f !== 'EV') as Exclude<FuelType, 'EV'>[];

  const results = fuelTypes.flatMap(fuel =>
    stations
      .filter(s => s.prices[fuel] != null)
      .map(s => ({
        station: s,
        fuel,
        price: s.prices[fuel]!,
        cost: (s.prices[fuel]! / 100) * litresNeeded,
      }))
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 5)
  );

  const cheapestCost = results.length > 0 ? Math.min(...results.map(r => r.cost)) : 0;
  const mostExpensiveCost = results.length > 0 ? Math.max(...results.map(r => r.cost)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Fuel Cost Calculator</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
          {/* Inputs */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="text-sm font-medium text-gray-700">Tank size (litres)</label>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={tankSize}
                onChange={e => setTankSize(Number(e.target.value))}
                className="w-full mt-1 accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>20L</span>
                <span className="font-bold text-green-600 text-sm">{tankSize}L</span>
                <span>100L</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Current fuel level (litres)</label>
              <input
                type="range"
                min={0}
                max={tankSize}
                step={1}
                value={Math.min(currentLevel, tankSize)}
                onChange={e => setCurrentLevel(Number(e.target.value))}
                className="w-full mt-1 accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Empty</span>
                <span className="font-bold text-green-600 text-sm">{Math.min(currentLevel, tankSize)}L</span>
                <span>Full</span>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xs text-green-600 font-medium">You need</div>
              <div className="text-2xl font-bold text-green-700">{litresNeeded}L</div>
              {results.length > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  From <span className="font-bold">&pound;{cheapestCost.toFixed(2)}</span>
                  {mostExpensiveCost !== cheapestCost && (
                    <> to <span className="font-bold">&pound;{mostExpensiveCost.toFixed(2)}</span></>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fill-up costs</div>
              {results.map((r, i) => {
                const savings = r.cost - cheapestCost;
                return (
                  <div key={`${r.station.id}-${r.fuel}`} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <div className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</div>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: FUEL_COLORS[r.fuel] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{r.station.brand}</div>
                      <div className="text-xs text-gray-500">{FUEL_LABELS[r.fuel]} — {r.price.toFixed(1)}p/L</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">&pound;{r.cost.toFixed(2)}</div>
                      {savings > 0 && (
                        <div className="text-xs text-red-500">+&pound;{savings.toFixed(2)}</div>
                      )}
                      {savings === 0 && i === 0 && (
                        <div className="text-xs text-green-600 font-medium">Best</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 py-6">
              Search for a location to see fill-up costs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
