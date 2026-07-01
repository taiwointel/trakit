-- Add source column to entries table
-- Values: 'manual' (typed in), 'telegram' (bot), 'import' (CSV/PDF upload)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS source text;
