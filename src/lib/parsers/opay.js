// Deterministic parser for OPay Nigerian bank statement PDFs. Extracts the
// Wallet Account transaction table directly via regex instead of an AI call
// — eliminates rate limits and cost entirely for statements in this format.
// Returns null if the text doesn't look like a parseable OPay statement, so
// callers fall back to the existing AI extraction path.
//
// pdf-parse's raw text has NO whitespace between adjacent table columns —
// e.g. the header renders as "Trans. TimeValue DateDescription\nDebit(₦)..."
// and a data row as "01 Jan 2026 16:01:3901 Jan 2026\nOWealth
// Withdrawal(Transaction Payment)\n--990.00990.00Mobile260101...". Newlines
// appear at some cell boundaries but not others, and never reliably imply a
// space. All matching below is written against that literal behavior, not
// against a "cleaned up" rendering of the table.

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
// triggered them. \s* tolerates the inconsistent inter-word spacing seen in
// the raw extraction.
const INTERNAL = /^(auto-save\s*to\s*owealth\s*balance|owealth\s*withdrawal\s*\(\s*transaction\s*payment\s*\)|owealth\s*deposit\s*\(\s*transaction\s*refund\s*\)|owealth\s*interest\s*earned)/i;

function extractBeneficiary(desc) {
  const m = desc.match(/^Transfer\s*(?:to|from)\s*([^|]+?)(?:\s*\|.*)?$/i);
  return m ? m[1].trim() : null;
}

const DATE = "\\d{2} [A-Za-z]{3} \\d{4}";
// Trans. Time and Value Date are two separate cells glued with no space —
// \s* (not \s+) between every piece here tolerates both that and any PDF
// that happens to render a real space.
const RECORD_START = new RegExp(`^(${DATE})\\s*\\d{2}:\\d{2}:\\d{2}\\s*${DATE}`);
// Debit, Credit, Balance After, Channel and the reference number are glued
// together with zero separators (e.g. "--990.00990.00Mobile2601..."). Each
// amount is unambiguous because it's either the literal "--" or ends in
// exactly two decimal digits, so back-to-back amount groups still parse
// correctly without a delimiter between them.
const LINE_RE = new RegExp(
  `^(${DATE})\\s*\\d{2}:\\d{2}:\\d{2}\\s*${DATE}\\s*(.*?)(--|[\\d,]+\\.\\d{2})(--|[\\d,]+\\.\\d{2})(--|[\\d,]+\\.\\d{2})(Mobile|POS|WEB)(.*)$`,
);

// Debug variant used while we're validating the parser against real
// statements: instead of a bare null on failure, it reports exactly which
// stage rejected the text and why, so we don't have to guess blind again.
export function parseOpayStatementDebug(text) {
  // Don't rely on the literal word "OPay" appearing in the extracted text —
  // it may only exist as a logo image in the PDF, not as selectable text.
  // \s* (not \s+) between header words because they're glued with zero gap
  // in the raw extraction (e.g. "Trans. TimeValue DateDescription").
  if (!/trans\.?\s*time\s*value\s*date\s*description\s*debit/i.test(text)) {
    return { ok: false, reason: "no-header-fingerprint", sample: text.slice(0, 500) };
  }
  if (!/wallet account/i.test(text)) {
    return { ok: false, reason: "no-wallet-account-heading", sample: text.slice(0, 500) };
  }

  // Only the Wallet Account section holds real external transactions —
  // Savings Account (OWealth) is a separate table of internal sub-balance
  // movements and interest accruals.
  const walletStart = text.search(/wallet account/i);
  const savingsStart = text.search(/savings account/i);
  const section = text.slice(walletStart, savingsStart > walletStart ? savingsStart : undefined);

  const lines = section.split(/\r?\n/);

  // PDF text extraction wraps descriptions and reference numbers across
  // multiple lines — stitch each record back together by treating any line
  // starting with the trans-time/value-date pair as a new record. Lines are
  // joined with NO separator (not a space): newlines here don't reliably
  // correspond to word boundaries in the source table.
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (RECORD_START.test(line)) {
      if (current) blocks.push(current);
      current = line;
    } else if (current) {
      current += line;
    }
  }
  if (current) blocks.push(current);

  if (blocks.length === 0) {
    return { ok: false, reason: "no-record-start-lines-found", sectionSample: section.slice(0, 1000) };
  }

  // Nearly every real transaction has a matching OWealth internal sweep row
  // right after it, so roughly half of all blocks are expected to be
  // filtered out by INTERNAL below — that's normal, not a parse failure.
  // Track genuine regex-match failures separately for the sanity check.
  let unmatched = 0;
  const unmatchedSamples = [];
  const rows = [];
  for (const raw of blocks) {
    const block = raw.trim();
    const m = block.match(LINE_RE);
    if (!m) {
      unmatched++;
      if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
      continue;
    }
    const [, dateStr, descRaw, debit, credit] = m;
    const desc = descRaw.replace(/\s+/g, " ").trim();
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

  if (unmatched > blocks.length * 0.5) {
    return {
      ok: false,
      reason: "too-many-unmatched-blocks",
      blocks: blocks.length,
      unmatched,
      rows: rows.length,
      unmatchedSamples,
    };
  }

  return { ok: true, rows };
}

export function parseOpayStatement(text) {
  const result = parseOpayStatementDebug(text);
  return result.ok ? result.rows : null;
}
