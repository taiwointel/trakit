-- AI now runs on a single system-wide Groq key (GROQ_API_KEY env var), not
-- a per-user key entered in Settings. groq_key_encrypted is dead; drop it.
-- claude_key_encrypted stays — Claude is still an optional per-account
-- provider, just with no UI in this app to set it up.
alter table user_ai_settings drop column if exists groq_key_encrypted;
