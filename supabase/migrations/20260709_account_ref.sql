-- Groups entries by which real bank account they came from (e.g.
-- "opay:7066256952", "access:0123456789"), so cash balance can be computed
-- correctly when a user has more than one bank imported: each account's
-- own bank-reported balance_after only tells you that ONE account's total,
-- not the user's combined cash across every account. Nullable — manual
-- entries and PalmPay (no account number captured yet) fall back to the
-- single shared anchor.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS account_ref text;
