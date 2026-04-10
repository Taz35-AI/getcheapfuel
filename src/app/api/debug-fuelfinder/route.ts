import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing credentials in env' });
  }

  // Step 1: Get token (correct URL)
  const tokenRes = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  const tokenStatus = tokenRes.status;
  const tokenText = await tokenRes.text();

  if (!tokenRes.ok) {
    return NextResponse.json({ step: 'token_failed', status: tokenStatus, body: tokenText });
  }

  const tokenData = JSON.parse(tokenText);
  const token = tokenData.access_token || tokenData.data?.access_token;

  // Step 2: Fetch first batch of stations
  const stationsRes = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=1', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  const stationsStatus = stationsRes.status;
  const stationsText = await stationsRes.text();

  // Step 3: Fetch first batch of prices
  const pricesRes = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  const pricesStatus = pricesRes.status;
  const pricesText = await pricesRes.text();

  let stationsSample = null;
  let pricesSample = null;
  let stationsCount = 0;
  let pricesCount = 0;

  try {
    const s = JSON.parse(stationsText);
    const arr = Array.isArray(s) ? s : s.stations || s.data || [];
    stationsCount = arr.length;
    stationsSample = arr.slice(0, 2); // just show first 2
  } catch { stationsSample = stationsText.slice(0, 500); }

  try {
    const p = JSON.parse(pricesText);
    const arr = Array.isArray(p) ? p : p.prices || p.data || [];
    pricesCount = arr.length;
    pricesSample = arr.slice(0, 2);
  } catch { pricesSample = pricesText.slice(0, 500); }

  return NextResponse.json({
    token_ok: true,
    token_keys: Object.keys(tokenData),
    stations: { status: stationsStatus, count: stationsCount, sample: stationsSample },
    prices: { status: pricesStatus, count: pricesCount, sample: pricesSample },
  });
}
