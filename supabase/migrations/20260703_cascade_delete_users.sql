-- Fix: add ON DELETE CASCADE to every user_id FK that references auth.users
-- so that deleting a user from the Supabase dashboard cascades cleanly
-- to all their data in the public schema.
--
-- Uses a DO block to look up actual constraint names from information_schema
-- rather than hard-coding them, so this is safe to re-run.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT kcu.table_name, tc.constraint_name
    FROM information_schema.table_constraints       AS tc
    JOIN information_schema.key_column_usage        AS kcu
      ON  tc.constraint_name = kcu.constraint_name
      AND tc.table_schema    = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON  tc.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints       AS tc2
      ON  rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND kcu.column_name    = 'user_id'
      AND tc2.table_schema   = 'auth'
      AND tc2.table_name     = 'users'
    ORDER BY kcu.table_name
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT %I',
      r.table_name, r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I
         FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
      r.table_name, r.constraint_name
    );
    RAISE NOTICE 'Cascaded: %.%', r.table_name, r.constraint_name;
  END LOOP;
END;
$$;

-- Also cascade bill_payments → bills so deleting a bill cleans up its payments
DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT tc.constraint_name INTO r
  FROM information_schema.table_constraints       AS tc
  JOIN information_schema.key_column_usage        AS kcu
    ON  tc.constraint_name = kcu.constraint_name
    AND tc.table_schema    = kcu.table_schema
  JOIN information_schema.referential_constraints AS rc
    ON  tc.constraint_name = rc.constraint_name
  JOIN information_schema.table_constraints       AS tc2
    ON  rc.unique_constraint_name = tc2.constraint_name
  WHERE tc.constraint_type   = 'FOREIGN KEY'
    AND tc.table_schema      = 'public'
    AND kcu.table_name       = 'bill_payments'
    AND kcu.column_name      = 'bill_id'
    AND tc2.table_schema     = 'public'
    AND tc2.table_name       = 'bills'
  LIMIT 1;

  IF r.constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.bill_payments DROP CONSTRAINT %I', r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE public.bill_payments ADD CONSTRAINT %I
         FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE',
      r.constraint_name
    );
    RAISE NOTICE 'Cascaded: bill_payments.%', r.constraint_name;
  END IF;
END;
$$;
