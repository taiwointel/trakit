import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  textExtractPrompt, filterRows, parseAIResponse,
  parseGroqRetrySeconds, parseGroqDuration,
  GROQ_CHUNK_SIZE, GROQ_MAX_TOKENS,
} from "@/lib/statementExtract";

export const maxDuration = 30;

// Groq exposes exactly how much of the 12k-tokens/minute budget is left on
// every response via x-ratelimit-* headers. Use that to pace proactively —
// only wait when the next chunk's estimated cost would actually blow the
// budget — instead of firing blind and eating a 429 to find out.
const NEXT_CHUNK_ESTIMATE = Math.ceil(GROQ_CHUNK_SIZE / 4) + GROQ_MAX_TOKENS;

async function callGroqChunk(chunk, key) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: textExtractPrompt(chunk) }],
      max_tokens: GROQ_MAX_TOKENS,
      temperature: 0.1,
    }),
  });
  const data = await res.json();

  const remainingTokens = parseFloat(res.headers.get("x-ratelimit-remaining-tokens") ?? "Infinity");
  const resetSecs       = parseGroqDuration(res.headers.get("x-ratelimit-reset-tokens"));

  if (!res.ok) {
    const err = new Error(data.error?.message || "Groq error");
    err.groqStatus = res.status;
    err.waitMs     = (resetSecs || parseGroqRetrySeconds(err.message)) * 1000 + 500;
    throw err;
  }

  const waitMs = remainingTokens < NEXT_CHUNK_ESTIMATE ? resetSecs * 1000 + 500 : 0;
  return { text: data.choices?.[0]?.message?.content || "", waitMs };
}

// Processes exactly one chunk of one statement-import job per call. The
// client calls this repeatedly (with server-directed backoff on rate
// limits) until the job reports status "done" or "error". Keeping each
// request to a single chunk is what lets large statements finish without
// ever exceeding Groq's 12k-tokens/min free-tier cap within a single
// serverless function's time limit.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await request.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const { data: job } = await supabase
    .from("statement_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.status === "done" || job.status === "error") {
    return NextResponse.json({
      status: job.status,
      error: job.error,
      rows: job.status === "done" ? filterRows(job.rows) : undefined,
      chunkIndex: job.chunk_index,
      totalChunks: job.chunks.length,
    });
  }

  if (job.chunk_index >= job.chunks.length) {
    const rows = filterRows(job.rows);
    await supabase.from("statement_jobs")
      .update({ status: "done", rows, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return NextResponse.json({ status: "done", rows, chunkIndex: job.chunk_index, totalChunks: job.chunks.length });
  }

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("groq_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const chunk = job.chunks[job.chunk_index];

  try {
    const key = settings?.groq_key_encrypted;
    if (!key) throw new Error("No Groq key configured.");
    const { text: rawText, waitMs } = await callGroqChunk(chunk, key);

    const newRows    = parseAIResponse(rawText);
    const mergedRows = [...job.rows, ...newRows];
    const nextIndex   = job.chunk_index + 1;
    const done        = nextIndex >= job.chunks.length;

    await supabase.from("statement_jobs").update({
      rows:        mergedRows,
      chunk_index: nextIndex,
      status:      done ? "done" : "processing",
      updated_at:  new Date().toISOString(),
    }).eq("id", jobId);

    return NextResponse.json({
      status:      done ? "done" : "processing",
      rows:        done ? filterRows(mergedRows) : undefined,
      chunkIndex:  nextIndex,
      totalChunks: job.chunks.length,
      waitMs:      done ? 0 : waitMs,
    });

  } catch (err) {
    // Groq TPM/RPM rate limit — retry the same chunk after the server's
    // suggested delay instead of burning through further requests.
    if (err.groqStatus === 429) {
      const waitMs = err.waitMs || (parseGroqRetrySeconds(err.message) * 1000 + 1000);
      return NextResponse.json({
        status: "processing", chunkIndex: job.chunk_index, totalChunks: job.chunks.length, waitMs,
      });
    }

    await supabase.from("statement_jobs").update({
      status: "error", error: err.message || "Extraction failed.", updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    return NextResponse.json({ status: "error", error: err.message || "Extraction failed." });
  }
}
