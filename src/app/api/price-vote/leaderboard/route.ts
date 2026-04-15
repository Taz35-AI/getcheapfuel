import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/price-vote/leaderboard?limit=10
// Returns the top contributors ranked by total vote count (all-time).
// Response shape: [{ email, votes, up, down }]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100);

  // Pull every vote and aggregate client-side. For the scale we
  // expect (a few thousand votes a day max) this is fine and saves
  // us needing a SQL view / RPC on the Supabase side.
  const { data, error } = await supabase
    .from('station_price_votes')
    .select('voter_email, vote')
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byUser = new Map<string, { email: string; votes: number; up: number; down: number }>();
  for (const row of data || []) {
    const email = (row.voter_email || '').toLowerCase();
    if (!email) continue;
    const entry = byUser.get(email) || { email, votes: 0, up: 0, down: 0 };
    entry.votes++;
    if (row.vote === 'up') entry.up++;
    if (row.vote === 'down') entry.down++;
    byUser.set(email, entry);
  }

  const leaderboard = Array.from(byUser.values())
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);

  return NextResponse.json({ leaderboard });
}
