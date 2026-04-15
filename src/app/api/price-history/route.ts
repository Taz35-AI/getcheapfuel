import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_FUELS = ['E10', 'E5', 'B7', 'SDV'] as const;
type Fuel = (typeof VALID_FUELS)[number];

interface HistoryRow {
  price: number;
  snapshot_date: string;
  fuel_type: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');
  // Support both single-fuel (backwards compat) and multi-fuel
  // requests. Multi-fuel returns a `histories` object keyed by fuel
  // type so the trend chart can draw all lines in one round-trip.
  const fuelTypesParam = searchParams.get('fuelTypes');
  const fuelType = searchParams.get('fuelType') || 'E10';
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90);

  if (!stationId) {
    return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  // ── Multi-fuel path ───────────────────────────────────────────────
  if (fuelTypesParam) {
    const requested = fuelTypesParam
      .split(',')
      .map((f) => f.trim().toUpperCase())
      .filter((f): f is Fuel => (VALID_FUELS as readonly string[]).includes(f));

    if (requested.length === 0) {
      return NextResponse.json({ stationId, histories: {} });
    }

    const { data, error } = await supabase
      .from('price_history')
      .select('price, snapshot_date, fuel_type')
      .eq('station_id', stationId)
      .in('fuel_type', requested)
      .gte('snapshot_date', since)
      .order('snapshot_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const histories: Partial<Record<Fuel, { price: number; snapshot_date: string }[]>> = {};
    for (const f of requested) histories[f] = [];
    for (const row of (data || []) as HistoryRow[]) {
      const f = row.fuel_type as Fuel;
      if (histories[f]) {
        histories[f]!.push({ price: row.price, snapshot_date: row.snapshot_date });
      }
    }

    return NextResponse.json({ stationId, histories });
  }

  // ── Single-fuel path (legacy) ────────────────────────────────────
  const { data, error } = await supabase
    .from('price_history')
    .select('price, snapshot_date')
    .eq('station_id', stationId)
    .eq('fuel_type', fuelType)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    stationId,
    fuelType,
    history: data || [],
  });
}
