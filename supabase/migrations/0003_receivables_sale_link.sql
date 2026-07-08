-- Links a receivable back to the sale that created it, so that editing a
-- Credit/Partial sale can find and update (or remove) the matching "who owes
-- me" entry instead of leaving a stale duplicate behind.
alter table public.receivables
  add column if not exists sale_id uuid
    references public.sales (id) on delete cascade;

-- Refresh PostgREST's cached view of the tables so the new column is usable.
notify pgrst, 'reload schema';
