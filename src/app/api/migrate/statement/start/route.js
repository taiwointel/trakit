import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini } from "@/lib/gemini";
import {
  EXTRACT_PROMPT, chunkText, filterRows, parseAIResponse,
  GROQ_CHUNK_SIZE, GEMINI_CHUNK_SIZE,
} from "@/lib/statementExtract";
import { parseOpayStatement } from "@/lib/parsers/opay";
// pdf-parse is imported dynamically below to prevent module-level test-file
// loading (a known pdf-parse v1 + Next.js incompatibility in serverless envs).

export const maxDuration = 30;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, gemini_key_encrypted, groq_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mimeType = file.type || "application/octet-stream";
  const buffer   = Buffer.from(await file.arrayBuffer());
  const isPdf    = mimeType === "application/pdf";
  const isImage  = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF or an image (JPG, PNG)." }, { status: 400 });
  }

  // Statement extraction prefers Gemini over Groq regardless of the
  // account's general chat-provider setting: Gemini's 5-requests/minute cap
  // lets each request carry far more text, so a large statement becomes a
  // handful of requests instead of Groq's 12k-tokens/minute cap forcing
  // dozens of small, slow, rate-limited chunks. Groq is only used when no
  // Gemini key exists, or as the mid-job fallback if Gemini's quota runs out.
  const hasGemini = !!settings?.gemini_key_encrypted;
  const hasGroq   = !!settings?.groq_key_encrypted;
  const provider  = hasGemini ? "gemini" : (hasGroq ? "groq" : null);

  // Images: a single vision call is fast enough to run synchronously — no
  // job/chunking needed, and Groq has no vision model to fall back to.
  if (isImage) {
    const key = settings?.gemini_key_encrypted;
    if (!key) return NextResponse.json({ error: "Image statements need a Gemini key (Groq can't read images). Add one in Settings." }, { status: 400 });

    try {
      const base64  = buffer.toString("base64");
      const rawText = await callGemini(key, {
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: EXTRACT_PROMPT },
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
      });
      const rows = filterRows(parseAIResponse(rawText));
      return NextResponse.json({ status: "done", rows });
    } catch (err) {
      return NextResponse.json({ error: err.message || "Extraction failed." }, { status: 500 });
    }
  }

  // PDFs: extract text first. Recognized statement formats (e.g. OPay) get
  // parsed deterministically via regex below — no AI call needed at all. For
  // anything else, chunk the text and create a job the client steps through:
  // a single 60s request can't fit a large statement within free-tier rate
  // limits (Groq: 12k tokens/min, Gemini: 5 requests/min), so processing is
  // spread across many short requests instead.
  let text;
  try {
    const mod      = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default ?? mod;
    const parsed   = await pdfParse(buffer);
    text = parsed.text?.trim();
  } catch {
    return NextResponse.json({ error: "Could not read this PDF. Please try again." }, { status: 400 });
  }
  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: "Could not extract text from this PDF. It may be a scanned image — try converting to JPG/PNG and re-uploading." },
      { status: 400 },
    );
  }

  const regexRows = parseOpayStatement(text);
  if (regexRows) {
    return NextResponse.json({ status: "done", rows: filterRows(regexRows) });
  }

  if (!provider) {
    return NextResponse.json({ error: "No AI key configured. Add a Gemini or Groq key in Settings." }, { status: 400 });
  }

  const chunkSize = provider === "groq" ? GROQ_CHUNK_SIZE : GEMINI_CHUNK_SIZE;
  const chunks    = chunkText(text, chunkSize);

  const { data: job, error: insertErr } = await supabase
    .from("statement_jobs")
    .insert({
      user_id:  user.id,
      status:   "processing",
      provider,
      chunks,
      chunk_index: 0,
      rows: [],
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "Could not start extraction job. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ status: "processing", jobId: job.id, totalChunks: chunks.length });
}
