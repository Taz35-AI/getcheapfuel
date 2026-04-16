'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { FUEL_COLORS, FUEL_LABELS, type FuelType } from '@/lib/types';

interface PricePoint {
  price: number;
  snapshot_date: string;
}

// Fuels we plot on the trend chart (EV excluded — no price-history data).
const CHART_FUELS: Exclude<FuelType, 'EV'>[] = ['E10', 'E5', 'B7', 'SDV'];

// Short labels used in the legend row so the 4 fuel chips fit under
// the chart on narrow mobile cards.
const SHORT_LABEL: Record<Exclude<FuelType, 'EV'>, string> = {
  E10: 'Unleaded',
  E5: 'Premium',
  B7: 'Diesel',
  SDV: 'Super',
};

interface PriceTrendChartProps {
  stationId: string;
  // Fuel to emphasise on the chart — drawn in bold with a price dot
  // and a header label. Other fuel lines are rendered faded. Accepts
  // either the new prop name or the legacy `fuelType` alias so
  // existing callers keep working without a change.
  highlightFuel?: FuelType;
  // Limit which fuel lines to plot. Pass the user's current filter
  // selection so the chart only shows what the user asked for — one
  // selected → one line, four selected → four lines. When omitted,
  // defaults to all four fuels.
  fuels?: Exclude<FuelType, 'EV'>[];
  // Compact variant used inside the station popup on mobile: smaller
  // canvas, tighter paddings, slimmer legend. Keeps the same visual
  // language just squeezed to fit.
  compact?: boolean;
  /** @deprecated Use `highlightFuel` instead. */
  fuelType?: string;
  /** @deprecated no longer used — each line uses its own FUEL_COLORS. */
  color?: string;
}

type Histories = Partial<Record<Exclude<FuelType, 'EV'>, PricePoint[]>>;

export default function PriceTrendChart({
  stationId,
  highlightFuel,
  fuels,
  compact,
  fuelType,
}: PriceTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histories, setHistories] = useState<Histories | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Defer the price-history fetch until the card is actually near the
  // viewport. Without this, every station card in the list fires its
  // own /api/price-history request on mount — when the landing page
  // pre-fetches ~60 London stations, that's ~60 parallel requests for
  // charts the user may never scroll to.
  const [inView, setInView] = useState(false);

  // Effective fuel set — respect the caller's `fuels` prop so the
  // chart only plots and fetches what the user currently has
  // selected in the filter. Fall back to all four if unspecified.
  // Stable across renders unless the caller actually changes it.
  const fuelsKey = fuels ? fuels.slice().sort().join(',') : '';
  const effectiveFuels: Exclude<FuelType, 'EV'>[] = useMemo(() => {
    if (!fuels || fuels.length === 0) return CHART_FUELS;
    const valid = fuels.filter((f): f is Exclude<FuelType, 'EV'> =>
      (CHART_FUELS as readonly string[]).includes(f),
    );
    return valid.length > 0 ? valid : CHART_FUELS;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelsKey]);

  // Pick which fuel to highlight: explicit prop wins, otherwise fall
  // back to the legacy `fuelType` alias. Normalised to our FuelType
  // union so typing is happy. If the highlight isn't in the effective
  // list, fall back to the first effective fuel.
  const highlight: Exclude<FuelType, 'EV'> = useMemo(() => {
    const raw = (highlightFuel ?? fuelType ?? 'E10').toUpperCase();
    if ((effectiveFuels as readonly string[]).includes(raw)) {
      return raw as Exclude<FuelType, 'EV'>;
    }
    return effectiveFuels[0];
  }, [highlightFuel, fuelType, effectiveFuels]);

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
    setLoading(true);
    setError(false);
    const fuelsParam = effectiveFuels.join(',');
    fetch(apiUrl(`/api/price-history?stationId=${encodeURIComponent(stationId)}&fuelTypes=${fuelsParam}&days=30`))
      .then((res) => res.json())
      .then((json) => {
        setHistories(json.histories || {});
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [inView, stationId, effectiveFuels]);

  // Fuels that actually have ≥2 data points AND are in the effective
  // (caller-requested) set.
  const plottable = useMemo(() => {
    if (!histories) return [] as Exclude<FuelType, 'EV'>[];
    return effectiveFuels.filter((f) => (histories[f]?.length ?? 0) >= 2);
  }, [histories, effectiveFuels]);

  useEffect(() => {
    if (!histories || plottable.length === 0 || !canvasRef.current) return;

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

    // Shared Y-axis across all plotted fuels so their relative levels
    // stay meaningful — if E10 is 138p and Super Diesel is 168p they
    // shouldn't collapse onto the same baseline.
    let min = Infinity;
    let max = -Infinity;
    for (const f of plottable) {
      for (const p of histories[f]!) {
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
      }
    }
    min -= 1.2;
    max += 1.2;
    const range = max - min || 1;

    const padTop = 10;
    const padBottom = 10;
    const padLeft = 4;
    // Reserve room on the right so each line can park its own price
    // label at the end — the user's question is "which line is which
    // price?", so we answer that directly next to the line.
    const padRight = 52;
    const chartH = h - padTop - padBottom;
    const chartW = w - padLeft - padRight;

    ctx.clearRect(0, 0, w, h);

    // ── Horizontal grid lines (subtle) ─────────────────────────
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 1; i < 4; i++) {
      const y = padTop + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const buildPoints = (series: PricePoint[]): [number, number][] =>
      series.map((d, i) => [
        padLeft + (i / Math.max(1, series.length - 1)) * chartW,
        padTop + chartH - ((d.price - min) / range) * chartH,
      ]);

    // Draw non-highlighted lines first (muted) so the bold one sits
    // on top. Order matters for stacking.
    for (const fuel of plottable) {
      if (fuel === highlight) continue;
      const color = FUEL_COLORS[fuel];
      const points = buildPoints(histories[fuel]!);

      // Soft outer halo so the line remains visible on any background
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Actual muted line — still visible, not faded to invisibility
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = color + 'b3'; // ~70% alpha — bold enough to read
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // End-point dot for each non-highlighted fuel so users can
      // trace which colour lands where on the right edge.
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last[0], last[1], 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color + 'cc';
      ctx.fill();
    }

    // Highlighted fuel — gradient fill + thick stroke + glowing dot.
    if (plottable.includes(highlight) && histories[highlight]!.length >= 2) {
      const color = FUEL_COLORS[highlight];
      const points = buildPoints(histories[highlight]!);

      // Gradient fill underneath
      const gradient = ctx.createLinearGradient(0, padTop, 0, h);
      gradient.addColorStop(0, color + '4d'); // ~30% alpha top
      gradient.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(points[0][0], padTop + chartH);
      for (const p of points) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(points[points.length - 1][0], padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Bold stroke with a glow underneath
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color + '80';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // End-point dot with outer ring
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last[0], last[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(last[0], last[1], 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(last[0], last[1], 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // ── End-of-line price labels ───────────────────────────────
    // For each plotted fuel, park its current price in the line's
    // colour at the right edge so the user can instantly see which
    // line maps to which price. De-overlap vertically so close
    // prices (e.g. Premium 175.9p and Diesel 176.2p) stay legible.
    interface EndLabel {
      y: number;
      price: number;
      color: string;
      isHighlight: boolean;
    }
    const endLabels: EndLabel[] = [];
    for (const fuel of plottable) {
      const series = histories[fuel]!;
      const latest = series[series.length - 1].price;
      const y = padTop + chartH - ((latest - min) / range) * chartH;
      endLabels.push({
        y,
        price: latest,
        color: FUEL_COLORS[fuel],
        isHighlight: fuel === highlight,
      });
    }

    // Sort ascending by y and enforce a minimum vertical gap so
    // overlapping labels don't stack on top of each other.
    endLabels.sort((a, b) => a.y - b.y);
    const minGap = 13;
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < minGap) {
        endLabels[i].y = endLabels[i - 1].y + minGap;
      }
    }
    // Clamp within chart bounds
    for (const lbl of endLabels) {
      lbl.y = Math.max(9, Math.min(h - 6, lbl.y));
    }

    // Draw the labels with a white halo so coloured text stays
    // readable on top of any map-style background.
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const lbl of endLabels) {
      const text = `${lbl.price.toFixed(1)}p`;
      const labelX = padLeft + chartW + 6;
      ctx.font = lbl.isHighlight
        ? 'bold 11px ui-sans-serif, system-ui, sans-serif'
        : 'bold 10px ui-sans-serif, system-ui, sans-serif';

      // White outline halo
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, labelX, lbl.y);

      // Coloured fill
      ctx.fillStyle = lbl.color;
      ctx.fillText(text, labelX, lbl.y);
    }
  }, [histories, plottable, highlight]);

  // Placeholder (and observer target) until the card is in view.
  if (!inView || loading) {
    return (
      <div
        ref={containerRef}
        className={`${compact ? 'mt-2 h-[96px]' : 'mt-3 h-[140px]'} rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center`}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        )}
      </div>
    );
  }

  if (error || plottable.length === 0) {
    return null; // No history data at all — hide the chart
  }

  // Delta label for the highlighted fuel (shown as a chip in the header)
  const highlightSeries = histories?.[highlight];
  let diffLabel = '';
  let diffTone: 'up' | 'down' | 'flat' = 'flat';
  if (highlightSeries && highlightSeries.length >= 2) {
    const first = highlightSeries[0].price;
    const latest = highlightSeries[highlightSeries.length - 1].price;
    const diff = latest - first;
    diffLabel = diff > 0 ? `+${diff.toFixed(1)}p` : `${diff.toFixed(1)}p`;
    diffTone = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'flat';
  }

  const highlightColor = FUEL_COLORS[highlight];

  return (
    <div
      className={`${compact ? 'mt-2 p-2' : 'mt-3 p-3'} bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm`}
    >
      {/* Header row */}
      <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-2'}`}>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: highlightColor,
              boxShadow: `0 0 0 2px ${highlightColor}22`,
            }}
          />
          <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold text-gray-800`}>
            {SHORT_LABEL[highlight]} trend
          </span>
          <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-400 font-medium`}>
            · {compact ? '30d' : '30 days'}
          </span>
        </div>
        {diffLabel && plottable.includes(highlight) && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${compact ? 'text-[10px]' : 'text-[11px]'} font-black tabular-nums ${
              diffTone === 'up'
                ? 'bg-red-50 text-red-600'
                : diffTone === 'down'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {diffTone === 'up' && <span className="text-[9px]">▲</span>}
            {diffTone === 'down' && <span className="text-[9px]">▼</span>}
            {diffLabel}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="w-full" style={{ height: compact ? 48 : 96 }} />

      {/* Legend — pill chips, highlighted one filled, rest outline.
          (End-of-line price labels on the chart already show the
          current price for every fuel, so no separate "Today" row.) */}
      <div className={`flex items-center gap-1 flex-wrap ${compact ? 'mt-1.5' : 'mt-2.5'}`}>
        {plottable.map((fuel) => {
          const isHighlight = fuel === highlight;
          const color = FUEL_COLORS[fuel];
          return (
            <div
              key={fuel}
              className={`flex items-center gap-1 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-full ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold transition-all ${
                isHighlight
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
              style={
                isHighlight
                  ? { backgroundColor: color }
                  : undefined
              }
            >
              <span
                className={`inline-block ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full`}
                style={{
                  backgroundColor: isHighlight ? '#ffffff' : color,
                }}
              />
              <span>{SHORT_LABEL[fuel]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
