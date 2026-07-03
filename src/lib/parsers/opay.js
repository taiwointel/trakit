// Deterministic parser for OPay Nigerian bank statement PDFs. Extracts the
// Wallet Account transaction table directly via regex instead of an AI call
// — eliminates rate limits and cost entirely for statements in this format.
// Returns null if the text doesn't look like a parseable OPay statement, so
// callers fall back to the existing AI extraction path.

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function toIsoDate(d) {
  const m = d.match(/^(\d{2}) ([A-Za-z]{3}) (\d{4})$/);
  if (!m) return null;
  const [, dd, mon, yyyy] = m;
  const mm = MONTHS[mon];
  if (!mm) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${dd}`;
}

// These rows represent money moving between the Wallet and its linked
// OWealth sub-balance, or interest on that sub-balance — never real
// external transactions, and always paired with the real row that
// triggered them.
const INTERNAL = /^(auto-save to owealth balance|owealth withdrawal\(transaction payment\)|owealth deposit\(transaction refund\)|owealth interest earned)/i;

function extractBeneficiary(desc) {
  const m = desc.match(/^Transfer (?:to|from) ([^|]+?)(?:\s*\|.*)?$/i);
  return m ? m[1].trim() : null;
}

const RECORD_START = /^(\d{2} [A-Za-z]{3} \d{4}) \d{2}:\d{2}:\d{2} \d{2} [A-Za-z]{3} \d{4}\b/;
const LINE_RE = /^(\d{2} [A-Za-z]{3} \d{4}) \d{2}:\d{2}:\d{2} \d{2} [A-Za-z]{3} \d{4}\s+(.*?)\s+(--|[\d,]+\.\d{2})\s+(--|[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(Mobile|POS|WEB)\s+(.*)$/;

export function parseOpayStatement(text) {
  if (!/opay/i.test(text) || !/wallet account/i.test(text)) return null;

  // Only the Wallet Account section holds real external transactions —
  // Savings Account (OWealth) is a separate table of internal sub-balance
  // movements and interest accruals.
  const walletStart = text.search(/wallet account/i);
  const savingsStart = text.search(/savings account/i);
  const section = text.slice(walletStart, savingsStart > walletStart ? savingsStart : undefined);

  const lines = section.split(/\r?\n/);

  // PDF text extraction wraps long descriptions and reference numbers
  // across multiple lines — stitch each record back together by treating
  // any line starting with the trans-time/value-date pair as a new record.
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (RECORD_START.test(line)) {
      if (current) blocks.push(current);
      current = line;
    } else if (current) {
      current += " " + line;
    }
  }
  if (current) blocks.push(current);

  const rows = [];
  for (const raw of blocks) {
    const block = raw.replace(/\s+/g, " ").trim();
    const m = block.match(LINE_RE);
    if (!m) continue;
    const [, dateStr, descRaw, debit, credit] = m;
    const desc = descRaw.trim();
    if (INTERNAL.test(desc)) continue;

    const date = toIsoDate(dateStr);
    if (!date) continue;

    const isOut = debit !== "--";
    const amount = Number((isOut ? debit : credit).replace(/,/g, ""));
    if (!amount || amount <= 0) continue;

    rows.push({
      date,
      desc,
      amount,
      flow: isOut ? "out" : "in",
      beneficiary: extractBeneficiary(desc),
    });
  }

  // If we matched far fewer rows than record-start lines found, this isn't
  // the layout we expect — bail out rather than return a silently
  // incomplete ledger, and let the caller fall back to AI extraction.
  if (blocks.length === 0 || rows.length < blocks.length * 0.5) return null;

  return rows;
}
