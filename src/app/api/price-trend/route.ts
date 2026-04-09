import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fuelType = searchParams.get('fuelType') || 'E10';

  // Get daily average prices across all stations for the last 14 days
  const since = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('price_history')
    .select('price, snapshot_date')
    .eq('fuel_type', fuelType)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true });

  if (error || !data || data.length === 0) {
    return NextResponse.json({ trend: null });
  }

  // Group by date and calculate daily averages
  const byDate: Record<string, number[]> = {};
  for (const row of data) {
    const d = row.snapshot_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row.price);
  }

  const dailyAvgs = Object.entries(byDate)
    .map(([date, prices]) => ({
      date,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dailyAvgs.length < 2) {
    return NextResponse.json({ trend: null });
  }

  // Compare recent half vs earlier half
  const mid = Math.floor(dailyAvgs.length / 2);
  const earlier = dailyAvgs.slice(0, mid);
  const recent = dailyAvgs.slice(mid);

  const earlierAvg = earlier.reduce((s, d) => s + d.avg, 0) / earlier.length;
  const recentAvg = recent.reduce((s, d) => s + d.avg, 0) / recent.length;
  const diff = recentAvg - earlierAvg;
  const latestPrice = dailyAvgs[dailyAvgs.length - 1].avg;

  // Determine trend: >0.3p change is significant
  let direction: 'rising' | 'falling' | 'stable';
  if (diff > 0.3) direction = 'rising';
  else if (diff < -0.3) direction = 'falling';
  else direction = 'stable';

  return NextResponse.json({
    trend: {
      direction,
      diff: Math.round(diff * 10) / 10,
      currentAvg: Math.round(latestPrice * 10) / 10,
      days: dailyAvgs.length,
      fuelType,
    },
  });
}
