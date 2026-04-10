'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import MapGL, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FuelStation, EVCharger, FuelType } from '@/lib/types';
import { FUEL_COLORS } from '@/lib/types';
import ShareButton from './ShareButton';
import PriceTrendChart from './PriceTrendChart';
import OpenStatusBadge from './OpenStatusBadge';
import StationAmenityIcons from './StationAmenityIcons';
import { formatUKDateTime } from '@/lib/format-date';
import { toTitleCase } from '@/lib/format-text';

// Free vector tile styles from OpenFreeMap - no API key needed
const MAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
} as const;

interface MapProps {
  center: [number, number];
  zoom: number;
  stations: FuelStation[];
  evChargers: EVCharger[];
  selectedFuels: FuelType[];
  onMapMove?: (center: { lat: number; lng: number }) => void;
  selectedStation: string | null;
  onSelectStation: (id: string | null) => void;
  mapStyle: keyof typeof MAP_STYLES;
  isFavourite: (id: string) => boolean;
  onToggleFavourite: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

function getPriceColor(price: number | null | undefined): string {
  if (!price) return '#6b7280';
  // Normalize across typical UK range (125-170p)
  const ratio = Math.max(0, Math.min(1, (price - 125) / (170 - 125)));
  // Green -> Yellow -> Red
  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = Math.round(34 + t * (234 - 34));
    const g = Math.round(197 - t * (197 - 179));
    return `rgb(${r},${g},63)`;
  }
  const t = (ratio - 0.5) * 2;
  const r = Math.round(234 + t * (239 - 234));
  const g = Math.round(179 - t * (179 - 68));
  return `rgb(${r},${g},${Math.round(63 - t * 63)})`;
}

function FuelMarker({
  station,
  selectedFuels,
  isSelected,
  onClick,
}: {
  station: FuelStation;
  selectedFuels: FuelType[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const fuelType = selectedFuels.find(
    f => f !== 'EV' && station.prices[f as keyof typeof station.prices]
  ) || 'E10';
  const price = station.prices[fuelType as keyof typeof station.prices];
  const color = getPriceColor(price);
  const displayPrice = price ? `${price.toFixed(1)}` : '?';

  return (
    <Marker
      longitude={station.longitude}
      latitude={station.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        className="cursor-pointer transition-transform hover:scale-110"
        style={{ transform: isSelected ? 'scale(1.2)' : undefined }}
      >
        <div
          style={{
            background: color,
            color: 'white',
            borderRadius: '10px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: isSelected
              ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 12px rgba(0,0,0,0.4)`
              : '0 2px 8px rgba(0,0,0,0.3)',
            textAlign: 'center',
            lineHeight: 1.3,
            border: '2px solid rgba(255,255,255,0.8)',
          }}
        >
          <div style={{ fontSize: '9px', opacity: 0.9, letterSpacing: '0.3px' }}>
            {station.brand}
          </div>
          {displayPrice}p
        </div>
        {/* Pointer triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${color}`,
            margin: '0 auto',
          }}
        />
      </div>
    </Marker>
  );
}

function EVMarker({
  charger,
  isSelected,
  onClick,
}: {
  charger: EVCharger;
  isSelected: boolean;
  onClick: () => void;
}) {
  const maxPower = Math.max(...charger.connections.map(c => c.powerKW), 0);
  const label = maxPower >= 150 ? 'Ultra' : maxPower >= 50 ? 'Rapid' : maxPower >= 7 ? 'Fast' : 'Slow';

  return (
    <Marker
      longitude={charger.longitude}
      latitude={charger.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        className="cursor-pointer transition-transform hover:scale-110"
        style={{ transform: isSelected ? 'scale(1.2)' : undefined }}
      >
        <div
          style={{
            background: FUEL_COLORS.EV,
            color: 'white',
            borderRadius: '10px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: isSelected
              ? `0 0 0 3px white, 0 0 0 5px ${FUEL_COLORS.EV}, 0 4px 12px rgba(0,0,0,0.4)`
              : '0 2px 8px rgba(0,0,0,0.3)',
            textAlign: 'center',
            lineHeight: 1.3,
            border: '2px solid rgba(255,255,255,0.8)',
          }}
        >
          <div style={{ fontSize: '9px', opacity: 0.9, letterSpacing: '0.3px' }}>
            {(charger.operator !== 'Unknown' ? charger.operator : charger.title).substring(0, 14)}
          </div>
          {label} {maxPower > 0 ? `${maxPower}kW` : ''}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${FUEL_COLORS.EV}`,
            margin: '0 auto',
          }}
        />
      </div>
    </Marker>
  );
}

function DirectionButtons({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${encodeURIComponent(label)}`;

  return (
    <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        Google Maps
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        Waze
      </a>
    </div>
  );
}

function FavouriteButton({ id, isFav, onToggle }: { id: string; isFav: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(id)}
      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isFav ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={isFav ? 'Remove from favourites' : 'Add to favourites'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {isFav ? 'Saved' : 'Save'}
    </button>
  );
}

function FuelPopupContent({ station, isFav, onToggleFav }: { station: FuelStation; isFav: boolean; onToggleFav: (id: string) => void }) {
  const fuels = [
    { key: 'E10', label: 'Unleaded (E10)' },
    { key: 'E5', label: 'Premium (E5)' },
    { key: 'B7', label: 'Diesel (B7)' },
    { key: 'SDV', label: 'Super Diesel' },
  ] as const;

  const chartFuel = fuels.find(f => station.prices[f.key] != null);

  return (
    <div className="min-w-[240px] max-w-[300px]">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-base text-gray-900 leading-tight">{station.brand}</div>
        {station.openingHours && (
          <OpenStatusBadge hours={station.openingHours} variant="badge" />
        )}
      </div>
      <div className="text-[11px] text-gray-500 mt-1 mb-3 leading-snug">
        {toTitleCase(station.address)}
        {station.postcode && <><br />{station.postcode}</>}
      </div>

      <div className="space-y-1.5">
        {fuels
          .filter(f => station.prices[f.key] != null)
          .map(f => {
            const price = station.prices[f.key]!;
            return (
              <div key={f.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: FUEL_COLORS[f.key] }}
                  />
                  <span className="text-sm text-gray-600">{f.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{price.toFixed(1)}p</span>
              </div>
            );
          })}
      </div>

      {chartFuel && (
        <PriceTrendChart
          stationId={station.id}
          fuelType={chartFuel.key}
          color={FUEL_COLORS[chartFuel.key]}
        />
      )}

      {station.openingHours && (
        <div className="mt-3">
          <OpenStatusBadge hours={station.openingHours} variant="full" />
        </div>
      )}

      {station.amenities && Object.values(station.amenities).some(Boolean) && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Amenities</div>
          <StationAmenityIcons amenities={station.amenities} size="md" />
        </div>
      )}

      {station.lastUpdated && (
        <div className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
          Updated: {formatUKDateTime(station.lastUpdated)}
        </div>
      )}
      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
        <FavouriteButton id={station.id} isFav={isFav} onToggle={onToggleFav} />
        <ShareButton
          title={station.brand}
          text={`${station.brand} — ${station.postcode}`}
          lat={station.latitude}
          lng={station.longitude}
        />
      </div>
      <DirectionButtons lat={station.latitude} lng={station.longitude} label={`${station.brand} ${station.postcode}`} />
    </div>
  );
}

function EVPopupContent({ charger, isFav, onToggleFav }: { charger: EVCharger; isFav: boolean; onToggleFav: (id: string) => void }) {
  return (
    <div className="min-w-[220px]">
      <div className="font-bold text-base text-gray-900">{charger.title}</div>
      {charger.operator !== 'Unknown' && (
        <div className="text-sm font-semibold mt-0.5" style={{ color: FUEL_COLORS.EV }}>
          {charger.operator}
        </div>
      )}
      <div className="text-[11px] text-gray-500 mt-0.5 mb-3 leading-snug">
        {toTitleCase(charger.address)}
        {charger.postcode && <><br />{charger.postcode}</>}
      </div>
      <div className="space-y-1">
        {charger.connections.map((conn, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{conn.type !== 'Unknown' ? conn.type : 'Connector'}</span>
            <div className="flex items-center gap-2">
              {conn.powerKW > 0 && <span className="font-bold text-gray-900">{conn.powerKW}kW</span>}
              {conn.quantity > 1 && <span className="text-gray-400">x{conn.quantity}</span>}
            </div>
          </div>
        ))}
      </div>
      {charger.usageCost ? (
        <div className="text-xs text-green-600 font-medium mt-2">
          {charger.usageCost}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic mt-2">Check operator app for pricing</div>
      )}
      {!charger.isOperational && (
        <div className="text-xs font-medium mt-2 text-red-500">
          Currently unavailable
        </div>
      )}
      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
        <FavouriteButton id={charger.id} isFav={isFav} onToggle={onToggleFav} />
        <ShareButton
          title={charger.title}
          text={`${charger.title}${charger.operator !== 'Unknown' ? ` — ${charger.operator}` : ''}`}
          lat={charger.latitude}
          lng={charger.longitude}
        />
      </div>
      <DirectionButtons lat={charger.latitude} lng={charger.longitude} label={`${charger.title} ${charger.postcode}`} />
    </div>
  );
}

export { MAP_STYLES };

export default function Map({
  center,
  zoom,
  stations,
  evChargers,
  selectedFuels,
  onMapMove,
  selectedStation,
  onSelectStation,
  mapStyle,
  isFavourite,
  onToggleFavourite,
  userLocation,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupStation, setPopupStation] = useState<FuelStation | null>(null);
  const [popupCharger, setPopupCharger] = useState<EVCharger | null>(null);

  const showFuel = selectedFuels.some(f => f !== 'EV');
  const showEV = selectedFuels.includes('EV');

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      onMapMove?.({ lat: e.viewState.latitude, lng: e.viewState.longitude });
    },
    [onMapMove]
  );

  // Fly to center when it changes
  useEffect(() => {
    mapRef.current?.flyTo({
      center: [center[1], center[0]],
      zoom,
      duration: 1500,
    });
  }, [center, zoom]);

  // Pan the map so a clicked marker is positioned with enough room above
  // for the popup (which is anchored to the bottom of the marker).
  // On mobile we need extra room because popups are larger relative to viewport.
  const panToMarker = useCallback((lat: number, lng: number) => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    // Positive Y offset shifts the destination DOWN from screen center,
    // leaving room above for the popup.
    const offsetY = isMobile ? 180 : 120;
    mapRef.current?.flyTo({
      center: [lng, lat],
      offset: [0, offsetY],
      duration: 600,
    });
  }, []);

  const handleStationClick = (station: FuelStation) => {
    onSelectStation(station.id);
    setPopupCharger(null);
    setPopupStation(station);
    panToMarker(station.latitude, station.longitude);
  };

  const handleChargerClick = (charger: EVCharger) => {
    onSelectStation(charger.id);
    setPopupStation(null);
    setPopupCharger(charger);
    panToMarker(charger.latitude, charger.longitude);
  };

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        latitude: center[0],
        longitude: center[1],
        zoom,
        pitch: 0,
        bearing: 0,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLES[mapStyle]}
      onMoveEnd={handleMove}
      onClick={() => {
        setPopupStation(null);
        setPopupCharger(null);
        onSelectStation(null);
      }}
      maxBounds={[
        [-12, 49], // SW corner of UK
        [3, 61],   // NE corner of UK
      ]}
    >
      <NavigationControl position="bottom-right" showCompass visualizePitch />
      <GeolocateControl position="bottom-right" trackUserLocation />

      {userLocation && (
        <Marker
          longitude={userLocation.lng}
          latitude={userLocation.lat}
          anchor="center"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping" />
            <div className="absolute w-6 h-6 rounded-full bg-blue-500/20" />
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
          </div>
        </Marker>
      )}

      {showFuel &&
        stations
          .filter(station =>
            // Only show stations that have a price for at least one selected fuel
            selectedFuels.some(f => f !== 'EV' && station.prices[f as Exclude<FuelType, 'EV'>] != null)
          )
          .map(station => (
            <FuelMarker
              key={station.id}
              station={station}
              selectedFuels={selectedFuels}
              isSelected={selectedStation === station.id}
              onClick={() => handleStationClick(station)}
            />
          ))}

      {showEV &&
        evChargers.map(charger => (
          <EVMarker
            key={charger.id}
            charger={charger}
            isSelected={selectedStation === charger.id}
            onClick={() => handleChargerClick(charger)}
          />
        ))}

      {popupStation && (
        <Popup
          longitude={popupStation.longitude}
          latitude={popupStation.latitude}
          anchor="bottom"
          offset={20}
          closeOnClick={false}
          onClose={() => {
            setPopupStation(null);
            onSelectStation(null);
          }}
          className="fuel-popup"
        >
          <FuelPopupContent station={popupStation} isFav={isFavourite(popupStation.id)} onToggleFav={onToggleFavourite} />
        </Popup>
      )}

      {popupCharger && (
        <Popup
          longitude={popupCharger.longitude}
          latitude={popupCharger.latitude}
          anchor="bottom"
          offset={20}
          closeOnClick={false}
          onClose={() => {
            setPopupCharger(null);
            onSelectStation(null);
          }}
          className="ev-popup"
        >
          <EVPopupContent charger={popupCharger} isFav={isFavourite(popupCharger.id)} onToggleFav={onToggleFavourite} />
        </Popup>
      )}
    </MapGL>
  );
}
