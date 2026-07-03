-- Background job table for bank statement import.
-- Large statements can't be extracted in one 60s request without exceeding
-- free-tier AI rate limits (Groq: 12k tokens/min, Gemini: 5 requests/min),
-- so extraction is split into per-chunk steps that the client drives via
-- repeated calls to /api/migrate/statement/step, tracked here.

CREATE TABLE IF NOT EXISTS statement_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  status       text NOT NULL DEFAULT 'processing', -- 'processing' | 'done' | 'error'
  provider     text NOT NULL,                       -- 'groq' | 'gemini' — current active provider for this job
  chunks       jsonb NOT NULL,                       -- remaining text chunks to process, in order
  chunk_index  int NOT NULL DEFAULT 0,
  rows         jsonb NOT NULL DEFAULT '[]'::jsonb,    -- accumulated extracted rows so far
  error        text,
  fell_back    boolean NOT NULL DEFAULT false,        -- true once switched from gemini to groq mid-job
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE statement_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statement_jobs_owner" ON statement_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
