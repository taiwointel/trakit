-- Tags each imported entry with the source file it came from, so a user can
-- filter the ledger down to one import (per month, since the ledger is
-- viewed month-by-month) and bulk-delete just that batch if it was wrong.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS import_batch text;
