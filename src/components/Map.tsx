'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import MapGL, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
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
import BrandLogo from './BrandLogo';
import { toTitleCase } from '@/lib/format-text';
import { getBrandLogo } from '@/lib/brand-logos';
import { getStationFreshness, freshnessClasses, freshnessLabel } from '@/lib/freshness';

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
  // Optional planned-route polyline. Coordinates are [lng, lat] tuples
  // as returned by OSRM. When non-null the map draws the line and
  // auto-fits the viewport to the route's bounding box.
  routeGeometry?: [number, number][] | null;
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
  const logo = getBrandLogo(station.brand);

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
        style={{
          transform: isSelected ? 'scale(1.15)' : undefined,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '999px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `2px solid ${color}`,
            boxShadow: isSelected
              ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 12px rgba(0,0,0,0.35)`
              : '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          <img
            src={logo.src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
            }}
          />
        </div>
        {/* Price pill below logo */}
        <div
          style={{
            background: 'white',
            border: `1.5px solid ${color}`,
            borderRadius: '999px',
            padding: '1px 7px',
            fontSize: '11px',
            fontWeight: 700,
            color: color,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            marginTop: '-4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          {displayPrice}p
        </div>
        {/* Pointer triangle */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${color}`,
            marginTop: '-1px',
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
    <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-gray-100">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-blue-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        Google Maps
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-cyan-600 transition-colors"
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
      className={`flex items-center justify-center gap-1 px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
        isFav ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={isFav ? 'Remove from favourites' : 'Add to favourites'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {isFav ? 'Saved' : 'Save'}
    </button>
  );
}

function FuelPopupContent({
  station,
  isFav,
  onToggleFav,
  selectedFuels,
}: {
  station: FuelStation;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  selectedFuels: FuelType[];
}) {
  const fuels = [
    { key: 'E10', label: 'Unleaded' },
    { key: 'E5', label: 'Premium' },
    { key: 'B7', label: 'Diesel' },
    { key: 'SDV', label: 'Super' },
  ] as const;

  // Decide which fuel group to plot in the trend chart based on the
  // user's current filter selection. Petrol-selected → [E10, E5],
  // diesel-selected → [B7, SDV]. If only EV is selected, fall back to
  // whatever fuel the station actually has data for.
  const hasPetrolSelected = selectedFuels.some(f => f === 'E10' || f === 'E5');
  const hasDieselSelected = selectedFuels.some(f => f === 'B7' || f === 'SDV');
  const groupFuels: Exclude<FuelType, 'EV'>[] = hasDieselSelected
    ? ['B7', 'SDV']
    : hasPetrolSelected
      ? ['E10', 'E5']
      : ['E10', 'E5']; // EV-only fallback — show petrol by default
  // Primary fuel to highlight within the group: first selected fuel
  // that's in the same group, otherwise the first of the group.
  const highlightFuel: Exclude<FuelType, 'EV'> =
    (selectedFuels.find(f => groupFuels.includes(f as Exclude<FuelType, 'EV'>)) as Exclude<FuelType, 'EV'> | undefined) ||
    groupFuels[0];
  // The chart will auto-filter fuels with no data, so we just pass
  // the full group and let PriceTrendChart handle empty series.
  const anyFuelHasData = fuels.some(f => station.prices[f.key] != null);
  const freshness = getStationFreshness(station);
  const freshnessStyle = freshnessClasses(freshness.tier);
  const hasAmenities = station.amenities && Object.values(station.amenities).some(Boolean);

  return (
    <div className="w-full sm:w-[560px] sm:max-w-[560px]">
      {/* ─── Header (full-width) ─────────────────────────────── */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0">
          <BrandLogo brand={station.brand} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-black text-sm sm:text-base text-gray-900 leading-tight truncate">{station.brand}</div>
            {station.openingHours && (
              <OpenStatusBadge hours={station.openingHours} variant="badge" />
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 leading-snug">
            {toTitleCase(station.address)}
            {station.postcode && <> · <span className="font-semibold text-gray-700">{station.postcode}</span></>}
          </div>
        </div>
      </div>

      {/* ─── Two-column body on desktop, stacked on mobile ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-3">
        {/* LEFT column — prices + trend chart */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            {fuels
              .filter(f => station.prices[f.key] != null)
              .map(f => {
                const price = station.prices[f.key]!;
                return (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-50 border border-gray-100 rounded-lg"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ring-1 sm:ring-2 ring-white"
                        style={{ backgroundColor: FUEL_COLORS[f.key] }}
                      />
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 truncate">{f.label}</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-black text-gray-900 tabular-nums flex-shrink-0">
                      {price.toFixed(1)}p
                    </span>
                  </div>
                );
              })}
          </div>

          {anyFuelHasData && (
            <>
              {/* Mobile: compact variant of the multi-fuel chart with
                  both fuels in the user's selected group. Desktop:
                  full-size version of the same chart. */}
              <div className="block sm:hidden">
                <PriceTrendChart
                  stationId={station.id}
                  fuels={groupFuels}
                  highlightFuel={highlightFuel}
                  compact
                />
              </div>
              <div className="hidden sm:block">
                <PriceTrendChart
                  stationId={station.id}
                  fuels={groupFuels}
                  highlightFuel={highlightFuel}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT column — hours, amenities, freshness */}
        <div className="space-y-2 sm:space-y-3">
          {station.openingHours && (
            <div>
              <div className="hidden sm:block text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                Opening hours
              </div>
              <OpenStatusBadge hours={station.openingHours} variant="full" />
            </div>
          )}

          {hasAmenities && (
            <div>
              <div className="hidden sm:block text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                Amenities
              </div>
              <StationAmenityIcons amenities={station.amenities!} size="sm" />
            </div>
          )}

          {/* Data freshness badge */}
          <div>
            <div className="hidden sm:block text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
              Data freshness
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold ${freshnessStyle.bg} ${freshnessStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${freshnessStyle.dot}`} />
                {freshnessLabel(freshness.tier)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Actions (full-width) ──────────────────────────── */}
      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
        <div className="flex gap-2">
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
  routeGeometry,
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

  // When a planned route arrives, fit the viewport to its bounding
  // box so the whole trip is visible. Adds extra padding at the
  // bottom so the route doesn't get hidden behind the compact
  // RoutePlanner bottom sheet on mobile.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeometry || routeGeometry.length < 2) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of routeGeometry) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: isMobile
          ? { top: 60, left: 30, right: 30, bottom: Math.round(window.innerHeight * 0.55) }
          : { top: 80, left: 80, right: 80, bottom: 80 },
        duration: 1200,
        maxZoom: 13,
      },
    );
  }, [routeGeometry]);

  // Pan the map so a clicked marker is positioned with enough room above
  // for the popup (which is anchored to the bottom of the marker). The
  // popup is roughly 460px tall when a station has all sections (logo,
  // 4 fuel prices, trend chart, opening hours, amenities, freshness, share
  // and directions). We compute the offset dynamically off the map height
  // so the popup is centered no matter the screen size.
  // Optional targetZoom: when called from a list card click the user may
  // be zoomed way out, so we zoom in to 15 as well.
  const panToMarker = useCallback((lat: number, lng: number, targetZoom?: number) => {
    if (typeof window === 'undefined') return;
    const map = mapRef.current;
    if (!map) return;
    const isMobile = window.innerWidth < 768;
    const mapHeight = map.getContainer().clientHeight || 600;

    let offsetY: number;
    if (isMobile) {
      // Mobile is already working with this constant — leave it alone
      offsetY = 180;
    } else {
      // Place the marker at roughly 78% from the top of the visible map
      // so the popup above it lands centred-ish in the top portion.
      // Clamp so the marker never falls outside the visible area.
      offsetY = Math.min(
        Math.max(mapHeight * 0.28, 180),
        mapHeight / 2 - 60,
      );
    }

    map.flyTo({
      center: [lng, lat],
      offset: [0, offsetY],
      duration: 600,
      ...(targetZoom != null ? { zoom: targetZoom } : {}),
    });
  }, []);

  // Watch the external `selectedStation` prop. When it changes (e.g. the
  // user clicked a station card in the sidebar list), find the matching
  // station/charger, open its popup AND fly the map there with the same
  // smart offset that marker clicks use, so the popup is properly centred.
  useEffect(() => {
    if (!selectedStation) {
      // Don't auto-close the popup here — closing happens via the
      // popup's onClose callback so we don't fight the user.
      return;
    }
    // Already showing this one? Skip — the original click already panned.
    if (popupStation?.id === selectedStation || popupCharger?.id === selectedStation) return;

    const matchingStation = stations.find(s => s.id === selectedStation);
    if (matchingStation) {
      setPopupCharger(null);
      setPopupStation(matchingStation);
      panToMarker(matchingStation.latitude, matchingStation.longitude, 15);
      return;
    }
    const matchingCharger = evChargers.find(c => c.id === selectedStation);
    if (matchingCharger) {
      setPopupStation(null);
      setPopupCharger(matchingCharger);
      panToMarker(matchingCharger.latitude, matchingCharger.longitude, 15);
    }
  }, [selectedStation, stations, evChargers, popupStation, popupCharger, panToMarker]);

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

      {/* Planned-route polyline — glowing emerald trail from start to end.
          Rendered as two stacked line layers: a soft outer halo and a
          solid inner line, so it stays readable over any map style. */}
      {routeGeometry && routeGeometry.length >= 2 && (
        <Source
          id="planned-route"
          type="geojson"
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeGeometry,
            },
          }}
        >
          <Layer
            id="planned-route-halo"
            type="line"
            paint={{
              'line-color': '#ffffff',
              'line-width': 10,
              'line-opacity': 0.6,
              'line-blur': 2,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          <Layer
            id="planned-route-line"
            type="line"
            paint={{
              'line-color': '#059669',
              'line-width': 5,
              'line-opacity': 0.95,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>
      )}

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
          <FuelPopupContent
            station={popupStation}
            isFav={isFavourite(popupStation.id)}
            onToggleFav={onToggleFavourite}
            selectedFuels={selectedFuels}
          />
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
