import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/gemini";
import {
  textExtractPrompt, chunkText, filterRows, parseAIResponse,
  isQuotaOrRateLimitMessage, parseGroqRetrySeconds,
  GROQ_CHUNK_SIZE, GROQ_MAX_TOKENS,
} from "@/lib/statementExtract";

export const maxDuration = 30;

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
  if (!res.ok) {
    const err = new Error(data.error?.message || "Groq error");
    err.groqStatus = res.status;
    throw err;
  }
  return data.choices?.[0]?.message?.content || "";
}

// Processes exactly one chunk of one statement-import job per call. The
// client calls this repeatedly (with server-directed backoff on rate
// limits) until the job reports status "done" or "error". Keeping each
// request to a single chunk is what lets large statements finish without
// ever exceeding Groq's 12k-tokens/min or Gemini's 5-requests/min free-tier
// caps within a single serverless function's time limit.
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
    .select("gemini_key_encrypted, groq_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const chunk = job.chunks[job.chunk_index];

  try {
    let rawText;
    if (job.provider === "groq") {
      const key = settings?.groq_key_encrypted;
      if (!key) throw new Error("No Groq key configured.");
      rawText = await callGroqChunk(chunk, key);
    } else {
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No Gemini key configured.");
      rawText = await callGemini(key, {
        contents: [{ parts: [{ text: textExtractPrompt(chunk) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
      });
    }

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
      waitMs:      0,
    });

  } catch (err) {
    // Groq TPM/RPM rate limit — retry the same chunk after the server's
    // suggested delay instead of burning through further requests.
    if (job.provider === "groq" && err.groqStatus === 429) {
      const waitMs = parseGroqRetrySeconds(err.message) * 1000 + 1000;
      return NextResponse.json({
        status: "processing", chunkIndex: job.chunk_index, totalChunks: job.chunks.length, waitMs,
      });
    }

    // Gemini quota hit — fall back to Groq for the remaining chunks if the
    // user has a Groq key configured. Re-chunk the remaining text at Groq's
    // (much smaller) chunk size and switch the job's active provider.
    if (job.provider === "gemini" && isQuotaOrRateLimitMessage(err.message) && settings?.groq_key_encrypted && !job.fell_back) {
      const remainingText  = job.chunks.slice(job.chunk_index).join("\n");
      const newChunks      = chunkText(remainingText, GROQ_CHUNK_SIZE);
      const processedCount = job.chunk_index;

      await supabase.from("statement_jobs").update({
        provider:    "groq",
        chunks:      newChunks,
        chunk_index: 0,
        fell_back:   true,
        updated_at:  new Date().toISOString(),
      }).eq("id", jobId);

      return NextResponse.json({
        status: "processing",
        chunkIndex: processedCount,
        totalChunks: processedCount + newChunks.length,
        waitMs: 0,
        fellBackTo: "groq",
      });
    }

    await supabase.from("statement_jobs").update({
      status: "error", error: err.message || "Extraction failed.", updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    return NextResponse.json({ status: "error", error: err.message || "Extraction failed." });
  }
}
