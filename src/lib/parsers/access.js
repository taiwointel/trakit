// Deterministic parser for Access Bank Nigerian bank statement PDFs. Mirrors
// opay.js/palmpay.js: extract the transaction table directly via regex
// instead of an AI call. Returns { ok: false, ... } if the text doesn't look
// like a parseable Access Bank statement, so callers fall back to the AI
// extraction path.
//
// pdf-parse groups text items sharing the same Y coordinate onto one line
// with NO separator between them (see pdf-parse's render_page), so a table
// row like "Post Date | Value Date | Narration | Ref | Debit/Credit |
// Balance" renders as e.g. "01/06/202601/06/2026TRF//FRM ... TOTAIWO ...
// NXG8576803056922222111,600.00181.31" — dates glued to each other and to
// the narration, and the trailing ref number glued directly to the
// amount and balance with no separator. A single statement can contain
// multiple accounts, each as its own "Account Number: ..." section with its
// own Opening Balance to anchor from.
//
// Only one of Debit/Credit is populated per row (the other is blank, so it
// contributes no text), so each row yields exactly one amount before the
// balance. Flow is therefore inferred from the balance delta (this account
// row's balance vs. the running balance carried from the previous row),
// not from column position.

const AMOUNT = "\\d{1,3}(?:,\\d{3})*\\.\\d{2}";
const DATE = "\\d{2}\\/\\d{2}\\/\\d{4}";
const RECORD_START = new RegExp(`^(${DATE})(${DATE})`);
const PREFIX_RE = new RegExp(`^(${DATE})(${DATE})\\s*(.*)$`);
const TRAILING_AMOUNT_RE = new RegExp(`^-?${AMOUNT}$`);

function parseAmount(str) {
  return Number(str.replace(/,/g, ""));
}

// Neither "shortest trailing match" nor "longest trailing match" is reliably
// correct: the ref number glued directly before the balance is a raw digit
// run with no delimiter, and can itself look like a shorter *or* longer
// valid decimal than the real balance (e.g. "...4975.590.00" could parse as
// balance "590.00" instead of the real "0.00"; "...222211,600.0029.63"
// could parse as balance "9.63" instead of the real "29.63"). So every
// syntactically valid split point is kept as a candidate; resolveRow below
// picks the real one.
function getCandidates(tail) {
  const candidates = [];
  for (let i = 0; i < tail.length; i++) {
    const ch = tail[i];
    if (ch !== "-" && !(ch >= "0" && ch <= "9")) continue;
    const suffix = tail.slice(i);
    if (TRAILING_AMOUNT_RE.test(suffix)) {
      candidates.push({ desc: tail.slice(0, i).trim(), balance: parseAmount(suffix) });
    }
  }
  return candidates;
}

function formatAmount(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The debit/credit amount is glued directly in front of the balance with no
// delimiter (e.g. "...19.630.00" = amount "19.63" + balance "0.00"), which
// gives a strong local check: for the correct balance candidate, the exact
// comma-formatted string of the implied amount (|candidate.balance -
// runningBalance|) must appear as the literal trailing text of the
// candidate's desc. Spurious candidates (splits that land mid-ref-number)
// essentially never satisfy this, since ref numbers don't reconstruct into
// the exact digit sequence of a real amount. This resolves each row using
// only the running balance carried from prior rows — no dependency on the
// statement's declared Closing Balance, which in practice can itself be
// inconsistent with its own Debits/Credits totals (seen in a real sample).
//
// There is deliberately no "best guess" fallback here: on a same-day batch
// of transactions, the printed order can be reshuffled relative to the true
// posting order, so a row can legitimately fail to reconcile against the
// immediately-preceding running balance even though nothing is wrong with
// the extraction. Guessing (e.g. smallest-delta) produces silently wrong
// amounts that cascade into every following row. It's safer to leave the
// row unresolved — the caller skips it and leaves runningBalance untouched
// so a later row can resync against the last known-good balance — than to
// fabricate a number.
function resolveRow(candidates, runningBalance) {
  const matches = candidates.filter((c) => {
    const amount = Math.round(Math.abs(c.balance - runningBalance) * 100) / 100;
    return c.desc.endsWith(formatAmount(amount));
  });
  return matches.length ? matches[0] : null;
}

function buildInternalRegex(holderName) {
  if (!holderName) return null;
  const escaped = holderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`^trf\\s*\\/\\/\\s*frm\\s+${escaped}\\s+to\\s+${escaped}$`, "i");
}

function extractBeneficiary(desc) {
  let m = desc.match(/^transfer\s+from\s+(.+?)(?:\d{6,}.*)?$/i);
  if (m) return m[1].replace(/\s+/g, " ").trim();
  m = desc.match(/\/\s*\/\s*([A-Za-z][A-Za-z\s]*?)\s*$/);
  if (m) return m[1].replace(/\s+/g, " ").trim();
  return null;
}

function extractAccountSections(text) {
  const sections = [];
  const markerRe = /Account Number:\s*(\S+)[\s\S]*?Account Name:\s*(.*?)\s*Product Name:[\s\S]*?Opening Balance:\s*(-?[\d,]+\.\d{2})[\s\S]*?Closing Balance:\s*(-?[\d,]+\.\d{2})/g;
  const starts = [];
  let m;
  while ((m = markerRe.exec(text))) {
    starts.push({ index: m.index, accountNo: m[1], holderName: m[2].trim(), openingBalance: parseAmount(m[3]), closingBalance: parseAmount(m[4]) });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    sections.push({ ...starts[i], body: text.slice(start, end) });
  }
  return sections;
}

export function parseAccessStatementDebug(text) {
  if (!/post\s*date\s*value\s*date\s*narration\s*ref\s*\/?\s*cheque\s*no\.?\s*debits\s*credits\s*balance/i.test(text)) {
    return { ok: false, reason: "no-header-fingerprint", sample: text.slice(0, 500) };
  }

  const sections = extractAccountSections(text);
  if (sections.length === 0) {
    return { ok: false, reason: "no-account-sections-found", sample: text.slice(0, 500) };
  }

  let totalBlocks = 0;
  let unmatched = 0;
  const unmatchedSamples = [];
  const rows = [];

  for (const section of sections) {
    const INTERNAL = buildInternalRegex(section.holderName);
    // Page-break boilerplate (footer disclaimer, "Page X of Y", the repeated
    // column header on each new page) has no leading date, so without
    // stripping it here it gets glued onto whichever transaction block
    // happened to be open when the page broke, corrupting that row's
    // trailing balance match.
    const BOILERPLATE = /^(you must advise access bank|all products are subject to bank terms|phone number|email:|page \d+ of \d+|post\s*date\s*value\s*date\s*narration|your account statement|account details)/i;
    const lines = section.body.split(/\r?\n/).filter((line) => !BOILERPLATE.test(line.trim()));

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

    totalBlocks += blocks.length;
    let runningBalance = section.openingBalance;

    for (const raw of blocks) {
      const block = raw.replace(/\s+/g, " ").trim();
      const pm = block.match(PREFIX_RE);
      if (!pm) {
        unmatched++;
        if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
        continue;
      }
      const candidates = getCandidates(pm[3]);
      const chosen = candidates.length ? resolveRow(candidates, runningBalance) : null;
      if (!chosen) {
        // Leave runningBalance untouched rather than guessing — a later row
        // in the same same-day batch often reconciles cleanly against this
        // same last-known-good balance (see resolveRow's comment).
        unmatched++;
        if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
        continue;
      }

      const desc = chosen.desc.replace(/\s+/g, " ").trim();
      const amount = Math.round(Math.abs(chosen.balance - runningBalance) * 100) / 100;
      const isOut = chosen.balance < runningBalance;
      runningBalance = chosen.balance;

      if (!amount || amount <= 0) continue;
      if (INTERNAL && INTERNAL.test(desc)) continue;

      const [dd, mm, yyyy] = pm[1].split("/");
      rows.push({
        date: `${yyyy}-${mm}-${dd}`,
        desc,
        amount,
        flow: isOut ? "out" : "in",
        beneficiary: extractBeneficiary(desc),
      });
    }

    // The declared Closing Balance is a useful cross-check but isn't always
    // reliable — real-world statements can have a Closing Balance field
    // inconsistent with their own Debits/Credits totals. It's now a secondary
    // safety net (the primary one is the unmatched-block ratio below, since
    // unresolved rows no longer silently guess a wrong balance), so a modest
    // tolerance is enough — a large drift means something structurally wrong.
    const drift = Math.abs(runningBalance - section.closingBalance);
    if (drift > 50) {
      return {
        ok: false,
        reason: "balance-mismatch",
        accountNo: section.accountNo,
        expectedClosing: section.closingBalance,
        computedClosing: runningBalance,
      };
    }
  }

  if (totalBlocks === 0) {
    return { ok: false, reason: "no-record-start-lines-found", sample: text.slice(0, 1000) };
  }

  if (unmatched > totalBlocks * 0.5) {
    return {
      ok: false,
      reason: "too-many-unmatched-blocks",
      blocks: totalBlocks,
      unmatched,
      rows: rows.length,
      unmatchedSamples,
    };
  }

  return { ok: true, rows };
}

export function parseAccessStatement(text) {
  const result = parseAccessStatementDebug(text);
  return result.ok ? result.rows : null;
}
