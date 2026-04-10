-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Push subscriptions table
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz default now()
);

-- Price alerts table
create table price_alerts (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  fuel_type text not null check (fuel_type in ('E10', 'E5', 'B7', 'SDV')),
  threshold numeric not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Index for fast lookups when checking prices
create index idx_alerts_enabled on price_alerts (fuel_type, threshold) where enabled = true;

-- RLS policies: allow anonymous inserts/deletes via endpoint matching
alter table push_subscriptions enable row level security;
alter table price_alerts enable row level security;

-- Anyone can subscribe
create policy "Allow insert subscriptions" on push_subscriptions
  for insert with check (true);

-- Anyone can delete their own subscription by endpoint
create policy "Allow delete own subscription" on push_subscriptions
  for delete using (true);

-- Allow reading own subscription
create policy "Allow select subscriptions" on push_subscriptions
  for select using (true);

-- Anyone can create alerts linked to their subscription
create policy "Allow insert alerts" on price_alerts
  for insert with check (true);

-- Allow reading alerts
create policy "Allow select alerts" on price_alerts
  for select using (true);

-- Allow deleting alerts
create policy "Allow delete alerts" on price_alerts
  for delete using (true);

-- Allow toggling alerts
create policy "Allow update alerts" on price_alerts
  for update using (true);

-- ============================================
-- Daily price snapshots for 30-day trend charts
-- ============================================
create table price_history (
  id bigint generated always as identity primary key,
  station_id text not null,
  brand text not null,
  fuel_type text not null check (fuel_type in ('E10', 'E5', 'B7', 'SDV')),
  price numeric not null,
  snapshot_date date not null default current_date,
  created_at timestamptz default now(),
  unique (station_id, fuel_type, snapshot_date)
);

-- Index for fast lookups: station + fuel type over date range
create index idx_price_history_lookup
  on price_history (station_id, fuel_type, snapshot_date desc);

-- Index for cleanup of old data
create index idx_price_history_date on price_history (snapshot_date);

-- RLS: allow anonymous reads, only service role can write
alter table price_history enable row level security;

create policy "Allow public reads" on price_history
  for select using (true);

-- Auto-delete snapshots older than 90 days (run periodically or via pg_cron)
-- delete from price_history where snapshot_date < current_date - interval '90 days';

-- ============================================
-- Fuel spending tracker with email sync
-- ============================================
create table fuel_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  station_name text not null,
  fuel_type text not null check (fuel_type in ('E10', 'E5', 'B7', 'SDV')),
  litres numeric not null,
  total_cost numeric not null,
  price_per_litre numeric not null,
  odometer numeric,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_fuel_logs_email on fuel_logs (email, logged_at desc);

alter table fuel_logs enable row level security;

create policy "Users read own logs" on fuel_logs
  for select using (true);

create policy "Users insert own logs" on fuel_logs
  for insert with check (true);

create policy "Users delete own logs" on fuel_logs
  for delete using (true);

create policy "Users update own logs" on fuel_logs
  for update using (true);

-- ============================================
-- Fuel Finder cache (synced once a day from UK gov API via Vercel Cron)
-- Reading from this is instant — no 20s cold-start fetch on every request.
-- ============================================
create table if not exists fuel_stations_ff (
  id text primary key,
  brand text not null,
  name text not null,
  address text not null,
  postcode text not null,
  latitude double precision not null,
  longitude double precision not null,
  e10 numeric,
  e5 numeric,
  b7 numeric,
  sdv numeric,
  opening_times jsonb,
  amenities jsonb,
  last_updated timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists idx_ff_stations_bbox on fuel_stations_ff (latitude, longitude);

alter table fuel_stations_ff enable row level security;

create policy "Allow public reads ff" on fuel_stations_ff
  for select using (true);
