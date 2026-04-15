'use client';

import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { FUEL_COLORS, type FuelType } from '@/lib/types';

interface PricePoint {
  price: number;
  snapshot_date: string;
}

interface PriceSparklineProps {
  stationId: string;
  // The one fuel to plot. This is the user's currently-selected
  // primary fuel; full multi-fuel charts live in the popup only.
  fuel: Exclude<FuelType, 'EV'>;
}

/**
 * Lightweight list-card sparkline.
 *
 * - Single-fuel only (uses the legacy single-fuel `price-history` path
 *   so the response is ~1 KB instead of 4×)
 * - 32 px canvas, no grid, no legend, no end labels
 * - Inline "30d ±Xp" chip on the right so users still see direction
 * - Lazy-fetches via IntersectionObserver exactly like PriceTrendChart,
 *   so cards below the fold stay idle
 *
 * Trade-off vs PriceTrendChart: loses multi-fuel overlap, but saves
 * ~3 fetches per card and cuts rendering time roughly in half.
 */
export default function PriceSparkline({ stationId, fuel }: PriceSparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PricePoint[] | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    fetch(apiUrl(`/api/price-history?stationId=${encodeURIComponent(stationId)}&fuelType=${fuel}&days=30`))
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json.history || []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [inView, stationId, fuel]);

  useEffect(() => {
    if (!data || data.length < 2 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices) - 0.4;
    const max = Math.max(...prices) + 0.4;
    const range = max - min || 1;

    const pad = 4;
    const chartH = h - pad * 2;
    const color = FUEL_COLORS[fuel];

    ctx.clearRect(0, 0, w, h);

    const points: [number, number][] = data.map((d, i) => [
      (i / Math.max(1, data.length - 1)) * w,
      pad + chartH - ((d.price - min) / range) * chartH,
    ]);

    // Gradient fill under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(points[0][0], h);
    for (const p of points) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(points[points.length - 1][0], h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // End dot with halo
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last[0], last[1], 4, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last[0], last[1], 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, fuel]);

  // Placeholder (and observer target) until the card is in view
  if (!inView) {
    return (
      <div ref={containerRef} className="mt-2 h-[34px] rounded-md bg-gray-50/70" />
    );
  }

  // Not enough history — collapse the row
  if (data && data.length < 2) return null;

  // Still fetching
  if (!data) {
    return (
      <div ref={containerRef} className="mt-2 h-[34px] rounded-md bg-gray-50/70 flex items-center justify-end px-2">
        <div className="w-2.5 h-2.5 border border-gray-300 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  const first = data[0].price;
  const latest = data[data.length - 1].price;
  const diff = latest - first;
  const diffLabel =
    diff > 0.05 ? `+${diff.toFixed(1)}p` : diff < -0.05 ? `${diff.toFixed(1)}p` : '±0.0p';
  const diffClass =
    diff > 0.05
      ? 'bg-red-50 text-red-600'
      : diff < -0.05
        ? 'bg-green-50 text-green-600'
        : 'bg-gray-100 text-gray-500';
  const arrow = diff > 0.05 ? '▲' : diff < -0.05 ? '▼' : '';

  return (
    <div ref={containerRef} className="mt-2 flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex-shrink-0">
        30d
      </span>
      <div className="flex-1 min-w-0">
        <canvas ref={canvasRef} className="w-full block" style={{ height: 34 }} />
      </div>
      <span
        className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${diffClass}`}
      >
        {arrow && <span className="text-[8px] mr-0.5">{arrow}</span>}
        {diffLabel}
      </span>
    </div>
  );
}
