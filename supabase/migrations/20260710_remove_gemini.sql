-- Gemini has been fully removed as an AI provider — Groq is now the sole
-- default (with Claude still available as an optional paid alternative).
-- Groq's qwen/qwen3.6-27b vision model replaces Gemini for image-based
-- statement extraction and chat file attachments, so nothing is lost.

-- Any account still set to 'gemini' (or with no provider row at all) moves
-- to 'groq' before the CHECK constraint below stops allowing 'gemini' as a
-- value — otherwise this migration would fail against existing data.
update user_ai_settings set provider = 'groq' where provider = 'gemini';

alter table user_ai_settings drop constraint if exists user_ai_settings_provider_check;
alter table user_ai_settings alter column provider set default 'groq';
alter table user_ai_settings add constraint user_ai_settings_provider_check
  check (provider in ('groq','claude'));

alter table user_ai_settings drop column if exists gemini_key_encrypted;
