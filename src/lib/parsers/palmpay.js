// Deterministic parser for PalmPay Nigerian bank statement PDFs. Mirrors
// opay.js: extract the transaction table directly via regex instead of an
// AI call. Returns { ok: false, ... } if the text doesn't look like a
// parseable PalmPay statement, so callers fall back to the AI extraction
// path. Written to tolerate the same "columns glued together with zero
// whitespace" behavior discovered in OPay's raw pdf-parse output, since we
// don't yet have confirmed literal ground truth for PalmPay's own raw
// extraction (\s* is used instead of \s+ or a literal space wherever two
// table cells meet).

function toIsoDate(dateTimeStr) {
  // dateTimeStr is the full captured "MM/DD/YYYY HH:MM:SS AM/PM" — only the
  // leading date part is needed.
  const m = dateTimeStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// PalmPay's "CashBox" is its equivalent of OPay's OWealth — an internal
// savings pocket. Every real spend is paired with a same-amount CashBox
// Auto Save sweep out and a matching "Received from {account holder}"
// sweep back in; both legs net to zero and aren't real external
// transactions. CashBox Interest is the pocket's own accrual, also internal.
function buildInternalRegex(holderName) {
  const parts = [
    "cashbox\\s*auto\\s*save",
    "cashbox\\s*interest",
  ];
  if (holderName) {
    const escaped = holderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    parts.push(`received\\s*from\\s*${escaped}`);
  }
  return new RegExp(`^(${parts.join("|")})`, "i");
}

function extractHolderName(text) {
  const m = text.match(/Name\s*([A-Za-z][A-Za-z\s]*?)\s*Phone\s*Number/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function extractBeneficiary(desc) {
  const m = desc.match(/^(?:Send to|Received from)\s*([A-Za-z][A-Za-z\s]*)$/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

const DATE_TIME = "\\d{2}\\/\\d{2}\\/\\d{4}\\s*\\d{2}:\\d{2}:\\d{2}\\s*[AP]M";
const RECORD_START = new RegExp(`^(${DATE_TIME})`);
// Description, then a signed amount (unambiguous regardless of surrounding
// whitespace since it always starts with + or -), then a trailing
// alphanumeric transaction ID.
const LINE_RE = new RegExp(`^(${DATE_TIME})\\s*(.*?)\\s*([+-][\\d,]+\\.\\d{2})\\s*(.+)$`);

export function parsePalmpayStatementDebug(text) {
  // Don't rely on the literal word "PalmPay" appearing as selectable text —
  // it may only exist as a logo image. \s* between header words tolerates
  // zero-gap column gluing like the one found in OPay's raw extraction.
  if (!/transaction\s*date\s*transaction\s*detail\s*money\s*in.*money\s*out.*transaction\s*id/i.test(text)) {
    return { ok: false, reason: "no-header-fingerprint", sample: text.slice(0, 500) };
  }

  const holderName = extractHolderName(text);
  const INTERNAL = buildInternalRegex(holderName);

  const lines = text.split(/\r?\n/);

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

  if (blocks.length === 0) {
    return { ok: false, reason: "no-record-start-lines-found", sample: text.slice(0, 1000) };
  }

  // As with OPay, a large share of blocks are expected to be CashBox
  // internal sweeps and are correctly filtered below — that's not a parse
  // failure, so track genuine regex-match failures separately.
  let unmatched = 0;
  const unmatchedSamples = [];
  const rows = [];
  for (const raw of blocks) {
    const block = raw.replace(/\s+/g, " ").trim();
    const m = block.match(LINE_RE);
    if (!m) {
      unmatched++;
      if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
      continue;
    }
    const [, dateStr, descRaw, signedAmount] = m;
    const desc = descRaw.replace(/\s+/g, " ").trim();
    if (INTERNAL.test(desc)) continue;

    const date = toIsoDate(dateStr);
    if (!date) { unmatched++; continue; }

    const isOut = signedAmount.trim().startsWith("-");
    const amount = Number(signedAmount.replace(/[+\-,]/g, ""));
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
      holderName,
    };
  }

  return { ok: true, rows };
}

export function parsePalmpayStatement(text) {
  const result = parsePalmpayStatementDebug(text);
  return result.ok ? result.rows : null;
}
