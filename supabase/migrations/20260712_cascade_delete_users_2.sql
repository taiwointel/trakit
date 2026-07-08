-- statement_jobs and merchant_rules were created after
-- 20260703_cascade_delete_users.sql ran, so their user_id FK never got the
-- ON DELETE CASCADE fix — any user with rows in either table (which happens
-- from normal use: importing a statement, or any AI/manual categorization)
-- can't be deleted from the Supabase dashboard ("Database error deleting
-- user"). entry_backups (created ad hoc by users via the Settings panel's
-- SQL snippet) has the same gap. Re-run the same generic fix so it also
-- picks up any future table with a bare user_id -> auth.users FK.

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
      AND rc.delete_rule     != 'CASCADE'
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
