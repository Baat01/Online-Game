-- Phase 8: Peer-to-Peer Yen Transfers & Cosmetic Shop Transactions
-- Table: public.yen_transactions

create table if not exists public.yen_transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid references public.profiles(id) on delete set null,
  amount integer not null check (amount > 0),
  transaction_type text not null default 'transfer' check (transaction_type in ('transfer', 'shop_purchase', 'admin_grant')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists yen_transactions_sender_idx on public.yen_transactions (sender_id, created_at desc);
create index if not exists yen_transactions_recipient_idx on public.yen_transactions (recipient_id, created_at desc);

alter table public.yen_transactions enable row level security;

create policy "Users view own yen transactions"
  on public.yen_transactions for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users insert own yen transactions"
  on public.yen_transactions for insert
  with check (auth.uid() = sender_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.yen_transactions;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
