'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onUseMyLocation: () => void;
  isLocating: boolean;
}

export default function SearchBar({ onLocationSelect, onUseMyLocation, isLocating }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.name.split(',')[0]);
    setShowResults(false);
    onLocationSelect(result.lat, result.lng, result.name);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex gap-1.5 md:gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search city or postcode..."
          className="w-full px-3 py-2 md:px-4 md:py-2.5 pr-10 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={i}
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                {result.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onUseMyLocation}
        disabled={isLocating}
        title="Use my location"
        className="flex items-center justify-center gap-2 px-2.5 py-2 md:px-4 md:py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
      >
        {isLocating ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9zm0 12.75a3.75 3.75 0 110-7.5 3.75 3.75 0 010 7.5z" />
          </svg>
        )}
        <span className="hidden sm:inline">My Location</span>
      </button>
    </div>
  );
}
