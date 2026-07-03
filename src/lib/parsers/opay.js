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
// Whitespace is tolerant here (\s* around parens/words) because stitching a
// record's description back together across a PDF line/page break can insert
// an extra space in the middle of these fixed phrases (e.g. "OWealth
// Withdrawal" and "(Transaction Payment)" landing on separate source lines).
const INTERNAL = /^(auto-save\s*to\s*owealth\s*balance|owealth\s*withdrawal\s*\(\s*transaction\s*payment\s*\)|owealth\s*deposit\s*\(\s*transaction\s*refund\s*\)|owealth\s*interest\s*earned)/i;

function extractBeneficiary(desc) {
  const m = desc.match(/^Transfer (?:to|from) ([^|]+?)(?:\s*\|.*)?$/i);
  return m ? m[1].trim() : null;
}

const RECORD_START = /^(\d{2} [A-Za-z]{3} \d{4}) \d{2}:\d{2}:\d{2} \d{2} [A-Za-z]{3} \d{4}\b/;
const LINE_RE = /^(\d{2} [A-Za-z]{3} \d{4}) \d{2}:\d{2}:\d{2} \d{2} [A-Za-z]{3} \d{4}\s+(.*?)\s+(--|[\d,]+\.\d{2})\s+(--|[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(Mobile|POS|WEB)\s+(.*)$/;

export function parseOpayStatement(text) {
  // Don't rely on the literal word "OPay" appearing in the extracted text —
  // it may only exist as a logo image in the PDF, not as selectable text.
  // This exact column-header line is OPay's specific table fingerprint and
  // is confirmed present in real exported statements.
  if (!/trans\.?\s*time\s+value\s*date\s+description\s+debit/i.test(text)) return null;
  if (!/wallet account/i.test(text)) return null;

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

  // Nearly every real transaction has a matching OWealth internal sweep row
  // right after it, so roughly half of all blocks are expected to be
  // filtered out by INTERNAL below — that's normal, not a parse failure.
  // Track genuine regex-match failures separately for the sanity check.
  let unmatched = 0;
  const rows = [];
  for (const raw of blocks) {
    const block = raw.replace(/\s+/g, " ").trim();
    const m = block.match(LINE_RE);
    if (!m) { unmatched++; continue; }
    const [, dateStr, descRaw, debit, credit] = m;
    const desc = descRaw.trim();
    if (INTERNAL.test(desc)) continue;

    const date = toIsoDate(dateStr);
    if (!date) { unmatched++; continue; }

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

  // If a large share of record-start lines didn't even match the expected
  // row structure, this isn't the layout we expect — bail out rather than
  // return a silently incomplete ledger, and let the caller fall back to AI
  // extraction. (Rows filtered out as internal OWealth sweeps don't count
  // against this — see above.)
  if (blocks.length === 0 || unmatched > blocks.length * 0.5) return null;

  return rows;
}
