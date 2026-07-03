// Shared extraction logic for bank statement import — used by both the
// job-creation route (start) and the per-chunk processing route (step).

export const JSONL_RULES = `Output format — JSONL: one compact JSON object per line, NO wrapper array or object, NO markdown:
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

export const EXTRACT_PROMPT = `Extract all bank transactions from this Nigerian bank statement.\n${JSONL_RULES}`;

export function textExtractPrompt(text) {
  return `Extract all bank transactions from the Nigerian bank statement text below.\n${JSONL_RULES}\n\nSTATEMENT TEXT:\n${text}`;
}

// Internal fund-movement rows — never real expenses/income
const OPAY_INTERNAL    = /^(auto.?save to o.?wealth|o.?wealth withdrawal|o.?wealth interest)/i;
const PALMPAY_INTERNAL = /^(cashbox auto save|cashbox interest)/i;

export function filterRows(transactions) {
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
export function parseAIResponse(raw) {
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

// Splits text into chunks without ever cutting a line (a transaction row) in
// half, so nothing gets corrupted at a chunk boundary.
export function chunkText(text, chunkSize) {
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

export function isQuotaOrRateLimitMessage(message) {
  return /free-tier limit|quota|rate.?limit|resource.?exhausted/i.test(message || "");
}

// Groq's error messages include "...Please try again in 33.055s." — parse
// that so we can wait exactly as long as the server asked instead of
// guessing.
export function parseGroqRetrySeconds(message) {
  const m = (message || "").match(/try again in ([\d.]+)s/i);
  return m ? parseFloat(m[1]) : 15;
}

// Groq returns rate-limit headers like "x-ratelimit-reset-tokens: 7.66s" or
// "2m59.56s" — parse into seconds so we can wait exactly as long as needed
// instead of guessing or burning a request into a 429.
export function parseGroqDuration(str) {
  if (!str) return 0;
  const m = str.match(/([\d.]+)m/);
  const s = str.match(/([\d.]+)s/);
  return (m ? parseFloat(m[1]) * 60 : 0) + (s ? parseFloat(s[1]) : 0);
}

// Groq free tier: 12,000 tokens/minute, and max_tokens counts against that
// as reserved capacity (not just actual usage). A 6k-char chunk rarely
// produces anywhere near 4000 output tokens of JSONL, so that combination
// wasted most of the budget on unused headroom — 90 chunks for one
// statement, each needing a ~30s wait. Right-sized: bigger chunks (fewer
// requests) with a realistic output reservation, still safely under the cap.
export const GROQ_CHUNK_SIZE = 24000;
export const GROQ_MAX_TOKENS = 2000;

// Gemini's context window is huge (1M+ tokens) — the binding constraint is
// its 5 requests/minute free-tier cap, not token size, so use a much larger
// chunk to minimize the number of requests needed.
export const GEMINI_CHUNK_SIZE = 150000;
