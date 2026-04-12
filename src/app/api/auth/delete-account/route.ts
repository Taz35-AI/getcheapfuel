import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify the user's JWT from the Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // Create a client with the user's token to get their identity
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Service role client to delete user data and account
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete user's fuel logs (keyed by email)
    if (user.email) {
      await adminClient
        .from('fuel_logs')
        .delete()
        .eq('email', user.email);
    }

    // Delete user's push subscriptions and associated alerts
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('id')
      .like('endpoint', `%${user.email || user.id}%`);

    if (subs && subs.length > 0) {
      const subIds = subs.map(s => s.id);
      await adminClient.from('price_alerts').delete().in('subscription_id', subIds);
      await adminClient.from('push_subscriptions').delete().in('id', subIds);
    }

    // Delete the auth user account
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
