import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EXTRACT_PROMPT, chunkText, filterRows, parseAIResponse,
  GROQ_CHUNK_SIZE,
} from "@/lib/statementExtract";
import { parseOpayStatementDebug } from "@/lib/parsers/opay";
import { parsePalmpayStatementDebug } from "@/lib/parsers/palmpay";
import { parseAccessStatementDebug } from "@/lib/parsers/access";
import { extractAccountHolderName } from "@/lib/selfTransfer";
import { getGroqKey } from "@/lib/groqKey";
// pdf-parse is imported dynamically below to prevent module-level test-file
// loading (a known pdf-parse v1 + Next.js incompatibility in serverless envs).

export const maxDuration = 30;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const password = formData.get("password");
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mimeType = file.type || "application/octet-stream";
  const buffer   = Buffer.from(await file.arrayBuffer());
  const isPdf    = mimeType === "application/pdf";
  const isImage  = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF or an image (JPG, PNG)." }, { status: 400 });
  }

  // Images: a single vision call is fast enough to run synchronously — no
  // job/chunking needed. Groq's qwen/qwen3.6-27b reads images directly via
  // an OpenAI-compatible image_url data URI, same endpoint as every other
  // Groq call in this app.
  if (isImage) {
    const key = getGroqKey();
    if (!key) return NextResponse.json({ error: "No Groq key configured on the server." }, { status: 400 });

    try {
      const base64 = buffer.toString("base64");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "qwen/qwen3.6-27b",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: EXTRACT_PROMPT },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          }],
          max_completion_tokens: 8000,
          temperature: 0.1,
          // qwen3.6-27b is a "thinking" model — without this it emits its
          // chain-of-thought as visible <think>...</think> text ahead of
          // the actual JSONL output, which parseAIResponse can't read.
          reasoning_effort: "none",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Groq vision error");
      // Defensive strip in case a <think> block still slips through.
      const rawText = (data.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
      // Images have no separate raw statement text to scan (only the AI's
      // structured JSON reply), so account-holder detection isn't possible
      // here — the client falls back to the Settings profile name.
      const rows = filterRows(parseAIResponse(rawText));
      return NextResponse.json({ status: "done", rows });
    } catch (err) {
      return NextResponse.json({ error: err.message || "Extraction failed." }, { status: 500 });
    }
  }

  // PDFs: extract text first. Recognized statement formats (OPay, PalmPay,
  // Access) get parsed deterministically via regex below — no AI call
  // needed at all. For anything else, chunk the text and create a job the
  // client steps through: a single 60s request can't fit a large statement
  // within Groq's 12k-tokens/minute free-tier cap, so processing is spread
  // across many short requests instead.
  let text;
  try {
    const mod      = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default ?? mod;
    // pdf-parse forwards its input straight to pdfjs's getDocument(), which
    // accepts either a raw buffer or a { data, password } object — passing
    // the password only when supplied keeps the unprotected-PDF path
    // untouched.
    const source   = password ? { data: buffer, password: String(password) } : buffer;
    const parsed   = await pdfParse(source);
    text = parsed.text?.trim();
  } catch (err) {
    if (err?.name === "PasswordException") {
      return NextResponse.json(
        { error: password ? "Incorrect password. Please try again." : "This PDF is password-protected.", passwordRequired: true },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not read this PDF. Please try again." }, { status: 400 });
  }
  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: "Could not extract text from this PDF. It may be a scanned image — try converting to JPG/PNG and re-uploading." },
      { status: 400 },
    );
  }

  const accountHolderName = extractAccountHolderName(text);

  const opayDebug = parseOpayStatementDebug(text);
  if (opayDebug.ok) {
    // Loud, not silent: if the Wallet's computed closing balance ever
    // drifts from what the bank itself declared, something about this
    // statement's layout broke an assumption the regex depends on.
    if (opayDebug.reconciliation && opayDebug.reconciliation.drift > 1) {
      console.warn("OPay statement reconciliation drift:", opayDebug.reconciliation, "account:", opayDebug.accountRef);
    }
    return NextResponse.json({ status: "done", rows: filterRows(opayDebug.rows), accountHolderName });
  }
  const palmpayDebug = parsePalmpayStatementDebug(text);
  if (palmpayDebug.ok) {
    return NextResponse.json({ status: "done", rows: filterRows(palmpayDebug.rows), accountHolderName });
  }
  const accessDebug = parseAccessStatementDebug(text);
  if (accessDebug.ok) {
    return NextResponse.json({ status: "done", rows: filterRows(accessDebug.rows), accountHolderName });
  }

  if (!getGroqKey()) {
    return NextResponse.json({ error: "No Groq key configured on the server." }, { status: 400 });
  }

  const chunks = chunkText(text, GROQ_CHUNK_SIZE);

  const { data: job, error: insertErr } = await supabase
    .from("statement_jobs")
    .insert({
      user_id:  user.id,
      status:   "processing",
      provider: "groq",
      chunks,
      chunk_index: 0,
      rows: [],
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "Could not start extraction job. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ status: "processing", jobId: job.id, totalChunks: chunks.length, accountHolderName });
}
