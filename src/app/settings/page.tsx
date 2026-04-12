'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

type MapStyle = 'dark' | 'bright' | 'positron' | 'liberty';

const MAP_STYLES: { key: MapStyle; label: string; preview: string }[] = [
  { key: 'liberty', label: 'Liberty', preview: 'bg-gradient-to-br from-amber-100 to-stone-200' },
  { key: 'bright', label: 'Bright', preview: 'bg-gradient-to-br from-sky-50 to-emerald-100' },
  { key: 'positron', label: 'Positron', preview: 'bg-gradient-to-br from-gray-100 to-gray-200' },
  { key: 'dark', label: 'Dark', preview: 'bg-gradient-to-br from-gray-700 to-gray-900' },
];

const FUEL_OPTIONS = [
  { key: 'E10', label: 'Unleaded (E10)', color: 'bg-green-500' },
  { key: 'E5', label: 'Premium (E5)', color: 'bg-blue-500' },
  { key: 'B7', label: 'Diesel (B7)', color: 'bg-amber-500' },
  { key: 'SDV', label: 'Super Diesel', color: 'bg-red-500' },
  { key: 'EV', label: 'EV Charging', color: 'bg-violet-500' },
];

const RADIUS_OPTIONS = [
  { value: 5, label: '3 miles' },
  { value: 10, label: '6 miles' },
  { value: 20, label: '12 miles' },
  { value: 50, label: '30 miles' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'price', label: 'Cheapest first' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mapStyle, setMapStyle] = useState<MapStyle>('liberty');
  const [selectedFuels, setSelectedFuels] = useState<string[]>(['E10', 'B7']);
  const [radius, setRadius] = useState(10);
  const [sortBy, setSortBy] = useState('distance');
  const [saved, setSaved] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  // Load persisted settings
  useEffect(() => {
    try {
      const ms = localStorage.getItem('gcf_map_style');
      if (ms) setMapStyle(ms as MapStyle);
      const fuels = localStorage.getItem('gcf_default_fuels');
      if (fuels) setSelectedFuels(JSON.parse(fuels));
      const r = localStorage.getItem('gcf_radius');
      if (r) setRadius(Number(r));
      const s = localStorage.getItem('gcf_sort_by');
      if (s) setSortBy(s);
    } catch {}
  }, []);

  const toggleFuel = (key: string) => {
    setSelectedFuels(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(f => f !== key);
      }
      return [...prev, key];
    });
  };

  const handleSave = () => {
    localStorage.setItem('gcf_map_style', mapStyle);
    localStorage.setItem('gcf_default_fuels', JSON.stringify(selectedFuels));
    localStorage.setItem('gcf_radius', String(radius));
    localStorage.setItem('gcf_sort_by', sortBy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="h-screen overflow-y-auto bg-white">
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mb-8"
        >
          &larr; Back to GetCheapFuel
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Map style */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Map Style</h2>
          <p className="text-xs text-gray-400 mb-3">Choose how the map looks when you open the app.</p>
          <div className="grid grid-cols-2 gap-3">
            {MAP_STYLES.map(s => (
              <button
                key={s.key}
                onClick={() => setMapStyle(s.key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  mapStyle === s.key
                    ? 'border-green-500 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-full h-12 rounded-lg ${s.preview}`} />
                <span className={`text-xs font-semibold ${
                  mapStyle === s.key ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Default fuel types */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Default Fuel Types</h2>
          <p className="text-xs text-gray-400 mb-3">Choose which fuel types to show by default when you open the app.</p>
          <div className="space-y-2">
            {FUEL_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => toggleFuel(f.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selectedFuels.includes(f.key)
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white opacity-60'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${f.color} ${
                  selectedFuels.includes(f.key) ? '' : 'opacity-30'
                }`} />
                <span className="text-sm font-medium text-gray-900 flex-1 text-left">{f.label}</span>
                {selectedFuels.includes(f.key) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Search radius */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Search Radius</h2>
          <p className="text-xs text-gray-400 mb-3">Select default radius when searching for fuel stations near you.</p>
          <div className="grid grid-cols-2 gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r.value}
                onClick={() => setRadius(r.value)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  radius === r.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sort preference */}
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Default Sort</h2>
          <p className="text-xs text-gray-400 mb-3">Choose how stations are sorted in the list by default.</p>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setSortBy(s.value)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  sortBy === s.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </main>
  );
}
