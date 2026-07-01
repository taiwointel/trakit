import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// pdf-parse is imported dynamically inside the handler to prevent module-level
// test-file loading (a known pdf-parse v1 + Next.js incompatibility).

export const maxDuration = 60;

const EXTRACT_PROMPT = `Extract all bank transactions from this Nigerian bank statement.
Return ONLY valid JSON, no markdown fences, no extra text:

{"transactions":[{"date":"YYYY-MM-DD","description":"narration text","amount":1234.56,"flow":"out"}]}

Rules:
- date: YYYY-MM-DD format. If date is DD/MM/YYYY, convert it. If year is missing, use the statement year.
- description: the narration, reference or remarks for the transaction
- amount: positive number only, no commas or currency symbols
- flow: "out" for debits/withdrawals/charges/transfers out; "in" for credits/deposits/payments received
- Skip: opening balance rows, closing balance rows, totals, subtotals, header rows
- Return ONLY the JSON object, nothing else`;

function textExtractPrompt(text) {
  return `Below is raw text extracted from a Nigerian bank statement PDF. Parse every transaction and return ONLY valid JSON, no markdown fences, no extra text:

{"transactions":[{"date":"YYYY-MM-DD","description":"narration text","amount":1234.56,"flow":"out"}]}

Rules:
- date: YYYY-MM-DD format. Convert DD/MM/YYYY or DD-Mon-YYYY as needed. If year is missing, infer from surrounding context.
- description: the narration, reference or remarks for the transaction
- amount: positive number only (no commas or currency symbols)
- flow: "out" for debits/withdrawals/charges; "in" for credits/deposits/payments received
- Skip: opening balance, closing balance, totals, subtotals, header/footer lines
- Return ONLY the JSON object, nothing else

STATEMENT TEXT:
${text}`;
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
      const { default: pdfParse } = await import("pdf-parse");
      const parsed = await pdfParse(buffer);
      const text   = parsed.text?.trim();
      if (!text || text.length < 50) {
        return NextResponse.json(
          { error: "Could not extract text from this PDF. It may be a scanned image — switch to Gemini or Claude for OCR support." },
          { status: 400 },
        );
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: textExtractPrompt(text.slice(0, 24000)) }],
          max_tokens: 8192,
          temperature: 0.1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Groq error");

      const rawText = data.choices?.[0]?.message?.content || "";
      const clean   = rawText.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      const result  = JSON.parse(clean);
      const transactions = result.transactions || result;

      const rows = (Array.isArray(transactions) ? transactions : [])
        .filter((t) => t.date && t.description && Number(t.amount) > 0)
        .map((t) => ({
          date:        String(t.date).trim(),
          desc:        String(t.description).trim(),
          amount:      Number(t.amount),
          flow:        t.flow === "in" ? "in" : "out",
          beneficiary: null,
        }));

      return NextResponse.json({ rows });
    } catch (err) {
      return NextResponse.json({ error: `Extraction failed: ${err.message}` }, { status: 500 });
    }
  }

  // Claude and Gemini: native vision — send the file directly
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
          max_tokens: 8192,
          messages:   [{ role: "user", content: [contentType, { type: "text", text: EXTRACT_PROMPT }] }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Claude error");
      rawText = data.content?.[0]?.text || "";

    } else {
      // Gemini (default)
      const key = settings?.gemini_key_encrypted;
      if (!key) return NextResponse.json({ error: "No AI key configured. Add a Gemini or Claude key in Settings." }, { status: 400 });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: EXTRACT_PROMPT },
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini error");
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    const clean       = rawText.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const result      = JSON.parse(clean);
    const transactions = result.transactions || result;

    const rows = (Array.isArray(transactions) ? transactions : [])
      .filter((t) => t.date && t.description && Number(t.amount) > 0)
      .map((t) => ({
        date:        String(t.date).trim(),
        desc:        String(t.description).trim(),
        amount:      Number(t.amount),
        flow:        t.flow === "in" ? "in" : "out",
        beneficiary: null,
      }));

    return NextResponse.json({ rows });

  } catch (err) {
    return NextResponse.json({ error: `Extraction failed: ${err.message}` }, { status: 500 });
  }
}
