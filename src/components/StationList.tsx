'use client';

import type { FuelStation, EVCharger, FuelType } from '@/lib/types';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';
import PriceSparkline from './PriceSparkline';
import OpenStatusBadge from './OpenStatusBadge';
import StationAmenityIcons from './StationAmenityIcons';
import BrandLogo from './BrandLogo';
import { toTitleCase } from '@/lib/format-text';

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
  /** Click a card → focus the map and open its popup. */
  onStationClick?: (station: FuelStation) => void;
  onChargerClick?: (charger: EVCharger) => void;
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

const FUEL_ORDER: Exclude<FuelType, 'EV'>[] = ['E10', 'E5', 'B7', 'SDV'];

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
  onStationClick,
  onChargerClick,
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

  // Cheapest price for the primary fuel - used to mark the #1 card when
  // sorted by price, and to show "save X.Xp vs worst" deltas.
  const primaryPrices = primaryFuel
    ? sortedStations
        .map(s => s.prices[primaryFuel])
        .filter((p): p is number => p != null)
    : [];
  const cheapestPrice = primaryPrices.length > 0 ? Math.min(...primaryPrices) : null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">

      {/* ─── Premium header with segmented sort control ──────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              {showFavouritesOnly ? 'Your favourites' : 'Nearby stations'}
            </div>
            <div className="text-sm font-black text-gray-900 mt-0.5">
              {showFuel && `${filteredStations.length} station${filteredStations.length === 1 ? '' : 's'}`}
              {showFuel && showEV && ' · '}
              {showEV && `${filteredChargers.length} charger${filteredChargers.length === 1 ? '' : 's'}`}
              {!showFuel && !showEV && 'No filter'}
            </div>
          </div>

          {/* Segmented sort toggle */}
          <div className="flex-shrink-0 relative flex bg-gray-100 rounded-full p-0.5 text-[11px] font-bold">
            <button
              onClick={() => onSortChange('distance')}
              className={`relative z-10 px-3 py-1.5 rounded-full transition-colors ${
                sortBy === 'distance'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nearest
            </button>
            <button
              onClick={() => onSortChange('price')}
              className={`relative z-10 px-3 py-1.5 rounded-full transition-colors ${
                sortBy === 'price'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cheapest
            </button>
          </div>
        </div>
      </div>

      {/* ─── Scrollable list ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" data-sheet-scroll>
        {showFuel && sortedStations.map((station, index) => {
          const dist = userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude)
            : null;
          const fav = isFavourite(station.id);
          const compared = compareIds.has(station.id);
          const primaryPrice = primaryFuel ? station.prices[primaryFuel] : null;
          const isCheapest =
            sortBy === 'price' && primaryFuel && primaryPrice != null && primaryPrice === cheapestPrice;
          const rankBadge = sortBy === 'price' ? index + 1 : null;
          return (
            <div
              key={station.id}
              onClick={() => onStationClick?.(station)}
              role={onStationClick ? 'button' : undefined}
              tabIndex={onStationClick ? 0 : undefined}
              className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden ${
                onStationClick ? 'cursor-pointer' : ''
              } ${
                isCheapest
                  ? 'border-2 border-emerald-300 ring-2 ring-emerald-100'
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Cheapest ribbon */}
              {isCheapest && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl shadow-md">
                  🏆 Cheapest
                </div>
              )}

              <div className="p-4">
                {/* Top row: logo, name, actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {rankBadge && !isCheapest && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-black">
                        {rankBadge}
                      </div>
                    )}
                    <div
                      className={`flex-shrink-0 ${
                        isCheapest ? 'ring-2 ring-emerald-300 ring-offset-2 rounded-full' : ''
                      }`}
                    >
                      <BrandLogo brand={station.brand} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">
                        {station.brand}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {toTitleCase(station.address)}
                      </div>
                      {/* Chips row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {dist != null && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 tabular-nums">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {(dist * 0.6214).toFixed(1)} mi
                          </span>
                        )}
                        {station.openingHours && (
                          <OpenStatusBadge hours={station.openingHours} variant="badge" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavourite(station.id); }}
                      className={`p-2 rounded-xl transition-colors ${
                        fav ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      title={fav ? 'Remove favourite' : 'Add favourite'}
                      aria-label={fav ? 'Remove favourite' : 'Add favourite'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={fav ? '#ef4444' : 'none'} stroke={fav ? '#ef4444' : '#9ca3af'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleCompare(station.id); }}
                      className={`p-2 rounded-xl transition-colors ${
                        compared ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      title={compared ? 'Remove from compare' : 'Add to compare'}
                      aria-label={compared ? 'Remove from compare' : 'Add to compare'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={compared ? '#059669' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Price grid */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {FUEL_ORDER.map(fuel => {
                    const price = station.prices[fuel];
                    if (price == null) return null;
                    const isPrimary = fuel === primaryFuel;
                    return (
                      <div
                        key={fuel}
                        className={`relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-all ${
                          isPrimary
                            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white"
                            style={{ backgroundColor: FUEL_COLORS[fuel] }}
                          />
                          <span className={`text-[10px] font-bold truncate ${isPrimary ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {FUEL_LABELS[fuel].replace(/ \(.*\)/, '')}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-black tabular-nums flex-shrink-0 ${
                            isPrimary ? 'text-emerald-700' : 'text-gray-800'
                          }`}
                        >
                          {price.toFixed(1)}p
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Amenities row (if any) */}
                {station.amenities && Object.values(station.amenities).some(Boolean) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <StationAmenityIcons amenities={station.amenities} size="sm" />
                  </div>
                )}

                {/* Compact sparkline - single-line trend for the user's
                    primary selected fuel. Full multi-fuel chart with
                    grid, labels and legend lives in the map popup
                    (click a pin) so the list stays snappy. */}
                {primaryFuel && station.prices[primaryFuel] != null && (
                  <PriceSparkline
                    stationId={station.id}
                    fuel={primaryFuel}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* ─── EV Charger cards ──────────────────────────────────── */}
        {showEV && filteredChargers.map(charger => {
          const dist = userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, charger.latitude, charger.longitude)
            : null;
          const maxPower = Math.max(...charger.connections.map(c => c.powerKW), 0);
          const operatorName = charger.operator !== 'Unknown' ? charger.operator : null;
          const speedLabel = maxPower >= 50 ? 'Rapid' : maxPower >= 22 ? 'Fast' : maxPower >= 7 ? 'Standard' : null;
          const speedChipClass =
            maxPower >= 50
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
              : maxPower >= 22
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700';
          const fav = isFavourite(charger.id);
          return (
            <div
              key={charger.id}
              onClick={() => onChargerClick?.(charger)}
              role={onChargerClick ? 'button' : undefined}
              tabIndex={onChargerClick ? 0 : undefined}
              className={`bg-white border border-gray-200 hover:border-purple-300 rounded-2xl shadow-sm hover:shadow-md p-4 transition-all ${
                onChargerClick ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-2 ring-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${FUEL_COLORS.EV}, #6d28d9)`,
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-gray-900 truncate">{charger.title}</div>
                    {operatorName && (
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">by {operatorName}</div>
                    )}
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">
                      {charger.address}{charger.postcode ? `, ${charger.postcode}` : ''}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {dist != null && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 tabular-nums">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {(dist * 0.6214).toFixed(1)} mi
                        </span>
                      )}
                      {speedLabel && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${speedChipClass}`}>
                          {speedLabel}
                        </span>
                      )}
                      {maxPower > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 tabular-nums">
                          {maxPower}kW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavourite(charger.id); }}
                  className={`flex-shrink-0 p-2 rounded-xl transition-colors ${
                    fav ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  title={fav ? 'Remove favourite' : 'Add favourite'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={fav ? '#ef4444' : 'none'} stroke={fav ? '#ef4444' : '#9ca3af'} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
              </div>

              {/* Connectors */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {charger.connections.map((conn, i) => {
                  const connLabel = conn.type !== 'Unknown' ? conn.type : 'Connector';
                  const qty = conn.quantity > 1 ? ` ×${conn.quantity}` : '';
                  return (
                    <span
                      key={i}
                      className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100"
                    >
                      {connLabel}{conn.powerKW > 0 ? ` ${conn.powerKW}kW` : ''}{qty}
                    </span>
                  );
                })}
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                {charger.usageCost ? (
                  <div className="text-[11px] text-green-600 font-bold">{charger.usageCost}</div>
                ) : (
                  <div className="text-[11px] text-gray-400 italic">Check operator app</div>
                )}
                {!charger.isOperational && (
                  <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                    Unavailable
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ─── Empty state ──────────────────────────────────────── */}
        {stations.length === 0 && evChargers.length === 0 && (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-4 ring-1 ring-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="text-sm font-black text-gray-900 mb-1">Search a location</div>
            <div className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
              Use the search bar above or tap <span className="font-bold text-emerald-700">My Location</span> to find nearby fuel stations.
            </div>
          </div>
        )}

        {/* Empty-after-filter state */}
        {(stations.length > 0 || evChargers.length > 0) &&
          filteredStations.length === 0 &&
          filteredChargers.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center mb-3 ring-1 ring-red-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <div className="text-sm font-black text-gray-900 mb-1">No favourites yet</div>
              <div className="text-[11px] text-gray-500 max-w-[220px] mx-auto leading-relaxed">
                Tap the heart on any station to save it to your favourites.
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
