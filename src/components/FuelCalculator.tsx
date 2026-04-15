'use client';

import { useState } from 'react';
import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';
import BrandLogo from './BrandLogo';

interface FuelCalculatorProps {
  stations: FuelStation[];
  selectedFuels: FuelType[];
  open: boolean;
  onClose: () => void;
}

export default function FuelCalculator({ stations, selectedFuels, open, onClose }: FuelCalculatorProps) {
  const [litres, setLitres] = useState<number>(40);

  if (!open) return null;

  const fuelTypes = selectedFuels.filter(f => f !== 'EV') as Exclude<FuelType, 'EV'>[];
  const primaryFuel = fuelTypes[0];

  const results = primaryFuel
    ? stations
        .filter(s => s.prices[primaryFuel] != null)
        .map(s => ({
          station: s,
          fuel: primaryFuel,
          price: s.prices[primaryFuel]!,
          cost: (s.prices[primaryFuel]! / 100) * litres,
        }))
        .sort((a, b) => a.cost - b.cost)
        .slice(0, 10)
    : [];

  const cheapestCost = results.length > 0 ? results[0].cost : 0;
  const mostExpensiveCost = results.length > 0 ? results[results.length - 1].cost : 0;
  const savings = mostExpensiveCost - cheapestCost;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:w-[460px] h-[85vh] md:h-auto md:max-h-[88vh] md:rounded-[28px] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">

        {/* ─── Premium gradient header ──────────────────────────────── */}
        <div className="relative flex-shrink-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white px-5 pt-5 pb-5 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="10" y2="10" />
                  <line x1="13" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="13" y1="14" x2="16" y2="14" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight truncate">Fuel Cost Calculator</h2>
                <p className="text-[11px] text-emerald-100/90 font-medium truncate">
                  {results.length > 0
                    ? `${results.length} nearby stations`
                    : 'Enter litres to see costs'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 ring-1 ring-white/20 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Live cheapest / potential savings */}
          {results.length > 0 && (
            <div className="relative mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">Cheapest</div>
                <div className="text-lg font-black tabular-nums mt-0.5">£{cheapestCost.toFixed(2)}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">You save</div>
                <div className="text-lg font-black tabular-nums mt-0.5">£{savings.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">
          <div className="p-5 space-y-4">
            {/* ─── Litres-needed slider ────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Litres needed
                </label>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-700 tabular-nums leading-none">
                    {litres}
                  </span>
                  <span className="text-sm font-bold text-gray-500">L</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={litres}
                onChange={e => setLitres(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1">
                <span>1L</span>
                <span>50L</span>
                <span>100L</span>
              </div>
            </div>

            {primaryFuel && (
              <div className="text-[11px] text-gray-500 text-center">
                Showing prices for <span className="font-bold text-gray-700">{FUEL_LABELS[primaryFuel]}</span>. Change the fuel type in the top filter to compare another fuel.
              </div>
            )}

            {/* ─── Results ────────────────────────────────────────── */}
            {results.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                  Cheapest nearby
                </div>
                {results.map((r, i) => {
                  const diffVsCheapest = r.cost - cheapestCost;
                  const isCheapest = i === 0;
                  return (
                    <div
                      key={`${r.station.id}-${r.fuel}`}
                      className={`relative bg-white border rounded-2xl p-3 shadow-sm overflow-hidden ${
                        isCheapest
                          ? 'border-emerald-300 ring-2 ring-emerald-100'
                          : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: FUEL_COLORS[r.fuel] }}
                      />
                      <div className="pl-2 flex items-center gap-3">
                        <div
                          className={`flex-shrink-0 ${
                            isCheapest ? 'ring-2 ring-emerald-300 ring-offset-2 rounded-full' : ''
                          }`}
                        >
                          <BrandLogo brand={r.station.brand} size={34} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {isCheapest && (
                              <span className="text-[9px] uppercase tracking-widest text-emerald-700 font-black">
                                🏆 Best
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-black text-gray-900 truncate">
                            {r.station.brand}
                          </div>
                          <div className="text-[11px] text-gray-500 tabular-nums">
                            {r.price.toFixed(1)}p/L × {litres}L
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-lg font-black tabular-nums leading-none ${
                              isCheapest ? 'text-emerald-700' : 'text-gray-900'
                            }`}
                          >
                            £{r.cost.toFixed(2)}
                          </div>
                          {diffVsCheapest > 0 && (
                            <div className="text-[10px] font-bold text-red-500 mt-1">
                              +£{diffVsCheapest.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-6">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-3 ring-1 ring-emerald-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8m-4-4h8" />
                  </svg>
                </div>
                <div className="text-sm font-black text-gray-900 mb-1">No stations yet</div>
                <div className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                  Search a location or tap <span className="font-semibold">My Location</span> to see costs at nearby stations.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
