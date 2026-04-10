import { NextResponse } from 'next/server';
import type { EVCharger } from '@/lib/types';

// Open Charge Map API - free, community-sourced EV charger data
const OCM_API = 'https://api.openchargemap.io/v3/poi/';

interface OCMConnection {
  ConnectionType?: { Title?: string };
  PowerKW?: number;
  Quantity?: number;
  StatusType?: { Title?: string };
}

interface OCMResult {
  ID: number;
  AddressInfo: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    Postcode?: string;
    Latitude: number;
    Longitude: number;
  };
  Connections?: OCMConnection[];
  OperatorInfo?: { Title?: string };
  UsageCost?: string;
  StatusType?: { IsOperational?: boolean };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat') || '54.5';
  const lng = searchParams.get('lng') || '-2';
  const radius = searchParams.get('radius') || '10';
  const apiKey = process.env.OCM_API_KEY || '';

  const params = new URLSearchParams({
    output: 'json',
    countrycode: 'GB',
    latitude: lat,
    longitude: lng,
    distance: radius,
    distanceunit: 'KM',
    maxresults: '100',
    compact: 'true',
    verbose: 'false',
  });
  if (apiKey) params.set('key', apiKey);

  try {
    const response = await fetch(`${OCM_API}?${params}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ chargers: [], total: 0 });
    }
    const data: OCMResult[] = await response.json();

    const chargers: EVCharger[] = data.map(item => ({
      id: `ocm-${item.ID}`,
      title: item.AddressInfo?.Title || 'EV Charger',
      address: [item.AddressInfo?.AddressLine1, item.AddressInfo?.Town]
        .filter(Boolean).join(', '),
      postcode: item.AddressInfo?.Postcode || '',
      latitude: item.AddressInfo?.Latitude,
      longitude: item.AddressInfo?.Longitude,
      connections: (item.Connections || []).map(c => ({
        type: c.ConnectionType?.Title || 'Unknown',
        powerKW: c.PowerKW || 0,
        quantity: c.Quantity || 1,
        status: c.StatusType?.Title || 'Unknown',
      })),
      operator: item.OperatorInfo?.Title || 'Unknown',
      usageCost: item.UsageCost || undefined,
      isOperational: item.StatusType?.IsOperational !== false,
      source: 'ocm' as const,
    }));

    return NextResponse.json(
      { chargers, total: chargers.length },
      {
        headers: {
          // Cache at Vercel's edge for 10 minutes (EV data changes slowly)
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      }
    );
  } catch {
    console.error('Failed to fetch EV charger data');
    return NextResponse.json({ chargers: [], total: 0 });
  }
}
