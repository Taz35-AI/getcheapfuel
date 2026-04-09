'use client';

import { useState, useCallback } from 'react';
import type { FuelStation, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';

interface RoutePlannerProps {
  stations: FuelStation[];
  selectedFuels: FuelType[];
  open: boolean;
  onClose: () => void;
  onStationClick: (station: FuelStation) => void;
}

interface RouteResult {
  distance: number; // km
  duration: number; // minutes
  stationsOnRoute: (FuelStation & { routeDistance: number })[];
}

async function geocode(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
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

export default function RoutePlanner({ stations, selectedFuels, open, onClose, onStationClick }: RoutePlannerProps) {
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

      // Fetch stations along the route corridor
      const midLat = (fromGeo.lat + toGeo.lat) / 2;
      const midLng = (fromGeo.lng + toGeo.lng) / 2;
      const searchRadius = Math.ceil(distanceKm / 2) + 10;

      const stationsRes = await fetch(`/api/fuel-prices?lat=${midLat}&lng=${midLng}&radius=${searchRadius}`);
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
    } catch {
      setError('Failed to plan route. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [from, to, detourRadius, primaryFuel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Route Planner</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
          {/* Inputs */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-green-500" />
              <input
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="From (city, town, postcode)..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-red-500" />
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="To (city, town, postcode)..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 whitespace-nowrap">Max detour:</label>
              <select
                value={detourRadius}
                onChange={e => setDetourRadius(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
              >
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
              </select>
              <button
                onClick={planRoute}
                disabled={loading || !from || !to}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                )}
                Find Stations
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</div>
          )}

          {result && (
            <>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{result.distance.toFixed(0)} km</div>
                  <div className="text-xs text-gray-500">distance</div>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {result.duration >= 60
                      ? `${Math.floor(result.duration / 60)}h ${Math.round(result.duration % 60)}m`
                      : `${Math.round(result.duration)}m`}
                  </div>
                  <div className="text-xs text-gray-500">drive time</div>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{result.stationsOnRoute.length}</div>
                  <div className="text-xs text-gray-500">stations</div>
                </div>
              </div>

              {result.stationsOnRoute.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Cheapest on route {primaryFuel && `(${FUEL_LABELS[primaryFuel]})`}
                  </div>
                  {result.stationsOnRoute.map((station, i) => (
                    <button
                      key={station.id}
                      onClick={() => onStationClick(station)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{station.brand}</div>
                        <div className="text-xs text-gray-500 truncate">{station.address}</div>
                        <div className="text-xs text-gray-400">{station.routeDistance.toFixed(1)} km off route</div>
                      </div>
                      {primaryFuel && station.prices[primaryFuel] != null && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold" style={{ color: FUEL_COLORS[primaryFuel] }}>
                            {station.prices[primaryFuel]!.toFixed(1)}p
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400 py-4">
                  No stations found along this route
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
