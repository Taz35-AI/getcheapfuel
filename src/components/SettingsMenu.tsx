'use client';

import { useEffect, useRef, useState } from 'react';

type MapStyle = 'dark' | 'bright' | 'positron' | 'liberty';

interface Props {
  mapStyle: MapStyle;
  onMapStyleChange: (s: MapStyle) => void;
}

const STYLES: { key: MapStyle; label: string; preview: string }[] = [
  { key: 'liberty', label: 'Liberty', preview: 'bg-gradient-to-br from-amber-100 to-stone-200' },
  { key: 'bright', label: 'Bright', preview: 'bg-gradient-to-br from-sky-50 to-emerald-100' },
  { key: 'positron', label: 'Positron', preview: 'bg-gradient-to-br from-gray-100 to-gray-200' },
  { key: 'dark', label: 'Dark', preview: 'bg-gradient-to-br from-gray-700 to-gray-900' },
];

export default function SettingsMenu({ mapStyle, onMapStyleChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Settings"
        aria-label="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 py-1.5">Map style</div>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map(s => {
              const isActive = mapStyle === s.key;
              return (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => { onMapStyleChange(s.key); setOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                    isActive ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-8 rounded ${s.preview}`} />
                  <span className={`text-[11px] font-medium ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
