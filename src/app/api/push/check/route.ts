import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:alerts@getcheapfuel.co.uk',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Protect this endpoint with a secret so only cron can call it
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();

  try {
    // 1. Get all enabled alerts with their subscriptions
    const { data: alerts, error: alertError } = await supabase
      .from('price_alerts')
      .select('*, push_subscriptions(*)')
      .eq('enabled', true);

    if (alertError || !alerts?.length) {
      return NextResponse.json({ checked: 0, sent: 0 });
    }

    // 2. Get unique fuel types that have alerts
    const fuelTypes = [...new Set(alerts.map(a => a.fuel_type))];

    // 3. Fetch current cheapest prices from the CMA feed
    // Use a central UK location with a large radius to get a broad price picture
    const priceRes = await fetch(
      `${req.nextUrl.origin}/api/fuel-prices?lat=52.5&lng=-1.5&radius=50`
    );
    const priceData = await priceRes.json();
    const stations = priceData.stations || [];

    if (stations.length === 0) {
      return NextResponse.json({ checked: alerts.length, sent: 0 });
    }

    // Find cheapest price per fuel type
    const cheapest: Record<string, number> = {};
    for (const fuel of fuelTypes) {
      const prices = stations
        .map((s: Record<string, Record<string, number | null>>) => s.prices?.[fuel])
        .filter((p: number | null): p is number => p != null);
      if (prices.length > 0) {
        cheapest[fuel] = Math.min(...prices);
      }
    }

    // 4. Check each alert and send notifications
    let sent = 0;
    const failed: string[] = [];

    for (const alert of alerts) {
      const currentPrice = cheapest[alert.fuel_type];
      if (currentPrice == null) continue;

      // Price is below threshold — send notification
      if (currentPrice < alert.threshold) {
        const sub = alert.push_subscriptions;
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        };

        const fuelLabels: Record<string, string> = {
          E10: 'Unleaded (E10)',
          E5: 'Premium (E5)',
          B7: 'Diesel (B7)',
          SDV: 'Super Diesel',
        };

        const payload = JSON.stringify({
          title: 'Price Drop Alert!',
          body: `${fuelLabels[alert.fuel_type] || alert.fuel_type} dropped to ${currentPrice.toFixed(1)}p — below your ${alert.threshold}p target`,
          url: '/',
        });

        try {
          await webpush.sendNotification(pushSub, payload);
          sent++;
        } catch (err: unknown) {
          const pushErr = err as { statusCode?: number };
          // 410 = subscription expired, clean it up
          if (pushErr.statusCode === 410) {
            failed.push(sub.id);
          }
          console.error('Push failed:', err);
        }
      }
    }

    // Clean up expired subscriptions
    if (failed.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', failed);
    }

    return NextResponse.json({ checked: alerts.length, sent, cleaned: failed.length });
  } catch (err) {
    console.error('Check error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
