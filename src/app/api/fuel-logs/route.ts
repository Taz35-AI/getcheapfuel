import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .order('logged_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, station_name, fuel_type, litres, total_cost, price_per_litre, odometer, notes, logged_at } = body;

  if (!email || !station_name || !fuel_type || !litres || !total_cost || !price_per_litre) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert({
      email: email.toLowerCase().trim(),
      station_name,
      fuel_type,
      litres: Number(litres),
      total_cost: Number(total_cost),
      price_per_litre: Number(price_per_litre),
      odometer: odometer ? Number(odometer) : null,
      notes: notes || null,
      logged_at: logged_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const email = searchParams.get('email');

  if (!id || !email) {
    return NextResponse.json({ error: 'id and email are required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('fuel_logs')
    .delete()
    .eq('id', id)
    .eq('email', email.toLowerCase().trim());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
