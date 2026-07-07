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
// Transfer rows sometimes glue the counterparty's 10-digit (or masked,
// "903****807"-shaped) phone/account number directly onto the description,
// right before the amount, e.g. "Transfer to X | OPay | 90682518375,000.00".
// There's no delimiter, so a plain amount regex greedily absorbs those 10
// digits into the debit figure and turns ₦5,000 into ₦906,825,183,750,000.
// Since it's always exactly 10 characters wide and always sits right after
// the description's trailing "| ", it can be stripped unambiguously before
// the amount regex ever runs.
const ACCOUNT_TOKEN = /(\|\s*)(\d{10}|\d{3}\*{4}\d{3})(?=--|[\d,])/g;

// The Wallet auto-sweeps to OWealth after nearly every transaction, so the
// Wallet's own balance alone is a misleading "cash balance" — it sits near
// ₦0 almost every day while the real money quietly parks in OWealth. Pull
// OWealth's own running balance the exact same way, from the Savings
// Account section, purely to read its balance progression (not to create
// ledger rows — none of these are ever real external transactions).
function parseOwealthBalancePoints(owealthSection) {
  const lines = owealthSection.split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (RECORD_START.test(line)) {
      if (current) blocks.push(current);
      current = line;
    } else if (/^\d+$/.test(line.trim())) {
      continue;
    } else if (current) {
      current += line;
    }
  }
  if (current) blocks.push(current);

  const perDate = {};
  const dateOrder = [];
  for (const raw of blocks) {
    const m = raw.trim().match(LINE_RE);
    if (!m) continue;
    const [, dateStr, , , , balanceAfterStr] = m;
    const date = toIsoDate(dateStr);
    if (!date) continue;
    const balanceAfter = balanceAfterStr && balanceAfterStr !== "--"
      ? Number(balanceAfterStr.replace(/,/g, ""))
      : null;
    if (balanceAfter === null) continue;
    if (!(date in perDate)) dateOrder.push(date);
    perDate[date] = balanceAfter; // overwritten on every later block for the same date, so this ends up as that date's last-seen balance
  }
  return dateOrder.map((date) => ({ date, balance: perDate[date] }));
}

// Most recent known OWealth balance on or before `date` — OWealth doesn't
// necessarily move every day, so this carries the last known figure
// forward rather than requiring same-day OWealth activity to exist.
function owealthBalanceAsOf(points, date) {
  let result = null;
  for (const p of points) {
    if (p.date <= date) result = p.balance;
    else break;
  }
  return result;
}

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

  // Groups this statement's entries against any other account the user has
  // imported (see lib/cashBalance.js) — critical once more than one bank is
  // in play, since one account's own balance_after only ever tells you
  // that account's own total, never the user's combined cash.
  const acctMatch = text.match(/account\s*number\s*\n?\s*(\d{6,})/i);
  const accountRef = acctMatch ? `opay:${acctMatch[1]}` : null;

  // The Wallet's own declared Opening/Closing Balance (the summary box
  // right above "Wallet Account") is a reconciliation cross-check: does
  // our own computed running balance for the section actually land where
  // the bank says it should? Confirmed against a real statement; not used
  // to reject the import (unlike Access, this format hasn't shown drift
  // yet), just surfaced so a genuine parsing regression is loud instead of
  // silent.
  const declaredOpeningMatch = text.match(/opening\s*balance\s*\n?\s*₦?([\d,]+\.\d{2})/i);
  const declaredClosingMatch = text.match(/closing\s*balance\s*\n?\s*₦?([\d,]+\.\d{2})/i);
  const declaredOpening = declaredOpeningMatch ? Number(declaredOpeningMatch[1].replace(/,/g, "")) : null;
  const declaredClosing = declaredClosingMatch ? Number(declaredClosingMatch[1].replace(/,/g, "")) : null;

  // Only the Wallet Account section holds real external transactions —
  // Savings Account (OWealth) is a separate table of internal sub-balance
  // movements and interest accruals. The literal "Savings Account" text is
  // NOT a reliable boundary: OPay prints that section's summary box (Total
  // Credit/Closing Balance/Debit Count/etc.) on the page *before* the Wallet
  // Account table's final rows finish printing, so cutting at the text
  // match truncates real trailing wallet transactions. The repeated column
  // header ("Trans. Time Value Date Description Debit...") is reliable: it
  // appears once above the Wallet Account table and again directly above
  // the real Savings Account table, with no such gap.
  const HEADER_FINGERPRINT = /trans\.?\s*time\s*value\s*date\s*description\s*debit/gi;
  const headerPositions = [...text.matchAll(HEADER_FINGERPRINT)].map((m) => m.index);
  const walletStart = headerPositions[0] ?? text.search(/wallet account/i);
  const savingsStart = headerPositions.length > 1 ? headerPositions[1] : text.search(/savings account/i);
  const section = text.slice(walletStart, savingsStart > walletStart ? savingsStart : undefined);

  // Everything after the wallet section is OWealth's own table, used only
  // to read its balance progression (see parseOwealthBalancePoints above).
  const owealthPoints = savingsStart > walletStart ? parseOwealthBalancePoints(text.slice(savingsStart)) : [];

  const lines = section.split(/\r?\n/);

  // PDF text extraction wraps descriptions and reference numbers across
  // multiple lines — stitch each record back together by treating any line
  // starting with the trans-time/value-date pair as a new record. Lines are
  // joined with NO separator (not a space): newlines here don't reliably
  // correspond to word boundaries in the source table.
  // Bare reference-number fragments (a line that's nothing but digits) can
  // land between the description and the debit/credit figures, e.g.
  // "Transfer to X | OPay |" / "8026390703" / "20,000.00--0.00Mobile...".
  // Glued with no separator, that digit run merges into the amount regex
  // and inflates ₦20,000 into ₦802,639,070,320,000. None of the parsed
  // fields ever use these fragments (only date/desc/debit/credit are read
  // out of the match below), so they're safe to drop outright.
  const REFERENCE_FRAGMENT = /^\d+$/;

  // Some rows have their description printed *before* their own date/time
  // line reappears, with a page footer (the same Credit Count/Total
  // Credit/.../Savings Account summary box used as the section boundary
  // above) sitting in between — e.g. "Transfer from MELEKI JOSIAH
  // OLAMILEKAN | Guaranty Trust Bank | ... | NIP Transfer to TAIWO" appears,
  // then the footer text, then "04 Jul 2026 13:19:03...OLAGOKE OGUNFILE."
  // reappears as what looks like a *new*, unrelated record. Naively
  // stitching by "append until the next RECORD_START" glues that orphaned
  // description onto the END of the *previous* (unrelated) row instead —
  // which, when that previous row happens to be an internal OWealth sweep,
  // silently discards the real description, beneficiary, and (crucially)
  // wrongly leaves only a fragment of the account holder's own name behind
  // for the row that actually reappears, which self-transfer detection can
  // then mistake for a match. A real narration only ever starts with
  // "Transfer to/from" as its very first word; if that shows up on a line
  // with no date prefix while the block being built already has an amount/
  // channel appended (i.e. it's already "finished"), it's this orphan
  // pattern — buffer it separately and splice it into the *next* record's
  // description instead of losing it.
  const ORPHAN_DESC_START = /^Transfer\s*(?:to|from)\b/i;
  const HAS_AMOUNT_CHANNEL = /(Mobile|POS|WEB)/;

  const blocks = [];
  let current = null;
  let pendingOrphanDesc = "";
  let inOrphan = false;
  for (const line of lines) {
    if (RECORD_START.test(line)) {
      if (current) blocks.push(current);
      if (pendingOrphanDesc) {
        const m = line.match(RECORD_START);
        current = m[0] + pendingOrphanDesc + line.slice(m[0].length);
        pendingOrphanDesc = "";
      } else {
        current = line;
      }
      inOrphan = false;
    } else if (REFERENCE_FRAGMENT.test(line.trim())) {
      inOrphan = false; // a reference number always ends an orphaned description
      continue;
    } else if (!inOrphan && ORPHAN_DESC_START.test(line.trim()) && current && HAS_AMOUNT_CHANNEL.test(current)) {
      pendingOrphanDesc += line;
      inOrphan = true;
    } else if (inOrphan) {
      pendingOrphanDesc += line;
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
  // The wallet auto-sweeps to OWealth after nearly every real transaction,
  // so the *true* end-of-day wallet balance often comes from an internal
  // sweep row — one we deliberately never keep as a ledger entry. Track
  // each date's true closing balance from every block (external or
  // internal), independent of what gets kept, so it can be attached to
  // whichever kept transaction is last for that day.
  const dailyClosing = {};
  let lastWalletBalance = null; // the very last balance seen, in block order — the Wallet's true final balance, for reconciliation
  for (const raw of blocks) {
    const block = raw.trim().replace(ACCOUNT_TOKEN, "$1");
    const m = block.match(LINE_RE);
    if (!m) {
      unmatched++;
      if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
      continue;
    }
    const [, dateStr, descRaw, debit, credit, balanceAfterStr] = m;
    const desc = descRaw.replace(/\s+/g, " ").trim();

    const date = toIsoDate(dateStr);
    if (!date) { unmatched++; continue; }

    const balanceAfter = balanceAfterStr && balanceAfterStr !== "--"
      ? Number(balanceAfterStr.replace(/,/g, ""))
      : null;
    if (balanceAfter !== null) {
      dailyClosing[date] = balanceAfter;
      lastWalletBalance = balanceAfter;
    }

    if (INTERNAL.test(desc)) continue;

    const isOut = debit !== "--";
    const amount = Number((isOut ? debit : credit).replace(/,/g, ""));
    if (!amount || amount <= 0) continue;

    rows.push({
      date,
      desc,
      amount,
      flow: isOut ? "out" : "in",
      beneficiary: extractBeneficiary(desc),
      balanceAfter: null, // filled in below, only on the day's last kept row
      accountRef,
    });
  }

  const lastIndexForDate = {};
  rows.forEach((r, i) => { lastIndexForDate[r.date] = i; });
  rows.forEach((r, i) => {
    if (i === lastIndexForDate[r.date] && dailyClosing[r.date] !== undefined) {
      // "Cash balance" means total spendable money, not just the Wallet's
      // own sub-balance — combine it with OWealth's most recent known
      // balance as of this date so the figure actually matches what the
      // user thinks of as their OPay balance.
      const owealth = owealthBalanceAsOf(owealthPoints, r.date) ?? 0;
      r.balanceAfter = dailyClosing[r.date] + owealth;
    }
  });

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

  // Reconciliation: does our own computed final Wallet balance land where
  // the bank's own declared Closing Balance says it should? A drift here
  // means something in this statement's layout broke an assumption the
  // regex above depends on — surfaced for visibility, not used to reject
  // the import outright (unlike Access, this format hasn't shown genuine
  // drift in practice, only exact matches).
  const reconciliation = (declaredClosing !== null && lastWalletBalance !== null)
    ? { declaredClosing, computedClosing: lastWalletBalance, drift: Math.abs(declaredClosing - lastWalletBalance) }
    : null;

  return { ok: true, rows, accountRef, reconciliation, declaredOpening, declaredClosing };
}

export function parseOpayStatement(text) {
  const result = parseOpayStatementDebug(text);
  return result.ok ? result.rows : null;
}
