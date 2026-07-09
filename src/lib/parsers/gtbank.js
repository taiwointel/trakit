// Deterministic parser for Guaranty Trust Bank (GTBank/GTCO) Nigerian
// customer statement PDFs. Mirrors opay.js/access.js/palmpay.js: extract the
// transaction table directly via regex instead of an AI call.
//
// Row shape in pdf-parse's linear text extraction (confirmed across an
// 11-page real statement): each row is exactly
//   TransDate  ValueDate  'Reference  Amount  Balance  Branch
// with only ONE amount value present per row (GTBank's Debit/Credit split
// collapses to a single number in the text stream — the empty column
// contributes no text), so flow is inferred from the balance delta against
// the running balance, same principle as access.js.
//
// The "Remarks" column (full narration — "TRANSFER TO OPAY - TAIWO
// OLAGOKE", "Commission on NIP TransferCHARGES", etc.) is glued directly
// onto the branch name with zero separator, same as every other label/
// value pair in this statement's header — confirmed against a real
// upload's actual extracted text. Each row's own trailing capture (branch
// + remark together) is split per-row by locating where a known remark
// opener starts (see splitBranchAndRemark below); a row whose trailing
// text doesn't match any known opener just keeps a generic description
// rather than guessing.

const AMOUNT = "(?:\\d{1,3}(?:,\\d{3})*)?\\.\\d{2}";
const DATE = "\\d{2}-[A-Za-z]{3}-\\d{4}";
const RECORD_START = new RegExp(`^(${DATE})\\s+(${DATE})`);

// GTBank packs multiple transactions onto a single physical text line (only
// long, wrapped reference numbers break onto their own line) — unlike
// OPay/Access, one line does NOT mean one record. So this can't split on
// newlines and treat each line as a block the way those parsers do (that
// silently swallows every record after the first one on a shared line into
// the first record's trailing text — confirmed: it dropped every 2nd+
// same-line transaction in testing). Instead this matches globally against
// the whole (boilerplate-stripped) text with the "s" flag so a reference
// number split across a real newline is still one continuous match, and
// each row's trailing capture stops at the next date-pair via lookahead
// rather than running to end-of-line.
const ROW_G_RE = new RegExp(
  `(${DATE})\\s+(${DATE})\\s+'(.*?)\\s*(${AMOUNT})\\s+(-?${AMOUNT})\\s*(.*?)(?=${DATE}\\s+${DATE}|$)`,
  "gs",
);

const MONTHS_ABBR = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function toIsoDate(d) {
  const m = d.match(new RegExp(`^(\\d{2})-([A-Za-z]{3})-(\\d{4})$`));
  if (!m) return null;
  const [, dd, mon, yyyy] = m;
  const mm = MONTHS_ABBR[mon[0].toUpperCase() + mon.slice(1).toLowerCase()];
  if (!mm) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${dd}`;
}

function parseAmount(str) {
  const n = Number(str.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// Confirmed against a real upload's actual trailing-row text (captured via
// the temporary _gtbankDebug diagnostic): the remark is glued directly onto
// the branch name with zero separator — e.g. "635 AKIN ADESOLA TRANSFER
// BETWEEN CUSTOMERS...", "635 AKIN ADESOLA Commission on NIP
// TransferCHARGES", "UNILAG SMS ALERT CHARGE FOR ...". So each row's own
// trailing capture (branch + remark, glued) is split by finding where one
// of these known remark openers starts, per row — no separate line search
// or positional pairing across rows needed at all.
const REMARK_OPENER_RE = /(TRANSFER BETWEEN CUSTOMERS|NIBSS Instant Payment Outward|Commission on NIP Transfer|VATCHARGES|VATRecover Partial Charges|VALUE ADDED TAX|WITHHOLDING TAX|INTEREST CAPITALISED|SMS ALERT CHARGE|Stamp Duties?|Airtime Purchase|\bVAT\b)/i;

function splitBranchAndRemark(trailingRaw) {
  const text = (trailingRaw || "").replace(/\s+/g, " ").trim();
  const m = text.match(REMARK_OPENER_RE);
  if (!m) return { branch: text, remark: null };
  return { branch: text.slice(0, m.index).trim(), remark: text.slice(m.index).trim() };
}

function extractBeneficiary(remark) {
  if (!remark) return null;
  // "TRANSFER TO OPAY - TAIWO OLAGOKEOGUNFILE", "TRANSFER TO MONIEMFB -
  // YAKOYO ABULAJOINT - YAKOYO ABULA JOINT VICTORIA ISLANDBRANCH 4",
  // "TRANSFER BETWEEN CUSTOMERS...-MOBILE TRFTO GTB SAVINGS OGUNFILE TAIWO
  // OLAGOKE-ACCESS-PA TIENCE USMAN SARKI" — the other party's name
  // consistently follows the LAST " - " in the remark, whether it's an
  // outward "TRANSFER TO" or the more free-form "TRANSFER BETWEEN
  // CUSTOMERS" shape used for inbound transfers.
  const parts = remark.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 1];
    if (/^[A-Za-z][A-Za-z0-9\s]*$/.test(candidate) && candidate.length >= 3) return candidate;
  }
  const m = remark.match(/transfer\s+(?:to|from)\s+([A-Za-z][A-Za-z\s]*)/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

export function parseGtbankStatementDebug(text) {
  if (!/guaranty\s*trust\s*bank/i.test(text)) {
    return { ok: false, reason: "no-header-fingerprint", sample: text.slice(0, 500) };
  }

  const accountNoM = text.match(/Account\s*No\s*(\d{5,})/i);
  const openingM   = text.match(/Opening\s*Balance\s*(-?[\d,]+\.\d{2})/i);
  const closingM   = text.match(/Closing\s*Balance\s*(-?[\d,]+\.\d{2})/i);
  const holderM    = text.match(/CUSTOMER\s*STATEMENT\s*\n?\s*([A-Z][A-Z\s]+?)\s*\n/i);

  if (!accountNoM || !openingM) {
    return { ok: false, reason: "no-account-summary-found", sample: text.slice(0, 500) };
  }

  const accountNo = accountNoM[1];
  const openingBalance = parseAmount(openingM[1]);
  const declaredClosing = closingM ? parseAmount(closingM[1]) : null;
  const holderName = holderM ? holderM[1].replace(/\s+/g, " ").trim() : null;

  const BOILERPLATE = /^(this is a computer generated|please address all enquiries|fax\s*01|or the customer information unit|trans\.?\s*date\s*value\.?\s*date\s*reference|statement period|print\.?\s*date|branch name|account no|internal reference|address\b|account type|currency|total debit|total credit|closing balance|usable balance|opening balance|customer statement)/i;

  const cleaned = text
    .split(/\r?\n/)
    .filter((line) => !BOILERPLATE.test(line.trim()))
    .join("\n");

  const matches = [...cleaned.matchAll(ROW_G_RE)];
  if (matches.length === 0) {
    return { ok: false, reason: "no-record-start-lines-found", sample: text.slice(0, 1000) };
  }

  let unmatched = 0;
  const unmatchedSamples = [];
  const rows = [];
  let runningBalance = openingBalance;
  let remarksFoundCount = 0;

  matches.forEach((m) => {
    const [, transDate, , refRaw, amountStr, balanceStr, trailingRaw] = m;
    const amount  = parseAmount(amountStr);
    const balance = parseAmount(balanceStr);
    if (amount === null || balance === null || amount <= 0) {
      unmatched++;
      if (unmatchedSamples.length < 8) unmatchedSamples.push(m[0].replace(/\s+/g, " ").trim().slice(0, 200));
      return;
    }
    const isoDate = toIsoDate(transDate);
    if (!isoDate) {
      unmatched++;
      return;
    }
    const isOut = balance < runningBalance;
    runningBalance = balance;

    const { remark } = splitBranchAndRemark(trailingRaw);
    if (remark) remarksFoundCount++;

    rows.push({
      date: isoDate,
      desc: remark || `GTBank transaction (ref ${(refRaw || "").replace(/\s+/g, " ").trim() || "n/a"})`,
      amount,
      flow: isOut ? "out" : "in",
      beneficiary: extractBeneficiary(remark),
      balanceAfter: balance,
      accountRef: `gtbank:${accountNo}`,
    });
  });

  if (unmatched > matches.length * 0.5) {
    return {
      ok: false,
      reason: "too-many-unmatched-blocks",
      blocks: matches.length,
      unmatched,
      rows: rows.length,
      unmatchedSamples,
    };
  }

  const reconciliation = declaredClosing !== null
    ? { declaredClosing, computedClosing: runningBalance, drift: Math.abs(declaredClosing - runningBalance) }
    : null;

  // A drift beyond a few naira means the numeric parse itself is wrong
  // somewhere (a missed row, a misread amount) — don't ship silently wrong
  // balances, fall back to AI extraction instead.
  if (reconciliation && reconciliation.drift > 5) {
    return { ok: false, reason: "balance-mismatch", accountNo, reconciliation, unmatchedSamples };
  }

  return {
    ok: true,
    rows,
    accountRef: `gtbank:${accountNo}`,
    holderName,
    remarksFound: remarksFoundCount,
    remarksTotal: rows.length,
    reconciliation,
  };
}

export function parseGtbankStatement(text) {
  const result = parseGtbankStatementDebug(text);
  return result.ok ? result.rows : null;
}
