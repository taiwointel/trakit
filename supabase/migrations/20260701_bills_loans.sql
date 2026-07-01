-- Bills
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  amount numeric(14,2) not null,
  due_day integer not null check (due_day between 1 and 31),
  category text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.bills enable row level security;
create policy "Users own their bills" on public.bills for all using (auth.uid() = user_id);

-- Bill payments
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  bill_id uuid references public.bills not null,
  due_month text not null,
  paid_at date,
  amount numeric(14,2) not null,
  created_at timestamptz default now()
);
alter table public.bill_payments enable row level security;
create policy "Users own their bill_payments" on public.bill_payments for all using (auth.uid() = user_id);

-- Loans
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  principal numeric(14,2) not null,
  interest_rate numeric(5,2) not null,
  term_months integer not null,
  start_date date not null,
  notes text,
  created_at timestamptz default now()
);
alter table public.loans enable row level security;
create policy "Users own their loans" on public.loans for all using (auth.uid() = user_id);
