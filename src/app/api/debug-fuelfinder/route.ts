import { NextResponse } from 'next/server';

const TOKEN_URLS = [
  'https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token',
  'https://fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token',
  'https://www.fuel-finder.service.gov.uk/oauth/token',
  'https://fuel-finder.service.gov.uk/oauth/token',
];

export async function GET() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing credentials in env' });
  }

  const results: Record<string, unknown> = {};

  // Try every possible token URL with the correct format (x-www-form-urlencoded + scope)
  for (const url of TOKEN_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&scope=fuelfinder.read`,
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      results[url] = { status: res.status, body: text.slice(0, 300) };
      if (res.ok) {
        return NextResponse.json({ success: true, working_url: url, response: JSON.parse(text) });
      }
    } catch (e: unknown) {
      results[url] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ success: false, all_attempts: results });
}
