'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { FuelType } from '@/lib/types';

interface FuelLog {
  id: string;
  station_name: string;
  fuel_type: string;
  litres: number;
  total_cost: number;
  price_per_litre: number;
  odometer: number | null;
  notes: string | null;
  logged_at: string;
}

interface FuelTrackerProps {
  open: boolean;
  onClose: () => void;
  // Called when the user taps "Sync across devices" — host should open
  // the sign-up / sign-in modal. After authentication the tracker will
  // automatically adopt the user's email as its sync key.
  onRequestAuth?: () => void;
}

const FUEL_OPTIONS: { key: string; label: string }[] = [
  { key: 'E10', label: 'Unleaded (E10)' },
  { key: 'E5', label: 'Premium (E5)' },
  { key: 'B7', label: 'Diesel (B7)' },
  { key: 'SDV', label: 'Super Diesel' },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// localStorage keys
const LOCAL_LOGS_KEY = 'gcf-fuel-logs-local';
const SYNC_EMAIL_KEY = 'gcf-sync-email';

export default function FuelTracker({ open, onClose, onRequestAuth }: FuelTrackerProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [synced, setSynced] = useState(false);
  // Cloud logs, fetched by email once the user has opted in
  const [logs, setLogs] = useState<FuelLog[]>([]);
  // Local-only logs, saved to localStorage so visitors can try the
  // tracker without any email/account at all (fix #3 from the
  // bounce-rate analysis — value first, account second).
  const [localLogs, setLocalLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'log' | 'history' | 'stats'>('log');
  // Tracks whether we've already auto-synced for the current Supabase
  // user, so we don't try to upload local logs on every render.
  const autoSyncedRef = useRef(false);

  // Form state
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState('E10');
  const [litres, setLitres] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved email + any local logs from localStorage on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(SYNC_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setSynced(true);
      }
      const savedLocal = localStorage.getItem(LOCAL_LOGS_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal) as FuelLog[];
        if (Array.isArray(parsed)) setLocalLogs(parsed);
      }
    } catch {
      // ignore parse/storage errors
    }
  }, []);

  // Helper — persist local logs to both state and localStorage
  const persistLocalLogs = useCallback((next: FuelLog[]) => {
    setLocalLogs(next);
    try {
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / serialization errors
    }
  }, []);


  // Fetch logs when synced
  const fetchLogs = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/fuel-logs?email=${encodeURIComponent(email)}`));
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (synced && email && open) fetchLogs();
  }, [synced, email, open, fetchLogs]);

  const handleSync = useCallback(async (targetEmail: string) => {
    if (!targetEmail.includes('@')) return;
    const clean = targetEmail.toLowerCase().trim();
    try {
      localStorage.setItem(SYNC_EMAIL_KEY, clean);
    } catch {
      // ignore
    }
    setEmail(clean);
    setSynced(true);

    // If there are local-only logs accumulated before the user opted
    // in to sync, push them all to the cloud and then clear local.
    // Fire-and-forget — any individual failure is silently ignored.
    if (localLogs.length > 0) {
      const toUpload = localLogs;
      persistLocalLogs([]);
      for (const log of toUpload) {
        try {
          await fetch(apiUrl('/api/fuel-logs'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: clean,
              station_name: log.station_name,
              fuel_type: log.fuel_type,
              litres: log.litres,
              total_cost: log.total_cost,
              price_per_litre: log.price_per_litre,
              odometer: log.odometer,
            }),
          });
        } catch {
          // ignore individual upload failures
        }
      }
    }
  }, [localLogs, persistLocalLogs]);

  // Auto-adopt the Supabase user's email as the sync key the moment
  // they finish authenticating (via the AuthModal triggered by the
  // "Sync across devices" button, or any other sign-in flow). This
  // uploads any pending local logs to their account.
  useEffect(() => {
    if (!user?.email) return;
    if (synced) return;
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    handleSync(user.email);
  }, [user?.email, synced, handleSync]);

  const handleLogout = () => {
    try {
      localStorage.removeItem(SYNC_EMAIL_KEY);
    } catch {
      // ignore
    }
    setEmail('');
    setSynced(false);
    setLogs([]);
    autoSyncedRef.current = false;
  };

  const pricePerLitre = litres && totalCost
    ? (parseFloat(totalCost) / parseFloat(litres) * 100).toFixed(1)
    : '';

  const handleSubmit = async () => {
    if (!station || !litres || !totalCost) return;
    setSaving(true);
    const ppl = parseFloat(pricePerLitre || '0');
    const litresNum = parseFloat(litres);
    const totalNum = parseFloat(totalCost);
    const odoNum = odometer ? parseFloat(odometer) : null;

    if (synced && email) {
      // Cloud path — save to API, then refetch
      try {
        await fetch(apiUrl('/api/fuel-logs'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            station_name: station,
            fuel_type: fuelType,
            litres: litresNum,
            total_cost: totalNum,
            price_per_litre: ppl,
            odometer: odoNum,
          }),
        });
        fetchLogs();
      } catch {
        // ignore
      }
    } else {
      // Local path — save to localStorage, no account required
      const log: FuelLog = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        station_name: station,
        fuel_type: fuelType,
        litres: litresNum,
        total_cost: totalNum,
        price_per_litre: ppl,
        odometer: odoNum,
        notes: null,
        logged_at: new Date().toISOString(),
      };
      persistLocalLogs([log, ...localLogs]);
    }

    setStation('');
    setLitres('');
    setTotalCost('');
    setOdometer('');
    setTab('history');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    // Local logs are identified by a `local-` prefix and only live in
    // localStorage — no API round-trip required.
    if (id.startsWith('local-')) {
      persistLocalLogs(localLogs.filter(l => l.id !== id));
      return;
    }
    await fetch(apiUrl(`/api/fuel-logs?id=${id}&email=${encodeURIComponent(email)}`), {
      method: 'DELETE',
    });
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  // Active source of logs — cloud when opted in, local otherwise.
  const activeLogs = synced ? logs : localLogs;

  // Stats calculations
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);
  const thisMonthLogs = activeLogs.filter(l => l.logged_at.slice(0, 7) === thisMonth);
  const lastMonthLogs = activeLogs.filter(l => l.logged_at.slice(0, 7) === lastMonth);
  const thisMonthTotal = thisMonthLogs.reduce((s, l) => s + l.total_cost, 0);
  const lastMonthTotal = lastMonthLogs.reduce((s, l) => s + l.total_cost, 0);
  const totalSpent = activeLogs.reduce((s, l) => s + l.total_cost, 0);
  const totalLitres = activeLogs.reduce((s, l) => s + l.litres, 0);

  // Monthly breakdown for chart
  const monthlySpend: Record<string, number> = {};
  for (const log of activeLogs) {
    const m = log.logged_at.slice(0, 7);
    monthlySpend[m] = (monthlySpend[m] || 0) + log.total_cost;
  }
  const months = Object.entries(monthlySpend).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const maxSpend = Math.max(...months.map(m => m[1]), 1);

  if (!open) return null;

  const tabMeta: { key: 'log' | 'history' | 'stats'; label: string; icon: string }[] = [
    { key: 'log', label: 'Log', icon: '/log.svg' },
    { key: 'history', label: 'History', icon: '/history.svg' },
    { key: 'stats', label: 'Stats', icon: '/stats.svg' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:w-[460px] h-[94vh] md:h-auto md:max-h-[90vh] md:rounded-[28px] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">

        {/* ─── Premium gradient header ──────────────────────────────── */}
        <div className="relative flex-shrink-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white px-5 pt-5 pb-5 overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 22V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v18" />
                  <path d="M3 22h13" />
                  <path d="M8 7h6" />
                  <path d="M8 11h6" />
                  <path d="M16 6h3a2 2 0 0 1 2 2v9a1 1 0 0 1-2 0V12a2 2 0 0 0-2-2h-1" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight truncate">Fuel Tracker</h2>
                <p className="text-[11px] text-emerald-100/90 font-medium truncate">
                  {synced
                    ? 'Cloud sync enabled'
                    : localLogs.length > 0
                      ? `${localLogs.length} fill-up${localLogs.length === 1 ? '' : 's'} on this device`
                      : 'Track every fill-up'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 ring-1 ring-white/20 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Headline stat — only shown when the user has logs */}
          {activeLogs.length > 0 && (
            <div className="relative mt-4 flex items-end gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-100/80 font-bold">This month</div>
                <div className="text-3xl font-black tabular-nums leading-none mt-1">£{thisMonthTotal.toFixed(2)}</div>
              </div>
              {lastMonthTotal > 0 && (
                <div className="text-[11px] text-emerald-100/90 pb-1.5">
                  {thisMonthTotal > lastMonthTotal ? '↑' : '↓'} £{Math.abs(thisMonthTotal - lastMonthTotal).toFixed(2)} vs last month
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Sync banner (local-only mode) ────────────────────────── */}
        {!synced && (
          <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center ring-1 ring-emerald-200 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-gray-900 leading-tight">Saved to this device</div>
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5">Sign up free to sync across devices</div>
              </div>
            </div>
            <button
              onClick={() => onRequestAuth?.()}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-black shadow-md shadow-emerald-600/25 transition-all"
            >
              Sync
            </button>
          </div>
        )}

        {/* ─── Tabs (with custom icons) ─────────────────────────────── */}
        <div className="flex-shrink-0 flex gap-1.5 px-3 pt-3 pb-2 bg-white border-b border-gray-100">
          {tabMeta.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all ${
                  active
                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 ring-1 ring-emerald-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={icon}
                  alt=""
                  className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'opacity-60'}`}
                  aria-hidden="true"
                />
                <span className={`text-[11px] font-bold transition-colors ${active ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── Tab content ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/40">

          {/* LOG TAB */}
          {tab === 'log' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Where did you fill up?
                </label>
                <input
                  type="text"
                  value={station}
                  onChange={e => setStation(e.target.value)}
                  placeholder="e.g. Asda Croydon"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Fuel type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FUEL_OPTIONS.map(f => {
                    const active = fuelType === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFuelType(f.key)}
                        className={`relative py-3 rounded-2xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: active ? '#ffffff' : FUEL_COLORS[f.key as FuelType] }}
                          />
                          {f.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Litres
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={litres}
                      onChange={e => setLitres(e.target.value)}
                      placeholder="42.0"
                      className="w-full pl-4 pr-9 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-900 tabular-nums placeholder:text-gray-300 placeholder:font-medium focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-semibold pointer-events-none">L</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Total cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold pointer-events-none">£</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={totalCost}
                      onChange={e => setTotalCost(e.target.value)}
                      placeholder="58.74"
                      className="w-full pl-8 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-900 tabular-nums placeholder:text-gray-300 placeholder:font-medium focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Live price-per-litre callout */}
              {pricePerLitre && (
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-2xl p-4 shadow-lg shadow-emerald-600/20">
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-100/90">Price per litre</div>
                      <div className="text-3xl font-black tabular-nums leading-none mt-1">{pricePerLitre}<span className="text-lg">p</span></div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Odometer <span className="text-gray-400 lowercase normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={odometer}
                    onChange={e => setOdometer(e.target.value)}
                    placeholder="54321"
                    className="w-full pl-4 pr-12 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-900 tabular-nums placeholder:text-gray-300 placeholder:font-medium focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-semibold pointer-events-none">mi</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!station || !litres || !totalCost || saving}
                className="w-full py-4 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 active:from-emerald-800 active:to-green-900 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-600/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Save Fill-Up
                  </>
                )}
              </button>
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeLogs.length === 0 ? (
                <div className="text-center py-16 px-8">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-4 ring-1 ring-emerald-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/history.svg" alt="" className="w-8 h-8 opacity-70" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-black text-gray-900 mb-1">No fill-ups yet</div>
                  <div className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                    Switch to the <span className="font-bold text-emerald-700">Log</span> tab to add your first fill-up.
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activeLogs.map(log => {
                    const color = FUEL_COLORS[log.fuel_type as FuelType] || '#6b7280';
                    return (
                      <div
                        key={log.id}
                        className="relative bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: color }}
                        />
                        <div className="pl-2 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                                {FUEL_LABELS[log.fuel_type as FuelType] || log.fuel_type}
                              </span>
                            </div>
                            <div className="text-sm font-black text-gray-900 truncate">{log.station_name}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                              {log.litres.toFixed(1)}L · {log.price_per_litre.toFixed(1)}p/L · {formatDate(log.logged_at)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                            <div className="text-lg font-black text-gray-900 tabular-nums leading-none">
                              £{log.total_cost.toFixed(2)}
                            </div>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="text-[10px] text-gray-300 hover:text-red-500 transition-colors"
                              aria-label="Delete fill-up"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {tab === 'stats' && (
            <div className="p-4 space-y-3">
              {activeLogs.length === 0 ? (
                <div className="text-center py-16 px-8">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center mb-4 ring-1 ring-emerald-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/stats.svg" alt="" className="w-8 h-8 opacity-70" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-black text-gray-900 mb-1">No stats yet</div>
                  <div className="text-[11px] text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                    Log your first fill-up to see monthly spending, price trends, and fuel-type averages.
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total spent</div>
                      <div className="text-2xl font-black text-gray-900 tabular-nums mt-1">£{totalSpent.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400 mt-1 font-medium">{totalLitres.toFixed(0)}L across {activeLogs.length} fill-up{activeLogs.length === 1 ? '' : 's'}</div>
                    </div>
                    <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Avg per fill-up</div>
                      <div className="text-2xl font-black text-gray-900 tabular-nums mt-1">
                        £{(totalSpent / Math.max(1, activeLogs.length)).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 font-medium">
                        ~{(totalLitres / Math.max(1, activeLogs.length)).toFixed(1)}L each
                      </div>
                    </div>
                  </div>

                  {/* Monthly spending chart */}
                  {months.length > 1 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs font-black text-gray-900">Monthly spending</div>
                        <div className="text-[10px] text-gray-400 font-medium">Last {months.length} months</div>
                      </div>
                      <div className="flex items-end gap-2" style={{ height: 130 }}>
                        {months.map(([month, spend]) => (
                          <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                            <div className="text-[10px] font-black text-gray-700 tabular-nums">£{spend.toFixed(0)}</div>
                            <div
                              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm"
                              style={{ height: `${(spend / maxSpend) * 85}px`, minHeight: 6 }}
                            />
                            <div className="text-[9px] text-gray-400 font-semibold uppercase">{formatMonth(month + '-01').slice(0, 3)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Average price per fuel type */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="text-xs font-black text-gray-900 mb-3">Average price per litre</div>
                    <div className="space-y-2.5">
                      {FUEL_OPTIONS.map(f => {
                        const typeLogs = activeLogs.filter(l => l.fuel_type === f.key);
                        if (typeLogs.length === 0) return null;
                        const avg = typeLogs.reduce((s, l) => s + l.price_per_litre, 0) / typeLogs.length;
                        return (
                          <div key={f.key} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                                style={{ backgroundColor: FUEL_COLORS[f.key as FuelType] }}
                              />
                              <span className="text-xs font-bold text-gray-700 truncate">{f.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2 flex-shrink-0">
                              <span className="text-[10px] text-gray-400 font-medium">{typeLogs.length} log{typeLogs.length === 1 ? '' : 's'}</span>
                              <span className="text-sm font-black text-gray-900 tabular-nums">{avg.toFixed(1)}p</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer (only when cloud-synced) ──────────────────────── */}
        {synced && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                Synced as <span className="font-bold text-gray-800">{email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
