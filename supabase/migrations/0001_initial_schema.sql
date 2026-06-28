-- ============================================================================
-- ATS Software — Initial database schema
-- ============================================================================
-- This script creates every table for the app and turns on the privacy rules
-- (Row Level Security) so each business can only ever see its OWN data.
--
-- It is SAFE to run more than once: it only creates things that don't exist.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. FOUNDATION: businesses + profiles (the multi-business privacy system)
-- ----------------------------------------------------------------------------

-- One row per company/account that signs up.
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'My Business',
  created_at  timestamptz not null default now()
);

-- Connects each login (auth user) to exactly one business.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Helper: returns the business_id of whoever is currently logged in.
-- Used by every privacy rule below. "security definer" lets it read the
-- profiles table safely without tripping over the privacy rules themselves.
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

-- Auto-setup: when a new user signs up, create their business drawer and
-- link their login to it automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
begin
  insert into public.businesses (name)
  values (coalesce(new.raw_user_meta_data ->> 'business_name', 'My Business'))
  returning id into new_business_id;

  insert into public.profiles (id, business_id, full_name)
  values (new.id, new_business_id, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. PRODUCTS
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  sku              text,
  name             text,
  category         text,
  supplier         text,
  type             text check (type in ('Imported', 'Local')),
  landed_cost_afn  numeric(14, 2),
  margin_percent   numeric(7, 2),
  selling_price    numeric(14, 2),
  opening_quantity numeric(14, 2) default 0,
  current_stock    numeric(14, 2) default 0,
  created_at       timestamptz not null default now(),
  unique (business_id, sku)
);


-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  name           text,
  phone          text,                 -- phone / WhatsApp
  city           text,
  notes          text,
  follow_up_date date,
  created_at     timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 4. SALES
-- ----------------------------------------------------------------------------
-- unit_cost = the cost of one unit AT THE TIME OF SALE. We store it on the
-- sale so cost-of-goods stays correct even if the product's cost changes
-- later. revenue / cogs / gross_profit / balance_due are auto-calculated.
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  date           date not null default current_date,
  invoice_number text,
  customer_id    uuid references public.customers (id) on delete set null,
  product_id     uuid references public.products (id) on delete set null,
  quantity       numeric(14, 2) default 0,
  unit_price     numeric(14, 2) default 0,
  unit_cost      numeric(14, 2) default 0,
  payment_status text check (payment_status in ('Paid', 'Credit', 'Partial')),
  amount_paid    numeric(14, 2) default 0,

  -- auto-calculated columns:
  revenue      numeric(14, 2) generated always as
                 (coalesce(quantity, 0) * coalesce(unit_price, 0)) stored,
  cogs         numeric(14, 2) generated always as
                 (coalesce(quantity, 0) * coalesce(unit_cost, 0)) stored,
  gross_profit numeric(14, 2) generated always as
                 (coalesce(quantity, 0) * coalesce(unit_price, 0)
                  - coalesce(quantity, 0) * coalesce(unit_cost, 0)) stored,
  balance_due  numeric(14, 2) generated always as
                 (coalesce(quantity, 0) * coalesce(unit_price, 0)
                  - coalesce(amount_paid, 0)) stored,

  created_at   timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 5. PURCHASES
-- ----------------------------------------------------------------------------
-- Costs are entered in USD; the USD->AFN rate converts to local currency.
-- total_landed_cost_afn and landed_cost_per_unit_afn are auto-calculated.
create table if not exists public.purchases (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  date             date not null default current_date,
  shipment_number  text,
  supplier         text,
  product_id       uuid references public.products (id) on delete set null,
  quantity         numeric(14, 2) default 0,
  product_cost_usd numeric(14, 2) default 0,
  china_inland_usd numeric(14, 2) default 0,
  freight_usd      numeric(14, 2) default 0,
  usd_afn_rate     numeric(14, 4) default 0,

  -- auto-calculated columns:
  total_landed_cost_afn numeric(16, 2) generated always as
    ((coalesce(product_cost_usd, 0) + coalesce(china_inland_usd, 0)
      + coalesce(freight_usd, 0)) * coalesce(usd_afn_rate, 0)) stored,
  landed_cost_per_unit_afn numeric(16, 4) generated always as
    (((coalesce(product_cost_usd, 0) + coalesce(china_inland_usd, 0)
      + coalesce(freight_usd, 0)) * coalesce(usd_afn_rate, 0))
      / nullif(quantity, 0)) stored,

  created_at       timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 6. EXPENSES
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  date        date not null default current_date,
  category    text,
  description text,
  quantity    numeric(14, 2),
  unit_cost   numeric(14, 2),
  amount      numeric(14, 2),
  created_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 7. RECEIVABLES (money owed TO you)
-- ----------------------------------------------------------------------------
create table if not exists public.receivables (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  date            date not null default current_date,
  customer_id     uuid references public.customers (id) on delete set null,
  invoice         text,
  type            text check (type in
                    ('Credit Sale', 'Refund', 'Exchange',
                     'Replacement', 'Payment Received')),
  amount_due      numeric(14, 2) default 0,
  amount_received numeric(14, 2) default 0,
  balance         numeric(14, 2) generated always as
                    (coalesce(amount_due, 0) - coalesce(amount_received, 0)) stored,
  status          text,
  created_at      timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 8. PAYABLES (money YOU owe)
-- ----------------------------------------------------------------------------
create table if not exists public.payables (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  date           date not null default current_date,
  supplier_payee text,
  reference      text,
  type           text,
  amount_owed    numeric(14, 2) default 0,
  amount_paid    numeric(14, 2) default 0,
  balance        numeric(14, 2) generated always as
                   (coalesce(amount_owed, 0) - coalesce(amount_paid, 0)) stored,
  status         text,
  created_at     timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 9. ASSETS
-- ----------------------------------------------------------------------------
-- annual_depreciation is simple same-row math (auto-calculated here).
-- net book value depends on TODAY'S date, so it is calculated in the view
-- "assets_with_values" below (a column can't change by itself over time).
create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  asset_name          text,
  category            text,
  purchase_date       date,
  cost                numeric(14, 2) default 0,
  useful_life_years   numeric(7, 2),
  annual_depreciation numeric(14, 2) generated always as
                        (coalesce(cost, 0) / nullif(useful_life_years, 0)) stored,
  created_at          timestamptz not null default now()
);

-- View that adds the live "net book value" (current worth after depreciation).
-- security_invoker = on means it respects the same privacy rules as the table.
create or replace view public.assets_with_values
with (security_invoker = on) as
select
  a.*,
  greatest(0, (current_date - a.purchase_date) / 365.25) as years_elapsed,
  greatest(
    0,
    a.cost - coalesce(a.annual_depreciation, 0)
      * least(
          coalesce(a.useful_life_years, 0),
          greatest(0, (current_date - a.purchase_date) / 365.25)
        )
  ) as net_book_value
from public.assets a;


-- ============================================================================
-- PRIVACY RULES (Row Level Security)
-- Turn on RLS for every table, then add the rule:
--   "you may only touch rows that belong to your own business".
-- ============================================================================

alter table public.businesses  enable row level security;
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.customers   enable row level security;
alter table public.sales       enable row level security;
alter table public.purchases   enable row level security;
alter table public.expenses    enable row level security;
alter table public.receivables enable row level security;
alter table public.payables    enable row level security;
alter table public.assets      enable row level security;

-- businesses: a member can see/update only their own business.
drop policy if exists "members read business" on public.businesses;
create policy "members read business" on public.businesses
  for select using (id = public.current_business_id());

drop policy if exists "members update business" on public.businesses;
create policy "members update business" on public.businesses
  for update using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- profiles: a user can see/update only their own profile row.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- All data tables share the same rule: row.business_id must equal mine.
-- "for all" covers read, insert, update, and delete in one policy.
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'customers', 'sales', 'purchases',
    'expenses', 'receivables', 'payables', 'assets'
  ]
  loop
    execute format('drop policy if exists "tenant access" on public.%I;', t);
    execute format(
      'create policy "tenant access" on public.%I
         for all
         using (business_id = public.current_business_id())
         with check (business_id = public.current_business_id());', t);
  end loop;
end $$;

-- ============================================================================
-- End of schema.
-- ============================================================================
