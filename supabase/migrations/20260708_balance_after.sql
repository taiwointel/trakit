-- Bank statements (OPay, Access) print the real running balance after every
-- transaction — the parsers already extract it for internal validation but
-- discarded it before now. Capturing it lets the cash balance calculation
-- use the bank's own reported balance as ground truth wherever available,
-- instead of relying entirely on a single manually-typed anchor for every
-- single day. Nullable: PalmPay statements carry no balance column, and
-- manually-typed entries have no bank-verified figure either.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS balance_after numeric;
