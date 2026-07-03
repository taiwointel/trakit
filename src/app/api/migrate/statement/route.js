import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, cleanGeminiError } from "@/lib/gemini";
// pdf-parse is imported dynamically inside the handler to prevent module-level
// test-file loading (a known pdf-parse v1 + Next.js incompatibility).

export const maxDuration = 60;

const JSONL_RULES = `Output format — JSONL: one compact JSON object per line, NO wrapper array or object, NO markdown:
{"date":"YYYY-MM-DD","description":"narration","amount":1234.56,"flow":"out","beneficiary":"NAME IF IDENTIFIABLE"}
{"date":"YYYY-MM-DD","description":"narration","amount":500.00,"flow":"in"}

IMPORTANT: This document may span MULTIPLE PAGES. Read and process every page from start to finish before producing any output. Do not stop at a page break or a new section header — continue until the very last line of the last page.

Rules:
- date: YYYY-MM-DD. Convert DD/MM/YYYY, DD-Mon-YYYY, or MM/DD/YYYY. Infer year from the statement period header if missing.
- description: the narration/reference text. CRITICAL: strip all double-quote characters from it; replace with single quotes or remove.
- amount: positive number, no commas or currency symbols
- flow: "out" for debits/withdrawals/charges/fees; "in" for credits/deposits/payments received
- beneficiary: (optional field) include ONLY when a real person or business name is clearly named in the narration — e.g. "Send to OPEYEMI JOY AKANDE" → beneficiary: "OPEYEMI JOY AKANDE". Omit for POS, ATM, data bundles, bank charges, and unnamed transactions.
- Skip opening balance, closing balance, totals, subtotals, header/footer rows

OPAY STATEMENTS:
  • Extract ONLY from the Wallet Account section — it contains real external transactions.
  • SKIP "Auto-save to OWealth Balance" and "OWealth Withdrawal(Transaction Payment)" — internal movements.
  • Ignore the Savings Account / OWealth section entirely.

PALMPAY STATEMENTS: PalmPay statements include internal CashBox savings movements.
  • SKIP "CashBox Auto Save" rows — these are internal transfers to the user's own CashBox savings pocket.
  • SKIP "CashBox Interest" rows — internal interest credits, not real income.
  • KEEP all "Send to [NAME]" and "Received from [NAME]" rows even when NAME matches the account holder — these are real inter-bank transfers to the user's other bank accounts and must be included.
  • KEEP "Buy Data bundle", "Top up Airtime", "Card Payment-POS", "Betting Deposit", "Stamp Duty", "Electronic Money Transfer Levy", "USSD Charge" — these are all real transactions.
  • For "Send to NAME" and "Received from NAME" rows, set beneficiary to that NAME.

OTHER MULTI-SECTION STATEMENTS: Extract only from the section recording actual external transfers. Skip internal-movement-only sections.
- Return ONLY the raw JSONL lines — no markdown fences, no extra text`;

const EXTRACT_PROMPT = `Extract all bank transactions from this Nigerian bank statement.\n${JSONL_RULES}`;

function textExtractPrompt(text) {
  return `Extract all bank transactions from the Nigerian bank statement text below.\n${JSONL_RULES}\n\nSTATEMENT TEXT:\n${text}`;
}

// Internal fund-movement rows — never real expenses/income
const OPAY_INTERNAL    = /^(auto.?save to o.?wealth|o.?wealth withdrawal|o.?wealth interest)/i;
const PALMPAY_INTERNAL = /^(cashbox auto save|cashbox interest)/i;

function filterRows(transactions) {
  return transactions
    .filter((t) => t.date && (t.description || t.desc) && Number(t.amount || t.amt) > 0)
    .filter((t) => {
      const d = (t.description || t.desc || "").trim();
      return !OPAY_INTERNAL.test(d) && !PALMPAY_INTERNAL.test(d);
    })
    .map((t) => ({
      date:        String(t.date).trim(),
      desc:        String(t.description || t.desc || "").trim(),
      amount:      Number(t.amount || t.amt),
      flow:        (t.flow || t.fl) === "in" ? "in" : "out",
      beneficiary: t.beneficiary ? String(t.beneficiary).trim() : null,
    }));
}

// Robust parser: handles JSONL (one object per line), full JSON array/object,
// and strips markdown fences. Skips malformed lines instead of throwing.
function parseAIResponse(raw) {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // 1. Try JSONL — one JSON object per line (preferred path)
  const lines = text.split(/\r?\n/);
  const jsonlRows = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try { jsonlRows.push(JSON.parse(t)); } catch { /* skip bad line */ }
  }
  if (jsonlRows.length > 0) return jsonlRows;

  // 2. Try full JSON object/array
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.transactions && Array.isArray(parsed.transactions)) return parsed.transactions;
    if (parsed.rows && Array.isArray(parsed.rows)) return parsed.rows;
  } catch { /* fall through */ }

  // 3. Extract all {...} blocks via regex and parse each individually
  const blocks = [];
  const re = /\{[^{}]+\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { blocks.push(JSON.parse(m[0])); } catch { /* skip */ }
  }
  return blocks;
}

function chunkText(text, chunkSize) {
  const lines  = text.split("\n");
  const chunks = [];
  let current  = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > chunkSize && current) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Groq text-only extraction: chunked (short calls, Groq's higher free-tier
// RPM tolerates parallel chunks fine).
async function extractViaGroq(text, key) {
  const chunks = chunkText(text, 20000);
  const results = await Promise.all(chunks.map(async (chunk) => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: textExtractPrompt(chunk) }],
        max_tokens: 32768,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Groq error");
    return data.choices?.[0]?.message?.content || "";
  }));
  return filterRows(results.flatMap((rawText) => parseAIResponse(rawText)));
}

// Gemini text-only extraction: large chunk size + sequential calls to stay
// under the free tier's 5 RPM cap.
async function extractViaGemini(text, key) {
  const chunks = chunkText(text, 150000);
  const results = [];
  for (const chunk of chunks) {
    results.push(await callGemini(key, {
      contents: [{ parts: [{ text: textExtractPrompt(chunk) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
    }));
  }
  return filterRows(results.flatMap((rawText) => parseAIResponse(rawText)));
}

function isQuotaOrRateLimitMessage(message) {
  return /free-tier limit|quota|rate.?limit|resource.?exhausted/i.test(message || "");
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, gemini_key_encrypted, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mimeType = file.type || "application/octet-stream";
  const buffer   = Buffer.from(await file.arrayBuffer());

  const isPdf   = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF or an image (JPG, PNG)." }, { status: 400 });
  }

  const provider = settings?.provider || "gemini";

  // Groq: text-only API. Extract PDF text server-side and send to Groq as a prompt.
  // Images are not supported — no workaround without a vision model.
  if (provider === "groq") {
    if (isImage) {
      return NextResponse.json(
        { error: "Groq cannot read images. Switch to Gemini or Claude in Settings to import image statements." },
        { status: 400 },
      );
    }

    const key = settings?.groq_key_encrypted;
    if (!key) return NextResponse.json({ error: "No Groq key configured. Add one in Settings." }, { status: 400 });

    try {
      // Import lib/pdf-parse.js directly to bypass index.js which reads a
      // test file at load time — that file doesn't exist in serverless envs.
      const mod    = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = mod.default ?? mod;
      const parsed = await pdfParse(buffer);
      const text   = parsed.text?.trim();
      if (!text || text.length < 50) {
        return NextResponse.json(
          { error: "Could not extract text from this PDF. It may be a scanned image — switch to Gemini or Claude for OCR support." },
          { status: 400 },
        );
      }

      const rows = await extractViaGroq(text, key);
      return NextResponse.json({ rows });
    } catch (err) {
      return NextResponse.json({ error: `Extraction failed: ${err.message}` }, { status: 500 });
    }
  }

  // Gemini + PDF: extract text server-side and chunk it, same as the Groq path.
  // Sending the whole PDF as base64 inline_data was slow and quota-heavy on
  // large statements — text extraction is faster and lets us parallelize.
  // If Gemini's free-tier quota is hit and the user also has a Groq key
  // configured, fall back to Groq automatically rather than failing outright.
  if (provider === "gemini" && isPdf) {
    const key = settings?.gemini_key_encrypted;
    if (!key) return NextResponse.json({ error: "No Gemini key configured. Add one in Settings." }, { status: 400 });

    try {
      const mod      = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = mod.default ?? mod;
      const parsed   = await pdfParse(buffer);
      const text     = parsed.text?.trim();
      if (!text || text.length < 50) {
        return NextResponse.json(
          { error: "Could not extract text from this PDF. It may be a scanned image — try converting to JPG/PNG and re-uploading." },
          { status: 400 },
        );
      }

      try {
        const rows = await extractViaGemini(text, key);
        return NextResponse.json({ rows });
      } catch (err) {
        if (isQuotaOrRateLimitMessage(err.message) && settings?.groq_key_encrypted) {
          const rows = await extractViaGroq(text, settings.groq_key_encrypted);
          return NextResponse.json({ rows, fellBackTo: "groq" });
        }
        throw err;
      }
    } catch (err) {
      return NextResponse.json({ error: err.message || "Extraction failed. Please try again." }, { status: 500 });
    }
  }

  // Claude and Gemini-with-image: native vision — send the file directly
  const base64  = buffer.toString("base64");
  let rawText   = "";

  try {
    if (provider === "claude" && settings?.claude_key_encrypted) {
      const contentType = isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image",    source: { type: "base64", media_type: mimeType,           data: base64 } };

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         settings.claude_key_encrypted,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 32000,
          messages:   [{ role: "user", content: [contentType, { type: "text", text: EXTRACT_PROMPT }] }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Claude error");
      rawText = data.content?.[0]?.text || "";

    } else {
      // Gemini image path — vision, single call
      const key = settings?.gemini_key_encrypted;
      if (!key) return NextResponse.json({ error: "No AI key configured. Add a Gemini or Claude key in Settings." }, { status: 400 });

      rawText = await callGemini(key, {
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: EXTRACT_PROMPT },
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
      });
    }

    const rows = filterRows(parseAIResponse(rawText));
    return NextResponse.json({ rows });

  } catch (err) {
    // err.message is already human-readable (cleaned by callGemini / explicit throws above)
    return NextResponse.json({ error: err.message || "Extraction failed. Please try again." }, { status: 500 });
  }
}
