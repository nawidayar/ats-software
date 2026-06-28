-- ============================================================================
-- Add a "kind" column to purchases so we can tell apart:
--   'Import' = a shipment from China priced in USD (uses the landed-cost engine)
--   'Local'  = a simple local purchase already priced in AFN
-- Existing rows default to 'Import'.
-- ============================================================================
alter table public.purchases
  add column if not exists kind text not null default 'Import'
  check (kind in ('Import', 'Local'));
