'use client';

import type { FuelStation, EVCharger, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';

interface StationListProps {
  stations: FuelStation[];
  evChargers: EVCharger[];
  selectedFuels: FuelType[];
  sortBy: 'distance' | 'price';
  onSortChange: (sort: 'distance' | 'price') => void;
  userLocation: { lat: number; lng: number } | null;
  isFavourite: (id: string) => boolean;
  onToggleFavourite: (id: string) => void;
  compareIds: Set<string>;
  onToggleCompare: (id: string) => void;
  showFavouritesOnly: boolean;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StationList({
  stations,
  evChargers,
  selectedFuels,
  sortBy,
  onSortChange,
  userLocation,
  isFavourite,
  onToggleFavourite,
  compareIds,
  onToggleCompare,
  showFavouritesOnly,
}: StationListProps) {
  const showFuel = selectedFuels.some(f => f !== 'EV');
  const showEV = selectedFuels.includes('EV');
  const primaryFuel = selectedFuels.find(f => f !== 'EV') as Exclude<FuelType, 'EV'> | undefined;

  const filteredStations = showFavouritesOnly ? stations.filter(s => isFavourite(s.id)) : stations;
  const filteredChargers = showFavouritesOnly ? evChargers.filter(c => isFavourite(c.id)) : evChargers;

  const sortedStations = [...filteredStations].sort((a, b) => {
    if (sortBy === 'price' && primaryFuel) {
      const priceA = a.prices[primaryFuel] ?? 999;
      const priceB = b.prices[primaryFuel] ?? 999;
      return priceA - priceB;
    }
    if (userLocation) {
      const distA = haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-medium text-gray-500">
          {showFuel ? `${filteredStations.length} stations` : ''}
          {showFuel && showEV ? ' + ' : ''}
          {showEV ? `${filteredChargers.length} chargers` : ''}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onSortChange('distance')}
            className={`px-2 py-1 text-xs rounded ${sortBy === 'distance' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            Nearest
          </button>
          <button
            onClick={() => onSortChange('price')}
            className={`px-2 py-1 text-xs rounded ${sortBy === 'price' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            Cheapest
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showFuel && sortedStations.map(station => {
          const dist = userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude)
            : null;
          return (
            <div key={station.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{station.brand}</span>
                    {dist != null && (
                      <span className="text-xs text-gray-400">{dist.toFixed(1)} km</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{station.address}</div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => onToggleFavourite(station.id)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title={isFavourite(station.id) ? 'Remove favourite' : 'Add favourite'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={isFavourite(station.id) ? '#ef4444' : 'none'} stroke={isFavourite(station.id) ? '#ef4444' : '#9ca3af'} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <input
                    type="checkbox"
                    checked={compareIds.has(station.id)}
                    onChange={() => onToggleCompare(station.id)}
                    className="w-3.5 h-3.5 accent-green-600 cursor-pointer"
                    title="Compare"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {(Object.entries(station.prices) as [Exclude<FuelType, 'EV'>, number | null | undefined][])
                  .filter(([, price]) => price != null)
                  .map(([fuel, price]) => (
                    <div key={fuel} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: FUEL_COLORS[fuel] }}
                      />
                      <span className="text-xs text-gray-500">{FUEL_LABELS[fuel]}:</span>
                      <span className="text-xs font-bold text-gray-900">{price!.toFixed(1)}p</span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}

        {showEV && filteredChargers.map(charger => {
          const dist = userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, charger.latitude, charger.longitude)
            : null;
          const maxPower = Math.max(...charger.connections.map(c => c.powerKW), 0);
          const operatorName = charger.operator !== 'Unknown' ? charger.operator : null;
          const speedLabel = maxPower >= 50 ? 'Rapid' : maxPower >= 22 ? 'Fast' : maxPower >= 7 ? 'Standard' : null;
          const speedColor = maxPower >= 50 ? 'bg-green-100 text-green-700' : maxPower >= 22 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';
          return (
            <div key={charger.id} className="px-4 py-3 border-b border-gray-100 hover:bg-purple-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: FUEL_COLORS.EV, color: 'white' }}
                    >
                      EV
                    </span>
                    <span className="font-semibold text-sm text-gray-900">{charger.title}</span>
                    {dist != null && (
                      <span className="text-xs text-gray-400">{dist.toFixed(1)} km</span>
                    )}
                  </div>
                  {operatorName && (
                    <div className="text-xs text-gray-500 mt-0.5">by {operatorName}</div>
                  )}
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {charger.address}{charger.postcode ? `, ${charger.postcode}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: FUEL_COLORS.EV }}>{maxPower > 0 ? `${maxPower}kW` : '—'}</div>
                    {speedLabel && <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${speedColor}`}>{speedLabel}</div>}
                  </div>
                  <button
                    onClick={() => onToggleFavourite(charger.id)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={isFavourite(charger.id) ? '#ef4444' : 'none'} stroke={isFavourite(charger.id) ? '#ef4444' : '#9ca3af'} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {charger.connections.map((conn, i) => {
                  const connLabel = conn.type !== 'Unknown' ? conn.type : 'Connector';
                  const qty = conn.quantity > 1 ? ` x${conn.quantity}` : '';
                  return (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                      {connLabel}{conn.powerKW > 0 ? ` ${conn.powerKW}kW` : ''}{qty}
                    </span>
                  );
                })}
              </div>
              {charger.usageCost ? (
                <div className="text-xs text-green-600 font-medium mt-1">{charger.usageCost}</div>
              ) : (
                <div className="text-xs text-gray-400 italic mt-1">Check operator app for pricing</div>
              )}
              {!charger.isOperational && (
                <div className="text-xs text-red-500 font-medium mt-1">Currently unavailable</div>
              )}
            </div>
          );
        })}

        {stations.length === 0 && evChargers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="text-sm font-medium">Search a location to find stations</div>
            <div className="text-xs mt-1">Or use &quot;My Location&quot; to find nearby fuel</div>
          </div>
        )}
      </div>
    </div>
  );
}
