'use client';

import { useState, useEffect, useCallback } from 'react';
import { FUEL_LABELS, FUEL_COLORS } from '@/lib/types';
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

export default function FuelTracker({ open, onClose }: FuelTrackerProps) {
  const [email, setEmail] = useState('');
  const [synced, setSynced] = useState(false);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'log' | 'history' | 'stats'>('log');

  // Form state
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState('E10');
  const [litres, setLitres] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved email from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gcf-sync-email');
    if (saved) {
      setEmail(saved);
      setSynced(true);
    }
  }, []);


  // Fetch logs when synced
  const fetchLogs = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/fuel-logs?email=${encodeURIComponent(email)}`);
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

  const handleSync = () => {
    if (!email.includes('@')) return;
    const clean = email.toLowerCase().trim();
    localStorage.setItem('gcf-sync-email', clean);
    setEmail(clean);
    setSynced(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('gcf-sync-email');
    setEmail('');
    setSynced(false);
    setLogs([]);
  };

  const pricePerLitre = litres && totalCost
    ? (parseFloat(totalCost) / parseFloat(litres) * 100).toFixed(1)
    : '';

  const handleSubmit = async () => {
    if (!station || !litres || !totalCost || !email) return;
    setSaving(true);
    try {
      await fetch('/api/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          station_name: station,
          fuel_type: fuelType,
          litres: parseFloat(litres),
          total_cost: parseFloat(totalCost),
          price_per_litre: parseFloat(pricePerLitre),
          odometer: odometer ? parseFloat(odometer) : null,
        }),
      });
      setStation('');
      setLitres('');
      setTotalCost('');
      setOdometer('');
      setTab('history');
      fetchLogs();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/fuel-logs?id=${id}&email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  // Stats calculations
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);
  const thisMonthLogs = logs.filter(l => l.logged_at.slice(0, 7) === thisMonth);
  const lastMonthLogs = logs.filter(l => l.logged_at.slice(0, 7) === lastMonth);
  const thisMonthTotal = thisMonthLogs.reduce((s, l) => s + l.total_cost, 0);
  const lastMonthTotal = lastMonthLogs.reduce((s, l) => s + l.total_cost, 0);
  const totalSpent = logs.reduce((s, l) => s + l.total_cost, 0);
  const totalLitres = logs.reduce((s, l) => s + l.litres, 0);

  // Monthly breakdown for chart
  const monthlySpend: Record<string, number> = {};
  for (const log of logs) {
    const m = log.logged_at.slice(0, 7);
    monthlySpend[m] = (monthlySpend[m] || 0) + log.total_cost;
  }
  const months = Object.entries(monthlySpend).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const maxSpend = Math.max(...months.map(m => m[1]), 1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full md:w-[420px] md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Fuel Spending Tracker</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Email sync prompt */}
        {!synced ? (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 mb-1">Track your fuel spending</div>
              <div className="text-sm text-gray-500">Enter your email to sync across all your devices. No password needed.</div>
            </div>
            <div className="w-full flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSync()}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleSync}
                disabled={!email.includes('@')}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                Sync
              </button>
            </div>
            <div className="text-[11px] text-gray-400">We only use your email for syncing. No spam, ever.</div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {([['log', 'Log Fill-Up'], ['history', 'History'], ['stats', 'Stats']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    tab === key ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {/* LOG TAB */}
              {tab === 'log' && (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={station}
                    onChange={e => setStation(e.target.value)}
                    placeholder="Station name (e.g. Asda Hayes)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={fuelType}
                    onChange={e => setFuelType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {FUEL_OPTIONS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Litres</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={litres}
                        onChange={e => setLitres(e.target.value)}
                        placeholder="e.g. 40"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Total cost (£)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={totalCost}
                        onChange={e => setTotalCost(e.target.value)}
                        placeholder="e.g. 58.50"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  {pricePerLitre && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      Price per litre: <span className="font-bold text-gray-900">{pricePerLitre}p</span>
                    </div>
                  )}
                  <input
                    type="number"
                    inputMode="numeric"
                    value={odometer}
                    onChange={e => setOdometer(e.target.value)}
                    placeholder="Odometer reading (optional)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!station || !litres || !totalCost || saving}
                    className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Log Fill-Up'}
                  </button>
                </div>
              )}

              {/* HISTORY TAB */}
              {tab === 'history' && (
                <div>
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No fill-ups logged yet
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="px-4 py-3 border-b border-gray-100 flex items-start gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: FUEL_COLORS[log.fuel_type as FuelType] || '#6b7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900 truncate">{log.station_name}</span>
                            <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">£{log.total_cost.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {FUEL_LABELS[log.fuel_type as FuelType] || log.fuel_type} &middot; {log.litres.toFixed(1)}L &middot; {log.price_per_litre.toFixed(1)}p/L
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(log.logged_at)}</div>
                        </div>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STATS TAB */}
              {tab === 'stats' && (
                <div className="p-4 space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="text-[11px] text-green-600 font-medium">This month</div>
                      <div className="text-xl font-bold text-green-700">£{thisMonthTotal.toFixed(2)}</div>
                      {lastMonthTotal > 0 && (
                        <div className={`text-[11px] font-medium ${thisMonthTotal > lastMonthTotal ? 'text-red-500' : 'text-green-500'}`}>
                          {thisMonthTotal > lastMonthTotal ? '↑' : '↓'} £{Math.abs(thisMonthTotal - lastMonthTotal).toFixed(2)} vs last month
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-500 font-medium">Total spent</div>
                      <div className="text-xl font-bold text-gray-900">£{totalSpent.toFixed(2)}</div>
                      <div className="text-[11px] text-gray-400">{totalLitres.toFixed(0)}L across {logs.length} fill-ups</div>
                    </div>
                  </div>

                  {/* Monthly bar chart */}
                  {months.length > 1 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">Monthly spending</div>
                      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
                        {months.map(([month, spend]) => (
                          <div key={month} className="flex-1 flex flex-col items-center gap-1">
                            <div className="text-[10px] font-semibold text-gray-700">£{spend.toFixed(0)}</div>
                            <div
                              className="w-full rounded-t bg-green-500"
                              style={{ height: `${(spend / maxSpend) * 70}px`, minHeight: 4 }}
                            />
                            <div className="text-[9px] text-gray-400">{formatMonth(month + '-01')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Average price per fuel type */}
                  {logs.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">Average price per litre</div>
                      <div className="space-y-2">
                        {FUEL_OPTIONS.map(f => {
                          const typeLogs = logs.filter(l => l.fuel_type === f.key);
                          if (typeLogs.length === 0) return null;
                          const avg = typeLogs.reduce((s, l) => s + l.price_per_litre, 0) / typeLogs.length;
                          return (
                            <div key={f.key} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: FUEL_COLORS[f.key as FuelType] }}
                                />
                                <span className="text-sm text-gray-600">{f.label}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900">{avg.toFixed(1)}p</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with sync info */}
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <div className="text-[11px] text-gray-400 truncate">Synced as {email}</div>
              <button onClick={handleLogout} className="text-[11px] text-red-400 hover:text-red-600">Sign out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
