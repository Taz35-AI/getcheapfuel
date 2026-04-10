import { NextResponse } from 'next/server';

const TOKEN_URLS = [
  'https://api.fuelfinder.service.gov.uk/v1/oauth/token',
  'https://api.fuelfinder.service.gov.uk/v1/oauth/generate_access_token',
  'https://api.fuelfinder.service.gov.uk/oauth/token',
  'https://api.fuelfinder.service.gov.uk/oauth/generate_access_token',
];

export async function GET() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing credentials in env' });
  }

  const results: Record<string, unknown> = {};

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
        const tokenData = JSON.parse(text);
        const token = tokenData.access_token;

        // Try fetching stations with this working token
        const stationsRes = await fetch('https://api.fuelfinder.service.gov.uk/v1/pfs?batch-number=1', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        const stationsText = await stationsRes.text();

        return NextResponse.json({
          success: true,
          working_token_url: url,
          token_response: tokenData,
          stations_status: stationsRes.status,
          stations_sample: stationsText.slice(0, 500),
        });
      }
    } catch (e: unknown) {
      results[url] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ success: false, all_attempts: results });
}
