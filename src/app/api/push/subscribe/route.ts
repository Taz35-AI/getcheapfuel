import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const { subscription, alerts } = await req.json();

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Upsert subscription (update keys if endpoint already exists)
    const { data: sub, error: subError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
        },
        { onConflict: 'endpoint' }
      )
      .select('id')
      .single();

    if (subError) {
      console.error('Subscription error:', subError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    // Delete old alerts for this subscription, then insert new ones
    await supabase
      .from('price_alerts')
      .delete()
      .eq('subscription_id', sub.id);

    if (alerts && alerts.length > 0) {
      const rows = alerts.map((a: { fuelType: string; threshold: number }) => ({
        subscription_id: sub.id,
        fuel_type: a.fuelType,
        threshold: a.threshold,
        enabled: true,
      }));

      const { error: alertError } = await supabase
        .from('price_alerts')
        .insert(rows);

      if (alertError) {
        console.error('Alert error:', alertError);
        return NextResponse.json({ error: 'Failed to save alerts' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, subscriptionId: sub.id });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
