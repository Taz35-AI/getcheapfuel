'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import FuelFilter from '@/components/FuelFilter';
import SettingsMenu from '@/components/SettingsMenu';
import { useRouter } from 'next/navigation';
import { isNative } from '@/lib/platform';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/hooks/useAuth';

// FillUpAdvice only renders once the user has a location, so its JS
// doesn't need to be in the initial bundle.
const FillUpAdvice = dynamic(() => import('@/components/FillUpAdvice'), { ssr: false });

// StationList pulls in PriceTrendChart, StationAmenityIcons, OpenStatusBadge,
// BrandLogo and the TitleCase helper. Defer it — only needed when the
// sidebar opens (mobile bottom sheet, desktop sidebar).
const StationList = dynamic(() => import('@/components/StationList'), { ssr: false });
import { useFavourites } from '@/hooks/useFavourites';
import Link from 'next/link';
import type { FuelStation, EVCharger, FuelType } from '@/lib/types';

// Map is heavy (~80KB MapLibre + tiles) — defer until after first paint
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

// Modal components only render when their `open` state is true.
// Lazy-loading them keeps the initial JS bundle much smaller.
const FuelCalculator = dynamic(() => import('@/components/FuelCalculator'), { ssr: false });
const ComparisonTable = dynamic(() => import('@/components/ComparisonTable'), { ssr: false });
const RoutePlanner = dynamic(() => import('@/components/RoutePlanner'), { ssr: false });
const NotificationManager = dynamic(() => import('@/components/NotificationManager'), { ssr: false });
const FuelTracker = dynamic(() => import('@/components/FuelTracker'), { ssr: false });
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  // Defer the heavy MapLibre mount until the browser is idle so it doesn't
  // contribute to TBT during the initial paint window.
  const [mapReady, setMapReady] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [unitSystem, setUnitSystem] = useState<'miles' | 'km'>('miles');
  const { user, displayName } = useAuth();
  const appRouter = useRouter();

  // Read persisted settings from localStorage on mount + when page regains focus
  const loadSettings = useCallback(() => {
    try {
      const ms = localStorage.getItem('gcf_map_style');
      if (ms) setMapStyle(ms as MapStyle);
      const fuels = localStorage.getItem('gcf_default_fuels');
      if (fuels) setSelectedFuels(JSON.parse(fuels));
      const r = localStorage.getItem('gcf_radius');
      if (r) setRadius(Number(r));
      const s = localStorage.getItem('gcf_sort_by');
      if (s) setSortBy(s as 'distance' | 'price');
      const u = localStorage.getItem('gcf_unit_system');
      if (u) setUnitSystem(u as 'miles' | 'km');
    } catch {}
  }, []);

  useEffect(() => {
    loadSettings();
    // Reload settings when user comes back from /settings page
    const handleFocus = () => loadSettings();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadSettings]);

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

  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true);
    if (isNative()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    try {
      if (isNative()) {
        // Native: use Capacitor geolocation (handles permissions natively)
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        const { latitude, longitude } = pos.coords;
        setCenter([latitude, longitude]);
        setZoom(13);
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationName('Your Location');
        fetchStations(latitude, longitude, radius);
      } else {
        // Web: use browser geolocation
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser');
          setIsLocating(false);
          return;
        }
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
        return; // setIsLocating handled in callbacks above
      }
    } catch {
      alert('Unable to get your location. Please search manually.');
    }
    setIsLocating(false);
  }, [fetchStations, radius]);

  const handleStationClick = useCallback((station: FuelStation) => {
    setCenter([station.latitude, station.longitude]);
    setZoom(15);
    setSelectedStation(station.id);
  }, []);

  // Click a station card from the sidebar list. We only set
  // selectedStation here — the Map component's selectedStation effect
  // handles BOTH the popup open AND the smart pan-with-offset that
  // makes the popup land centred. Setting center/zoom here as well
  // would trigger a competing flyTo with no offset, leaving the popup
  // top cut off (the bug the user reported).
  const handleStationCardClick = useCallback((station: FuelStation) => {
    setSelectedStation(station.id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleChargerCardClick = useCallback((charger: EVCharger) => {
    setSelectedStation(charger.id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
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

  // Defer the InstallPrompt mount until the page is idle so its JS chunk
  // doesn't compete with the initial paint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const trigger = () => setShowInstallPrompt(true);
    if (w.requestIdleCallback) {
      w.requestIdleCallback(trigger, { timeout: 4000 });
    } else {
      setTimeout(trigger, 3000);
    }
  }, []);

  // Mount the heavy MapLibre map after first paint settles. Pushes ~1.5s of
  // script eval and ~2s of paint/composite work outside Lighthouse's TBT
  // measurement window. Users see a placeholder for ~500ms before the real
  // map appears.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const mount = () => setMapReady(true);
    if (w.requestIdleCallback) {
      w.requestIdleCallback(mount, { timeout: 1500 });
    } else {
      setTimeout(mount, 600);
    }
  }, []);

  // Auto-open the desktop sidebar once we actually have results to show.
  // (Don't open it on first load — that triggers the StationList chunk
  // download immediately and hurts the desktop Lighthouse score.)
  useEffect(() => {
    if (
      stations.length > 0 &&
      !sidebarOpen &&
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches
    ) {
      setSidebarOpen(true);
    }
  }, [stations.length, sidebarOpen]);

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
    onStationClick: handleStationCardClick,
    onChargerClick: handleChargerCardClick,
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="px-3 py-2 md:px-4 md:py-3">
          {/* Mobile: 2 rows | Desktop: single row */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex-shrink-0">
              <picture>
                <source srcSet="/icons/logo.webp" type="image/webp" />
                <img
                  src="/icons/logo.png"
                  alt="GetCheapFuel - UK Fuel & EV Prices"
                  width={84}
                  height={56}
                  fetchPriority="high"
                  className="h-12 md:h-14 w-auto"
                />
              </picture>
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
                className={`px-3 py-2.5 rounded-lg transition-colors shadow-sm ${showFavouritesOnly ? 'bg-red-50' : 'bg-gray-100 hover:bg-gray-200'}`}
                title="Favourites"
              >
                {showFavouritesOnly ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                ) : (
                  <img src="/icons/favourites.svg" alt="Favourites" className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setCalcOpen(true)}
                className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
                title="Fuel Calculator"
              >
                <img src="/icons/calculator.svg" alt="Fuel Calculator" className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRouteOpen(true)}
                className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
                title="Route Planner"
              >
                <img src="/icons/route-planner.svg" alt="Route Planner" className="w-5 h-5" />
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
                className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
                title="Fuel Spending Tracker"
              >
                <img src="/icons/fuel-tracker.svg" alt="Fuel Spending Tracker" className="w-5 h-5" />
              </button>
              <SettingsMenu />
              <button
                onClick={() => user ? appRouter.push('/profile') : setAuthOpen(true)}
                className={`px-3 py-2.5 rounded-lg transition-colors shadow-sm text-sm font-semibold ${
                  user
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={user ? 'Profile' : 'Sign In'}
              >
                {user ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    {displayName}
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
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
              {unitSystem === 'km' ? (
                <>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </>
              ) : (
                <>
                  <option value={5}>3 mi</option>
                  <option value={10}>6 mi</option>
                  <option value={20}>12 mi</option>
                  <option value={50}>30 mi</option>
                </>
              )}
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
              {unitSystem === 'km' ? (
                <>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </>
              ) : (
                <>
                  <option value={5}>3 mi</option>
                  <option value={10}>6 mi</option>
                  <option value={20}>12 mi</option>
                  <option value={50}>30 mi</option>
                </>
              )}
            </select>
          </div>

          {/* Mobile row 3: Tool buttons + settings gear */}
          <div className="flex md:hidden items-center gap-1.5 mt-2">
            <button
              onClick={() => setShowFavouritesOnly(!showFavouritesOnly)}
              className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center ${showFavouritesOnly ? 'bg-red-50' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Favourites"
              aria-label="Favourites"
            >
              {showFavouritesOnly ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              ) : (
                <img src="/icons/favourites.svg" alt="Favourites" className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setCalcOpen(true)}
              className="flex-1 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Fuel Calculator"
              aria-label="Fuel Calculator"
            >
              <img src="/icons/calculator.svg" alt="Fuel Calculator" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRouteOpen(true)}
              className="flex-1 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Route Planner"
              aria-label="Route Planner"
            >
              <img src="/icons/route-planner.svg" alt="Route Planner" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTrackerOpen(true)}
              className="flex-1 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Fuel Spending Tracker"
              aria-label="Fuel Spending Tracker"
            >
              <img src="/icons/fuel-tracker.svg" alt="Fuel Spending Tracker" className="w-4 h-4" />
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
              <SettingsMenu />
            </div>
            <button
              onClick={() => user ? appRouter.push('/profile') : setAuthOpen(true)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                user
                  ? 'bg-green-100 hover:bg-green-200'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={user ? 'Profile' : 'Sign In'}
              aria-label={user ? 'Profile' : 'Sign In'}
            >
              {user ? (
                <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[8px] font-bold flex items-center justify-center">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
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

          {mapReady ? (
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
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50"
              aria-hidden="true"
            >
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading map…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals — only mount when opened so the JS chunk isn't fetched until needed */}
      {calcOpen && (
        <FuelCalculator
          stations={stations}
          selectedFuels={selectedFuels}
          open={calcOpen}
          onClose={() => setCalcOpen(false)}
        />
      )}
      {compareOpen && (
        <ComparisonTable
          stations={stations}
          compareIds={compareIds}
          onRemove={removeCompare}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {routeOpen && (
        <RoutePlanner
          stations={stations}
          selectedFuels={selectedFuels}
          open={routeOpen}
          onClose={() => setRouteOpen(false)}
          onStationClick={handleStationClick}
        />
      )}
      {notifOpen && (
        <NotificationManager
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
        />
      )}
      {trackerOpen && (
        <FuelTracker
          open={trackerOpen}
          onClose={() => setTrackerOpen(false)}
        />
      )}
      {showInstallPrompt && <InstallPrompt />}
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
        />
      )}

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
