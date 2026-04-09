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
