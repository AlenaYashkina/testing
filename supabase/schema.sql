create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  retailcrm_id bigint not null unique,
  external_id text not null unique,
  order_number text not null,
  site text,
  status text,
  order_method text,
  created_at timestamptz not null,
  total_amount numeric(12, 2) not null default 0,
  currency text not null default 'KZT',
  customer_name text not null,
  customer_phone text,
  customer_email text,
  city text,
  items_count integer not null default 0,
  item_names text[] not null default '{}',
  synced_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_total_amount_idx on public.orders (total_amount desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.telegram_notifications (
  id uuid primary key default gen_random_uuid(),
  order_external_id text not null unique references public.orders (external_id) on delete cascade,
  retailcrm_id bigint not null,
  total_amount numeric(12, 2) not null,
  telegram_chat_id text not null,
  telegram_message_id bigint not null,
  message_text text not null,
  sent_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_notifications_sent_at_idx
  on public.telegram_notifications (sent_at desc);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  source text not null,
  imported_count integer not null default 0,
  upserted_count integer not null default 0,
  notified_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz not null
);

create index if not exists sync_runs_created_at_idx
  on public.sync_runs (created_at desc);

alter table public.orders enable row level security;
alter table public.sync_runs enable row level security;
alter table public.telegram_notifications enable row level security;

do $$
begin
  create policy "Public can read orders"
    on public.orders
    for select
    to anon
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public can read sync runs"
    on public.sync_runs
    for select
    to anon
    using (true);
exception
  when duplicate_object then null;
end $$;
