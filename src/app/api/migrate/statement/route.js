import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const base64   = buffer.toString("base64");

  const isPdf   = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF or an image (JPG, PNG)." }, { status: 400 });
  }

  let rawText = "";

  try {
    const provider = settings?.provider || "gemini";

    if (provider === "claude" && settings?.claude_key_encrypted) {
      const contentType = isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image",    source: { type: "base64", media_type: mimeType,           data: base64 } };

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-api-key":       settings.claude_key_encrypted,
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

    } else if (provider === "groq") {
      return NextResponse.json(
        { error: "Groq does not support document or image extraction. Switch to Claude or Gemini in Settings." },
        { status: 400 },
      );

    } else {
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

    const clean = rawText.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(clean);
    const transactions = parsed.transactions || parsed;

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
