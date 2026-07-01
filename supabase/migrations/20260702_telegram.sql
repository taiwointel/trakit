-- ── telegram_settings ────────────────────────────────────────────────
-- Stores each user's Telegram bot configuration.
-- bot_token_encrypted: raw token for now (Vault encryption is a TODO).
-- bot_username: @handle returned by Telegram's getMe, stored for display.
-- chat_id: registered when the user sends /start to their bot.
-- webhook_secret: random hex token sent as X-Telegram-Bot-Api-Secret-Token
--   header so we can verify the webhook caller is actually Telegram.

create table if not exists telegram_settings (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users not null unique,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  bot_token_encrypted  text,
  bot_username         text,
  chat_id              text,
  webhook_secret       text
);

alter table telegram_settings enable row level security;

create policy "telegram_settings: owner only"
  on telegram_settings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
