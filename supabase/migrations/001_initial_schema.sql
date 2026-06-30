-- ============================================================
-- Ledger — full schema (run once in Supabase SQL editor)
-- All tables are RLS-protected to auth.uid() = user_id
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── entries ─────────────────────────────────────────────────
create table if not exists entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  date            date not null,
  "desc"          text not null,
  amount          numeric(14,2) not null,
  flow            text not null check (flow in ('in','out')),
  beneficiary     text,
  category        text,
  subcategory     text,
  essentiality    text,
  nature          text,
  confidence      numeric,
  note            text,
  status          text not null default 'pending' check (status in ('pending','done','fallback'))
);

alter table entries enable row level security;
create policy "entries: owner only" on entries
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── budgets ──────────────────────────────────────────────────
create table if not exists budgets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null unique,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  overall           numeric,
  category_budgets  jsonb default '{}'::jsonb
);

alter table budgets enable row level security;
create policy "budgets: owner only" on budgets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── cash_balance ─────────────────────────────────────────────
create table if not exists cash_balance (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null unique,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  anchor_date   date,
  anchor_amount numeric not null default 0
);

alter table cash_balance enable row level security;
create policy "cash_balance: owner only" on cash_balance
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── investments ──────────────────────────────────────────────
create table if not exists investments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users not null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  type                  text not null,
  label                 text not null,
  "group"               text not null check ("group" in ('maturity','balance','life','pension')),
  -- maturity group
  principal             numeric,
  rate                  numeric,
  tenor_days            integer,
  purchase_date         date,
  -- balance group
  mark_value            numeric,
  -- life assurance
  monthly_premium       numeric,
  start_date            date,
  -- pension
  monthly_contribution  numeric,
  balance               numeric,
  last_accrual_month    text,
  last_payment_date     date
);

alter table investments enable row level security;
create policy "investments: owner only" on investments
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── investment_transactions ──────────────────────────────────
create table if not exists investment_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  investment_id   uuid references investments(id) on delete cascade not null,
  created_at      timestamptz default now(),
  date            date,
  type            text not null,
  amount          numeric not null,
  month           text
);

alter table investment_transactions enable row level security;
create policy "investment_transactions: owner only" on investment_transactions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── goals ────────────────────────────────────────────────────
create table if not exists goals (
  id                              uuid primary key default gen_random_uuid(),
  user_id                         uuid references auth.users not null unique,
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now(),
  salary                          numeric,
  payday_day                      integer not null default 22,
  emergency_fund_target_override  numeric
);

alter table goals enable row level security;
create policy "goals: owner only" on goals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── emergency_fund_transactions ──────────────────────────────
create table if not exists emergency_fund_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  created_at  timestamptz default now(),
  date        date not null,
  type        text not null check (type in ('deposit','withdrawal')),
  amount      numeric not null,
  note        text
);

alter table emergency_fund_transactions enable row level security;
create policy "emergency_fund_transactions: owner only" on emergency_fund_transactions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── custom_goals ─────────────────────────────────────────────
create table if not exists custom_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  name            text not null,
  target_amount   numeric not null,
  target_date     date not null,
  saved_so_far    numeric not null default 0
);

alter table custom_goals enable row level security;
create policy "custom_goals: owner only" on custom_goals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_ai_settings ─────────────────────────────────────────
create table if not exists user_ai_settings (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users not null unique,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  provider                text not null default 'gemini' check (provider in ('gemini','groq','claude')),
  gemini_key_encrypted    text,
  groq_key_encrypted      text,
  claude_key_encrypted    text
);

alter table user_ai_settings enable row level security;
create policy "user_ai_settings: owner only" on user_ai_settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── coach_sessions ───────────────────────────────────────────
create table if not exists coach_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  created_at  timestamptz default now(),
  from_date   date not null,
  to_date     date not null,
  data        jsonb not null
);

alter table coach_sessions enable row level security;
create policy "coach_sessions: owner only" on coach_sessions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── chat_messages ─────────────────────────────────────────────
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  created_at  timestamptz default now(),
  role        text not null check (role in ('user','assistant')),
  content     text not null
);

alter table chat_messages enable row level security;
create policy "chat_messages: owner only" on chat_messages
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── updated_at triggers ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_updated_at             before update on entries             for each row execute function set_updated_at();
create trigger budgets_updated_at             before update on budgets             for each row execute function set_updated_at();
create trigger cash_balance_updated_at        before update on cash_balance        for each row execute function set_updated_at();
create trigger investments_updated_at         before update on investments         for each row execute function set_updated_at();
create trigger goals_updated_at               before update on goals               for each row execute function set_updated_at();
create trigger custom_goals_updated_at        before update on custom_goals        for each row execute function set_updated_at();
create trigger user_ai_settings_updated_at    before update on user_ai_settings    for each row execute function set_updated_at();
