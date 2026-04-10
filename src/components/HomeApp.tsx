'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import FuelFilter from '@/components/FuelFilter';
import StationList from '@/components/StationList';
import FuelCalculator from '@/components/FuelCalculator';
import FillUpAdvice from '@/components/FillUpAdvice';
import FuelTracker from '@/components/FuelTracker';
import ComparisonTable from '@/components/ComparisonTable';
import RoutePlanner from '@/components/RoutePlanner';
import InstallPrompt from '@/components/InstallPrompt';
import NotificationManager from '@/components/NotificationManager';
import SettingsMenu from '@/components/SettingsMenu';
import { useFavourites } from '@/hooks/useFavourites';
import Link from 'next/link';
import type { FuelStation, EVCharger, FuelType } from '@/lib/types';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

type MapStyle = 'dark' | 'bright' | 'positron' | 'liberty';

export default function HomeApp() {
  const [center, setCenter] = useState<[number, number]>([54.5, -2]);
  const [zoom, setZoom] = useState(6);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [evChargers, setEvChargers] = useState<EVCharger[]>([]);
  const [selectedFuels, setSelectedFuels] = useState<FuelType[]>(['E10', 'B7']);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [radius, setRadius] = useState(10);
  const [mapStyle, setMapStyle] = useState<MapStyle>('liberty');

  // Feature states
  const { isFavourite, toggle: toggleFavourite } = useFavourites();
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeCompare = useCallback((id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const fetchStations = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true);
    const showFuel = selectedFuels.some(f => f !== 'EV');
    const showEV = selectedFuels.includes('EV');

    try {
      const promises: Promise<void>[] = [];

      if (showFuel) {
        promises.push(
          fetch(`/api/fuel-prices?lat=${lat}&lng=${lng}&radius=${r}`)
            .then(res => res.json())
            .then(data => setStations(data.stations || []))
        );
      } else {
        setStations([]);
      }

      if (showEV) {
        promises.push(
          fetch(`/api/ev-chargers?lat=${lat}&lng=${lng}&radius=${r}`)
            .then(res => res.json())
            .then(data => setEvChargers(data.chargers || []))
        );
      } else {
        setEvChargers([]);
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFuels]);

  const handleLocationSelect = useCallback((lat: number, lng: number, name: string) => {
    setCenter([lat, lng]);
    setZoom(13);
    setUserLocation({ lat, lng });
    setLocationName(name.split(',')[0]);
    fetchStations(lat, lng, radius);
  }, [fetchStations, radius]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenter([latitude, longitude]);
        setZoom(13);
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationName('Your Location');
        fetchStations(latitude, longitude, radius);
        setIsLocating(false);
      },
      () => {
        alert('Unable to get your location. Please search manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchStations, radius]);

  const handleStationClick = useCallback((station: FuelStation) => {
    setCenter([station.latitude, station.longitude]);
    setZoom(15);
    setSelectedStation(station.id);
  }, []);

  // Read URL params (from city pages) and navigate to location
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat') || '');
    const lng = parseFloat(params.get('lng') || '');
    const z = parseInt(params.get('zoom') || '', 10);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter([lat, lng]);
      setZoom(isNaN(z) ? 13 : z);
      setUserLocation({ lat, lng });
      setLocationName(params.get('name') || '');
      fetchStations(lat, lng, radius);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open sidebar by default on desktop
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setSidebarOpen(true);
    }
  }, []);

  // Re-fetch when fuel filters or radius change (if we have a location)
  useEffect(() => {
    if (userLocation) {
      fetchStations(userLocation.lat, userLocation.lng, radius);
    }
  }, [selectedFuels, radius, userLocation, fetchStations]);

  const stationListProps = {
    stations,
    evChargers,
    selectedFuels,
    sortBy,
    onSortChange: setSortBy,
    userLocation,
    isFavourite,
    onToggleFavourite: toggleFavourite,
    compareIds,
    onToggleCompare: toggleCompare,
    showFavouritesOnly,
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="px-3 py-2 md:px-4 md:py-3">
          {/* Mobile: 2 rows | Desktop: single row */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex-shrink-0">
              <h1 className="sr-only">GetCheapFuel - Compare Cheap Petrol, Diesel & EV Charging Prices UK</h1>
              <img
                src="/icons/logo.png"
                alt="GetCheapFuel - UK Fuel & EV Prices"
                className="h-12 md:h-14 w-auto"
              />
            </div>
            <div className="flex-1 min-w-0">
              <SearchBar
                onLocationSelect={handleLocationSelect}
                onUseMyLocation={handleUseMyLocation}
                isLocating={isLocating}
              />
            </div>
            {/* Desktop: tool buttons (sized to match My Location button height) */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFavouritesOnly(!showFavouritesOnly)}
                className={`px-3 py-2.5 rounded-lg transition-colors shadow-sm ${showFavouritesOnly ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="Favourites"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill={showFavouritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
              <button
                onClick={() => setCalcOpen(true)}
                className="px-3 py-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm"
                title="Fuel Calculator"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="10" y2="10" />
                  <line x1="14" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="14" y1="14" x2="16" y2="14" />
                  <line x1="8" y1="18" x2="16" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setRouteOpen(true)}
                className="px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
                title="Route Planner"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </button>
              {compareIds.size > 0 && (
                <button
                  onClick={() => setCompareOpen(true)}
                  className="px-3 py-2.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors shadow-sm relative"
                  title="Compare stations"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {compareIds.size}
                  </span>
                </button>
              )}
              <button
                onClick={() => setTrackerOpen(true)}
                className="px-3 py-2.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors shadow-sm"
                title="Fuel Spending Tracker"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 22V5a2 2 0 012-2h8a2 2 0 012 2v17" />
                  <path d="M15 10h2a2 2 0 012 2v2a2 2 0 002 2h0" />
                  <path d="M21 10V8a2 2 0 00-2-2h-1" />
                  <rect x="6" y="7" width="6" height="5" rx="1" />
                </svg>
              </button>
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as MapStyle)}
                className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm shadow-sm capitalize cursor-pointer"
              >
                {(['dark', 'bright', 'positron', 'liberty'] as MapStyle[]).map(style => (
                  <option key={style} value={style} className="capitalize">{style}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Desktop row 2: Fuel filters + radius */}
          <div className="hidden md:flex items-center gap-3 mt-2">
            <FuelFilter selected={selectedFuels} onChange={setSelectedFuels} />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
            >
              <option value={5}>3 mi</option>
              <option value={10}>6 mi</option>
              <option value={20}>12 mi</option>
              <option value={50}>30 mi</option>
            </select>
          </div>
          {/* Mobile row 2: Fuel filters + radius chip */}
          <div className="flex md:hidden items-center gap-2 mt-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <FuelFilter selected={selectedFuels} onChange={setSelectedFuels} />
            </div>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-shrink-0 text-[11px] border border-gray-300 rounded-full px-2.5 py-1 bg-white text-gray-700 font-medium"
              aria-label="Search radius"
            >
              <option value={5}>3 mi</option>
              <option value={10}>6 mi</option>
              <option value={20}>12 mi</option>
              <option value={50}>30 mi</option>
            </select>
          </div>

          {/* Mobile row 3: Tool buttons + settings gear */}
          <div className="flex md:hidden items-center gap-1.5 mt-2">
            <button
              onClick={() => setShowFavouritesOnly(!showFavouritesOnly)}
              className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center ${showFavouritesOnly ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Favourites"
              aria-label="Favourites"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={showFavouritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
            <button
              onClick={() => setCalcOpen(true)}
              className="flex-1 p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center"
              title="Fuel Calculator"
              aria-label="Fuel Calculator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="10" y2="10" />
                <line x1="14" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="10" y2="14" />
                <line x1="14" y1="14" x2="16" y2="14" />
                <line x1="8" y1="18" x2="16" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setRouteOpen(true)}
              className="flex-1 p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center"
              title="Route Planner"
              aria-label="Route Planner"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </button>
            <button
              onClick={() => setTrackerOpen(true)}
              className="flex-1 p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center"
              title="Fuel Spending Tracker"
              aria-label="Fuel Spending Tracker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 22V5a2 2 0 012-2h8a2 2 0 012 2v17" />
                <path d="M15 10h2a2 2 0 012 2v2a2 2 0 002 2h0" />
                <path d="M21 10V8a2 2 0 00-2-2h-1" />
                <rect x="6" y="7" width="6" height="5" rx="1" />
              </svg>
            </button>
            {compareIds.size > 0 && (
              <button
                onClick={() => setCompareOpen(true)}
                className="flex-1 p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors relative flex items-center justify-center"
                title="Compare stations"
                aria-label="Compare stations"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {compareIds.size}
                </span>
              </button>
            )}
            <div className="flex-shrink-0">
              <SettingsMenu mapStyle={mapStyle} onMapStyleChange={setMapStyle} />
            </div>
          </div>
        </div>
      </header>

      {/* Fill up advice banner */}
      {userLocation && (
        <div className="flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-white border-b border-gray-100">
          <FillUpAdvice fuelType={selectedFuels.find(f => f !== 'EV') || 'E10'} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop sidebar */}
        <div
          className={`hidden md:block flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-300 z-10 ${
            sidebarOpen ? 'w-96' : 'w-0'
          } overflow-hidden`}
        >
          <StationList {...stationListProps} />
        </div>

        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:block absolute top-2 z-20 bg-white border border-gray-300 rounded-r-lg shadow-md p-1.5 hover:bg-gray-50 transition-colors"
          style={{ left: sidebarOpen ? '384px' : '0' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 text-gray-600 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Mobile bottom sheet */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '70vh' }}
        >
          <div className="flex justify-center py-2" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 24px)' }}>
            <StationList {...stationListProps} />
          </div>
        </div>

        {/* Mobile privacy/terms links */}
        <div className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-3 text-[10px] text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 underline">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-600 underline">Terms</Link>
        </div>

        {/* Mobile list toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-green-600 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          {stations.length + evChargers.length > 0
            ? `${stations.length + evChargers.length} Stations`
            : 'Station List'}
        </button>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs md:text-sm text-gray-600">Loading...</span>
            </div>
          )}
          {locationName && (
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[1000] bg-white/90 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow text-xs md:text-sm font-medium text-gray-700">
              {locationName}
            </div>
          )}

          {/* Notification bell on map */}
          <button
            onClick={() => setNotifOpen(true)}
            className="absolute top-2 left-2 md:top-12 md:left-1 z-[1000] bg-white/90 backdrop-blur p-2 rounded-lg shadow hover:bg-white transition-colors text-amber-500"
            title="Price Alerts"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>

          <Map
            center={center}
            zoom={zoom}
            stations={stations}
            evChargers={evChargers}
            selectedFuels={selectedFuels}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            mapStyle={mapStyle}
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
            userLocation={userLocation}
          />
        </div>
      </div>

      {/* Modals */}
      <FuelCalculator
        stations={stations}
        selectedFuels={selectedFuels}
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
      />
      <ComparisonTable
        stations={stations}
        compareIds={compareIds}
        onRemove={removeCompare}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
      <RoutePlanner
        stations={stations}
        selectedFuels={selectedFuels}
        open={routeOpen}
        onClose={() => setRouteOpen(false)}
        onStationClick={handleStationClick}
      />
      <NotificationManager
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
      <FuelTracker
        open={trackerOpen}
        onClose={() => setTrackerOpen(false)}
      />
      <InstallPrompt />

      {/* Footer — hidden on mobile to avoid overlap with station list */}
      <footer className="hidden md:block flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
          <span>&copy; {new Date().getFullYear()} GetCheapFuel</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 hover:underline">Terms of Service</Link>
          <a href="mailto:support@getcheapfuel.co.uk" className="hover:text-gray-700 hover:underline">Contact</a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
          <span>Cheap fuel in:</span>
          {['london','manchester','birmingham','leeds','glasgow','liverpool','edinburgh','bristol','sheffield','newcastle','nottingham','cardiff'].map(city => (
            <Link key={city} href={`/cheap-fuel/${city}`} className="hover:text-gray-600 hover:underline capitalize">{city.replace('-', ' ')}</Link>
          ))}
          <Link href="/cheap-fuel/london" className="hover:text-gray-600 hover:underline">& more</Link>
        </div>
      </footer>
    </div>
  );
}
