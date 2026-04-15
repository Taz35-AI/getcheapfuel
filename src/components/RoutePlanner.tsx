'use client';

import { useState, useCallback } from 'react';
import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';
import { apiUrl } from '@/lib/api';

interface RoutePlannerProps {
  stations: FuelStation[];
  selectedFuels: FuelType[];
  open: boolean;
  onClose: () => void;
  onStationClick: (station: FuelStation) => void;
  // Emit the OSRM route polyline (array of [lng, lat] pairs) up to the
  // host so the map can draw it. Pass null to clear the line.
  onRouteGeometry?: (coords: [number, number][] | null) => void;
  // Emit the top N stations that were found along the planned route
  // so the host can merge them into the map's visible markers. These
  // are usually outside the user's current-location radius, so they
  // wouldn't otherwise show up as pins.
  onRouteStations?: (stations: FuelStation[] | null) => void;
}

interface RouteResult {
  distance: number; // km
  duration: number; // minutes
  stationsOnRoute: (FuelStation & { routeDistance: number })[];
}

async function geocode(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(query)}`));
    const data = await res.json();
    if (data.results?.length > 0) {
      return { lat: data.results[0].lat, lng: data.results[0].lng, name: data.results[0].name };
    }
  } catch {}
  return null;
}

function isNearRoute(
  stationLat: number,
  stationLng: number,
  routeCoords: [number, number][],
  maxDistKm: number
): { near: boolean; closestDist: number } {
  let minDist = Infinity;
  // Sample every 5th coordinate for performance
  for (let i = 0; i < routeCoords.length; i += 5) {
    const [lng, lat] = routeCoords[i];
    const d = haversine(stationLat, stationLng, lat, lng);
    if (d < minDist) minDist = d;
    if (d < maxDistKm) return { near: true, closestDist: minDist };
  }
  return { near: minDist < maxDistKm, closestDist: minDist };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RoutePlanner({ stations, selectedFuels, open, onClose, onStationClick, onRouteGeometry, onRouteStations }: RoutePlannerProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState('');
  const [detourRadius, setDetourRadius] = useState(2); // km off route

  const primaryFuel = selectedFuels.find(f => f !== 'EV') as Exclude<FuelType, 'EV'> | undefined;

  const planRoute = useCallback(async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const [fromGeo, toGeo] = await Promise.all([geocode(from), geocode(to)]);
      if (!fromGeo) { setError('Could not find start location'); setLoading(false); return; }
      if (!toGeo) { setError('Could not find destination'); setLoading(false); return; }

      // Get route from OSRM
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromGeo.lng},${fromGeo.lat};${toGeo.lng},${toGeo.lat}?overview=full&geometries=geojson`
      );
      const routeData = await routeRes.json();

      if (!routeData.routes?.length) {
        setError('No route found');
        setLoading(false);
        return;
      }

      const route = routeData.routes[0];
      const coords: [number, number][] = route.geometry.coordinates;
      const distanceKm = route.distance / 1000;
      const durationMin = route.duration / 60;

      // Push the polyline up to the host immediately so the map can
      // draw it and fit the viewport while we're still computing the
      // nearby-stations list below.
      onRouteGeometry?.(coords);

      // Fetch stations along the route corridor
      const midLat = (fromGeo.lat + toGeo.lat) / 2;
      const midLng = (fromGeo.lng + toGeo.lng) / 2;
      const searchRadius = Math.ceil(distanceKm / 2) + 10;

      const stationsRes = await fetch(apiUrl(`/api/fuel-prices?lat=${midLat}&lng=${midLng}&radius=${searchRadius}`));
      const stationsData = await stationsRes.json();
      const allStations: FuelStation[] = stationsData.stations || [];

      // Filter stations near the route
      const nearbyStations = allStations
        .map(s => {
          const { near, closestDist } = isNearRoute(s.latitude, s.longitude, coords, detourRadius);
          return near ? { ...s, routeDistance: closestDist } : null;
        })
        .filter((s): s is FuelStation & { routeDistance: number } => s !== null)
        .sort((a, b) => {
          if (primaryFuel) {
            return (a.prices[primaryFuel] ?? 999) - (b.prices[primaryFuel] ?? 999);
          }
          return a.routeDistance - b.routeDistance;
        })
        .slice(0, 10);

      setResult({
        distance: distanceKm,
        duration: durationMin,
        stationsOnRoute: nearbyStations,
      });

      // Push the route stations up so the host can merge them into the
      // map's visible markers. The cheapest-sorted top 10 is enough to
      // light up the whole corridor without cluttering the map.
      onRouteStations?.(nearbyStations);
    } catch {
      setError('Failed to plan route. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [from, to, detourRadius, primaryFuel, onRouteGeometry, onRouteStations]);

  if (!open) return null;

  // Once a route has been planned, shrink the modal so the map
  // (with the freshly drawn trail) is visible behind/above it.
  // Mobile → bottom sheet at 55vh. Desktop → side-docked panel.
  const compact = result !== null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex justify-center ${
        compact
          ? 'items-end md:items-stretch md:justify-start md:p-6 pointer-events-none'
          : 'items-end md:items-center p-0 md:p-6'
      }`}
    >
      {!compact && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      )}
      <div
        className={`relative bg-white shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 pointer-events-auto transition-all duration-500 ${
          compact
            ? 'w-full md:w-[440px] h-[55vh] md:h-full md:max-h-[calc(100vh-3rem)] rounded-t-[28px] md:rounded-[28px]'
            : 'w-full md:w-[460px] h-[94vh] md:h-auto md:max-h-[90vh] rounded-t-[28px] md:rounded-[28px]'
        }`}
      >

        {/* ─── Premium gradient header ──────────────────────────────── */}
        <div className="relative flex-shrink-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white px-5 pt-5 pb-5 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/route.svg" alt="" className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight truncate">Route Planner</h2>
                <p className="text-[11px] text-emerald-100/90 font-medium truncate">
                  Find the cheapest fuel along your journey
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

          {/* Route summary shown inside header once planned */}
          {result && (
            <div className="relative mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">Distance</div>
                <div className="text-base font-black tabular-nums mt-0.5">{result.distance.toFixed(0)} km</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">Drive time</div>
                <div className="text-base font-black tabular-nums mt-0.5">
                  {result.duration >= 60
                    ? `${Math.floor(result.duration / 60)}h ${Math.round(result.duration % 60)}m`
                    : `${Math.round(result.duration)}m`}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm ring-1 ring-white/15 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-emerald-100/80 font-bold">Stations</div>
                <div className="text-base font-black tabular-nums mt-0.5">{result.stationsOnRoute.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">
          <div className="p-5 space-y-4">

            {/* Inputs */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Start point
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                </div>
                <input
                  type="text"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  placeholder="City, town or postcode"
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Destination
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100" />
                </div>
                <input
                  type="text"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="City, town or postcode"
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Max detour off route
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map(km => {
                  const active = detourRadius === km;
                  return (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setDetourRadius(km)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-600/25'
                          : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {km} km
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={planRoute}
              disabled={loading || !from || !to}
              className="w-full py-4 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 active:from-emerald-800 active:to-green-900 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-600/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Planning route…
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/route.svg" alt="" className="w-4 h-4 brightness-0 invert" aria-hidden="true" />
                  Find Cheapest Fuel on Route
                </>
              )}
            </button>

            {error && (
              <div className="flex items-center gap-2.5 text-[12px] font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="pt-2">
                {/* Journey cost — uses the cheapest primary-fuel price
                    on the route and the user's real-world MPG (written
                    by the Fuel Tracker) if available, otherwise a
                    sensible default per fuel type. */}
                {primaryFuel && result.stationsOnRoute.length > 0 && (() => {
                  const cheapestOnRoute = result.stationsOnRoute.find(
                    s => s.prices[primaryFuel] != null,
                  );
                  if (!cheapestOnRoute) return null;
                  const ppl = cheapestOnRoute.prices[primaryFuel]!; // pence/L
                  // Miles = km × 0.621371
                  const miles = result.distance * 0.621371;
                  // User's saved MPG, or a reasonable default
                  const savedMpg = typeof window !== 'undefined'
                    ? Number(localStorage.getItem('gcf-user-mpg') || 0)
                    : 0;
                  const isDiesel = primaryFuel === 'B7' || primaryFuel === 'SDV';
                  const defaultMpg = isDiesel ? 50 : 45;
                  const mpg = savedMpg > 10 && savedMpg < 150 ? savedMpg : defaultMpg;
                  const usingSaved = savedMpg > 10 && savedMpg < 150;
                  // Litres needed = miles / mpg × 4.546
                  const litresNeeded = (miles / mpg) * 4.546;
                  // Cost in £ = litres × (pence / 100)
                  const costGBP = litresNeeded * (ppl / 100);

                  return (
                    <div className="mb-3 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-green-700 text-white rounded-2xl p-4 shadow-lg shadow-emerald-600/20">
                      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                      <div className="relative flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/90">
                            Journey cost
                          </div>
                          <div className="text-3xl font-black tabular-nums leading-none mt-1">
                            ~£{costGBP.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-100/90 mt-1 font-medium">
                            {litresNeeded.toFixed(1)}L · at {ppl.toFixed(1)}p/L {usingSaved ? `· your ${mpg.toFixed(1)} MPG` : `· est. ${mpg} MPG`}
                          </div>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                      </div>
                      {!usingSaved && (
                        <div className="relative mt-2 text-[9px] text-emerald-100/80">
                          💡 Log your fill-ups with odometer in the Fuel Tracker for personalised estimates
                        </div>
                      )}
                    </div>
                  );
                })()}
                {result.stationsOnRoute.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Cheapest on route
                      </div>
                      {primaryFuel && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FUEL_COLORS[primaryFuel] }} />
                          {FUEL_LABELS[primaryFuel]}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {result.stationsOnRoute.map((station, i) => {
                        const color = primaryFuel ? FUEL_COLORS[primaryFuel] : '#6b7280';
                        const cheapest = i === 0;
                        return (
                          <button
                            key={station.id}
                            onClick={() => onStationClick(station)}
                            className={`relative w-full bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left overflow-hidden group ${
                              cheapest ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1"
                              style={{ backgroundColor: color }}
                            />
                            <div className="pl-2 flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                    cheapest ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {i + 1}
                                  </span>
                                  {cheapest && (
                                    <span className="text-[9px] uppercase tracking-widest text-emerald-700 font-black">
                                      Cheapest
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-black text-gray-900 truncate">{station.brand}</div>
                                <div className="text-[11px] text-gray-500 truncate mt-0.5">{station.address}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                                  {station.routeDistance.toFixed(1)} km off route
                                </div>
                              </div>
                              {primaryFuel && station.prices[primaryFuel] != null && (
                                <div className="flex-shrink-0 text-right">
                                  <div className="text-lg font-black tabular-nums leading-none" style={{ color }}>
                                    {station.prices[primaryFuel]!.toFixed(1)}<span className="text-xs">p</span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mt-1">per litre</div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 px-6">
                    <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-3 ring-1 ring-emerald-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/route.svg" alt="" className="w-6 h-6 opacity-60" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-black text-gray-900 mb-1">No stations on route</div>
                    <div className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                      Try increasing the max detour distance.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty-state prompt when nothing planned yet */}
            {!result && !error && !loading && (
              <div className="text-center py-6 px-4">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-3 ring-1 ring-emerald-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/route.svg" alt="" className="w-7 h-7 opacity-70" aria-hidden="true" />
                </div>
                <div className="text-[11px] text-gray-500 max-w-[260px] mx-auto leading-relaxed">
                  Enter your start and destination, then we'll find the cheapest stations along the way.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
