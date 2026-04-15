'use client';

import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';

interface PricePoint {
  price: number;
  snapshot_date: string;
}

interface PriceTrendChartProps {
  stationId: string;
  fuelType: string;
  color?: string;
}

export default function PriceTrendChart({ stationId, fuelType, color = '#22c55e' }: PriceTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Defer the price-history fetch until the card is actually near the
  // viewport. Without this, every station card in the list fires its
  // own /api/price-history request on mount — when the landing page
  // pre-fetches ~60 London stations, that's ~60 parallel requests for
  // charts the user may never scroll to.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el) return;
    // Guard older browsers that don't support IntersectionObserver —
    // fall back to fetching immediately like before.
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
      // Start the fetch a little before the card enters the viewport
      // so the chart is ready by the time the user sees it.
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    setLoading(true);
    setError(false);
    fetch(apiUrl(`/api/price-history?stationId=${encodeURIComponent(stationId)}&fuelType=${fuelType}&days=30`))
      .then(res => res.json())
      .then(json => {
        setData(json.history || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [inView, stationId, fuelType]);

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
    const prices = data.map(d => d.price);
    const min = Math.min(...prices) - 0.5;
    const max = Math.max(...prices) + 0.5;
    const range = max - min || 1;

    const padTop = 14;
    const padBottom = 4;
    const chartH = h - padTop - padBottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Gradient fill under the line
    const gradient = ctx.createLinearGradient(0, padTop, 0, h);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '05');

    // Build path
    const points: [number, number][] = data.map((d, i) => [
      (i / (data.length - 1)) * w,
      padTop + chartH - ((d.price - min) / range) * chartH,
    ]);

    // Fill area
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.lineTo(points[points.length - 1][0], h);
    ctx.lineTo(points[0][0], h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Latest price dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last[0], last[1], 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Min/max labels
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'right';
    ctx.fillText(`${max.toFixed(1)}p`, w - 1, padTop - 2);
    ctx.fillText(`${min.toFixed(1)}p`, w - 1, h - 1);
  }, [data, color]);

  // Placeholder (and observer target) until the card is in view.
  if (!inView || loading) {
    return (
      <div ref={containerRef} className="mt-2 h-12 flex items-center justify-center">
        {loading && (
          <div className="w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        )}
      </div>
    );
  }

  if (error || !data || data.length < 2) {
    return null; // Don't show chart if no history data
  }

  const first = data[0].price;
  const latest = data[data.length - 1].price;
  const diff = latest - first;
  const diffLabel = diff > 0 ? `+${diff.toFixed(1)}p` : `${diff.toFixed(1)}p`;
  const diffColor = diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-400">30-day trend</span>
        <span className={`text-[10px] font-semibold ${diffColor}`}>{diffLabel}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 48 }}
      />
    </div>
  );
}
