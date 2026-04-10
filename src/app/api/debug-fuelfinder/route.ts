import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing credentials in env' });
  }

  // Step 1: Get token - correct endpoint and JSON body
  let token: string | null = null;
  try {
    const tokenRes = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_secret_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(10000),
    });
    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      return NextResponse.json({ step: 'token_failed', status: tokenRes.status, body: tokenText });
    }
    const tokenData = JSON.parse(tokenText);
    token = tokenData?.data?.access_token || tokenData?.access_token;
    if (!token) {
      return NextResponse.json({ step: 'no_token_in_response', raw: tokenData });
    }
  } catch (e: unknown) {
    return NextResponse.json({ step: 'token_fetch_error', error: e instanceof Error ? e.message : String(e) });
  }

  // Step 2: Fetch stations batch 1
  let stationsSample = null;
  let stationsStatus = 0;
  let stationsCount = 0;
  try {
    const res = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=1', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    stationsStatus = res.status;
    const text = await res.text();
    const arr = JSON.parse(text);
    stationsCount = Array.isArray(arr) ? arr.length : arr?.data?.length ?? 0;
    const data = Array.isArray(arr) ? arr : arr?.data ?? [];
    stationsSample = data.slice(0, 2);
  } catch (e: unknown) {
    stationsSample = e instanceof Error ? e.message : String(e);
  }

  // Step 3: Fetch prices batch 1
  let pricesSample = null;
  let pricesStatus = 0;
  let pricesCount = 0;
  try {
    const res = await fetch('https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    pricesStatus = res.status;
    const text = await res.text();
    const arr = JSON.parse(text);
    pricesCount = Array.isArray(arr) ? arr.length : arr?.data?.length ?? 0;
    const data = Array.isArray(arr) ? arr : arr?.data ?? [];
    pricesSample = data.slice(0, 2);
  } catch (e: unknown) {
    pricesSample = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    token_ok: true,
    stations: { status: stationsStatus, count: stationsCount, sample: stationsSample },
    prices: { status: pricesStatus, count: pricesCount, sample: pricesSample },
  });
}
