import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');
  const fuelType = searchParams.get('fuelType') || 'E10';
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90);

  if (!stationId) {
    return NextResponse.json({ error: 'stationId is required' }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

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
