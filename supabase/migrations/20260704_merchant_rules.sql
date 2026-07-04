-- Learned merchant/beneficiary categorization rules. Every time a
-- transaction is categorized (by AI or by the user manually correcting a
-- category), the resolved category is remembered here keyed off the
-- transaction's beneficiary name (or, if none, a cleaned-up narration
-- signature). Future transactions matching the same key are categorized
-- instantly from this table, with no AI call at all — this is what lets
-- categorization "learn" a person/merchant once and never need AI (or the
-- labeling wizard) for it again.

CREATE TABLE IF NOT EXISTS merchant_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  key          text NOT NULL,          -- 'b:<normalized beneficiary>' or 'n:<normalized narration>'
  category     text NOT NULL,
  subcategory  text,
  essentiality text,
  nature       text,
  hits         int NOT NULL DEFAULT 1, -- how many transactions have matched/reinforced this rule
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_rules_owner" ON merchant_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
