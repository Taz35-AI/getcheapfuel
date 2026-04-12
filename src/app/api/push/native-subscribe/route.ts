import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token, platform, alerts } = await req.json();

    if (!token || !platform) {
      return NextResponse.json({ error: 'Missing token or platform' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Store the native push token using the same push_subscriptions table.
    // We use "native:{token}" as the endpoint to distinguish from web push.
    const endpoint = `native:${token}`;

    const { data: sub, error: subError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          // Native tokens don't use web push keys — store platform info instead
          keys_p256dh: platform,
          keys_auth: 'native',
        },
        { onConflict: 'endpoint' }
      )
      .select('id')
      .single();

    if (subError) {
      console.error('Native subscription error:', subError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    // Delete existing alerts for this subscription, then insert new ones
    await supabase
      .from('price_alerts')
      .delete()
      .eq('subscription_id', sub.id);

    if (alerts && alerts.length > 0) {
      const alertRows = alerts.map((a: { fuelType: string; threshold: number }) => ({
        subscription_id: sub.id,
        fuel_type: a.fuelType,
        threshold: a.threshold,
        enabled: true,
      }));

      const { error: alertError } = await supabase
        .from('price_alerts')
        .insert(alertRows);

      if (alertError) {
        console.error('Alert insert error:', alertError);
        return NextResponse.json({ error: 'Failed to save alerts' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, alertCount: alerts?.length ?? 0 });
  } catch (err) {
    console.error('Native subscribe error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
