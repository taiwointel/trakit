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

// Access Bank also issues a second, differently-laid-out PDF for
// customer-requested (as opposed to automatic monthly) statements: dates are
// "01-JAN-26" instead of "01/06/2026", the column header reads "Posted Date
// Value Date Description Debit (NGN) Credit (NGN) Balance (NGN)" instead of
// "Post Date Value Date Narration Ref/Cheque No. Debits Credits Balance",
// and the account/opening-closing balance summary sits in a differently
// worded, two-column "Account Details" / "Financial Summary" block instead
// of one inline "Account Number: ... Product Name: ..." line. The glued,
// no-separator row layout that resolveRow/resolveBatch/getCandidates were
// built for is otherwise identical, so this format reuses all of that —
// only the date regex, header fingerprint, and section-boundary extraction
// differ.
const MONTHS_ABBR = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
const DATE2 = "\\d{2}-[A-Z]{3}-\\d{2}";
const RECORD_START2 = new RegExp(`^(${DATE2})\\s*(${DATE2})`);
const PREFIX_RE2 = new RegExp(`^(${DATE2})\\s*(${DATE2})\\s*(.*)$`);

function toIsoDate2(d) {
  const m = d.match(/^(\d{2})-([A-Z]{3})-(\d{2})$/);
  if (!m) return null;
  const [, dd, mon, yy] = m;
  const mm = MONTHS_ABBR[mon];
  if (!mm) return null;
  return `20${yy}-${String(mm).padStart(2, "0")}-${dd}`;
}

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


// When a same-date batch can't be reconciled at all (seen in a real
// statement: an internal rounding drift of a few kobo on one line offsets
// every balance after it by that fixed amount), there's no attribution to
// trust for any row in it — but its last line's own printed balance is
// still real, so resyncing to that (rather than leaving runningBalance
// frozen) lets every later, otherwise-correct batch keep reconciling
// instead of cascading into "unmatched" for the rest of the statement.
function lastPrintedBalance(block) {
  const m = block.match(new RegExp(`(-?${AMOUNT})\\s*$`));
  return m ? parseAmount(m[1]) : null;
}

// The declared Debit/Credit figure printed right before the balance is the
// bank's own stated amount for the row — more trustworthy than the diff
// against a running balance, since real statements carry small per-line
// kobo rounding noise (confirmed against a real statement where nearly
// every principal/interest liquidation that day was off the naive diff by
// a cent or two) that would otherwise fail an exact diff/text match despite
// the row being perfectly legitimate.
//
// But a naive single regex match here has the exact same ambiguity problem
// as the balance itself: a reference code's trailing digit can glue onto
// the amount's own leading digit (e.g. desc "...STPL2504203X825,000.00-",
// where the true amount is 25,000.00 and the "8" belongs to the reference),
// and a plain "find the amount at the end" regex greedily prefers the
// leftmost/longest match, silently absorbing that stray digit. So this
// mirrors getCandidates: every syntactically valid trailing-amount split of
// desc is kept as its own candidate (with an optional trailing "-" for the
// format's empty-column placeholder), and resolveRow below picks whichever
// one, combined with its balance candidate, best fits the running balance —
// exactly the same "verify against the running balance, don't trust the
// text in isolation" principle as the balance candidates themselves.
function getAmountCandidates(desc) {
  const candidates = [];
  for (let i = 0; i < desc.length; i++) {
    if (!(desc[i] >= "0" && desc[i] <= "9")) continue;
    const suffix = desc.slice(i);
    const m = suffix.match(new RegExp(`^(${AMOUNT})-?$`));
    if (m) {
      // Whichever of Debit/Credit is empty prints as a literal "-"
      // placeholder immediately before the populated one (e.g. a credit-only
      // row's tail is "...SALARY-747,647.50", the "-" marking the empty
      // Debit column) — strip that placeholder along with the amount so it
      // doesn't linger at the end of the narration.
      const prefix = desc.slice(0, i).replace(/-\s*$/, "").trim();
      candidates.push({ desc: prefix, amount: parseAmount(m[1]) });
    }
  }
  return candidates;
}

// "Leftmost candidate is always correct" turned out to be false against a
// real statement: a reference code glued directly onto its row's own amount
// with zero separator produces a leftmost split that's a genuinely
// different, wrong number — not just a truncated fragment of the real one.
// The one signal that can't be fooled by ref-number digits is the running
// balance: for the true balance/amount pair, the amount must equal the
// balance delta (within the statement's own small kobo rounding noise); for
// a wrong pairing, the "amount" is contaminated by stray reference digits
// and misses the delta by whole naira, not kobo. So score every combination
// of balance candidate x amount-within-that-candidate's-desc by how closely
// it fits the delta, and take the best fit within a tolerance loose enough
// for rounding noise but far too tight for a reference-digit collision to
// sneak through.
function resolveRow(candidates, runningBalance) {
  let best = null;
  let bestDelta = Infinity;
  for (const c of candidates) {
    const delta = Math.abs(c.balance - runningBalance);
    for (const ac of getAmountCandidates(c.desc)) {
      const diff = Math.abs(ac.amount - delta);
      if (diff < bestDelta) {
        bestDelta = diff;
        best = { desc: ac.desc, balance: c.balance, amount: ac.amount };
      }
    }
  }
  return bestDelta <= 1 ? best : null;
}

// Rows sharing the same posted date can be printed in a different order
// than they actually posted internally (e.g. a same-day inbound transfer
// printed first even though it posted after several fee deductions that
// day) — confirmed against a real statement, where a same-day batch only
// reconciles once one row is treated as happening last, not first. Since
// the ledger only needs date-level granularity (not intraday order), this
// searches every ordering of a same-date batch for one where each row
// resolves in turn via resolveRow, rather than assuming print order.
// Batches are small in practice (same-day transaction counts), and wrong
// branches die immediately (resolveRow fails fast), so this stays cheap
// despite being worst-case factorial.
function resolveBatch(blocks, startBalance) {
  const n = blocks.length;
  const used = new Array(n).fill(false);
  const order = [];

  function dfs(running) {
    if (order.length === n) return true;
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const chosen = resolveRow(blocks[i].candidates, running);
      if (!chosen) continue;
      used[i] = true;
      order.push({ index: i, chosen });
      if (dfs(chosen.balance)) return true;
      order.pop();
      used[i] = false;
    }
    return false;
  }

  return dfs(startBalance) ? order : null;
}

// Fallback for when resolveBatch can't reconcile the whole same-date batch
// as one chain — happens when one row's own printed balance has a small
// internal drift (confirmed against a real statement: a same-day salary
// credit whose implied amount was 2 kobo off its printed amount). Rather
// than losing every other, individually-correct row in that batch, walk it
// in print order, resolving what matches and resyncing off each drifted
// row's own printed balance (never fabricated) so later rows keep working.
function resolveBatchSequential(blocks, startBalance) {
  let running = startBalance;
  const resolved = [];
  for (let i = 0; i < blocks.length; i++) {
    const chosen = resolveRow(blocks[i].candidates, running);
    if (chosen) {
      resolved.push({ index: i, chosen, prevBalance: running });
      running = chosen.balance;
    } else {
      const printed = lastPrintedBalance(blocks[i].block);
      if (printed !== null) running = printed;
    }
  }
  return { resolved, finalBalance: running };
}

function buildInternalRegex(holderName) {
  if (!holderName) return null;
  const escaped = holderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`^trf\\s*\\/\\/\\s*frm\\s+${escaped}\\s+to\\s+${escaped}$`, "i");
}

// Every kept row already carries its own real balance_after, but only the
// last row of a given date represents that day's true closing balance —
// keep it there and null the rest, so the calculation layer never mistakes
// an earlier same-day balance for the day's closing figure.
function keepLastBalancePerDate(rows) {
  const lastIndexForDate = {};
  rows.forEach((r, i) => { lastIndexForDate[r.date] = i; });
  rows.forEach((r, i) => {
    if (i !== lastIndexForDate[r.date]) r.balanceAfter = null;
  });
}

function extractBeneficiary(desc) {
  let m = desc.match(/^transfer\s+from\s+(.+?)(?:\d{6,}.*)?$/i);
  if (m) return m[1].replace(/\s+/g, " ").trim();
  // Handles both "TO PAY/ /NAME" (double slash) and "TO PAY/ NAME" (single
  // slash) narration variants — Access statements print either depending on
  // the transaction's originating channel, and only matching the double
  // slash left self-transfers with the single-slash variant untagged.
  m = desc.match(/\/\s*\/?\s*([A-Za-z][A-Za-z\s]*?)\s*$/);
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

// Each account's block in this second format starts with its own
// "ACCOUNT STATEMENT" title, and the account number / holder name / opening
// / closing balance labels can appear in either order relative to each
// other (they're printed in a two-column layout, so their glued order
// depends on row Y-coordinates, not label position) — so each is matched
// independently within the section rather than as one chained regex.
function extractAccountSections2(text) {
  const markerRe = /account\s*statement/gi;
  const starts = [];
  let m;
  while ((m = markerRe.exec(text))) starts.push(m.index);
  if (starts.length === 0) return [];

  const sections = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    const body = text.slice(start, end);
    const txIdx = body.search(/transactions/i);
    const preamble = txIdx === -1 ? body : body.slice(0, txIdx);

    const accountNoM = preamble.match(/Account\s*Number:\s*(\d{5,})/i);
    const holderM     = preamble.match(/Account\s*Name:\s*([A-Z][A-Za-z\s]+?)(?=Branch\s*Address|Account\s*Class|Customer|$)/i);
    const openingM    = preamble.match(/Opening\s*Balance:\s*(-?[\d,]+\.\d{2})/i);
    const closingM    = preamble.match(/Closing\s*Balance:\s*(-?[\d,]+\.\d{2})/i);
    if (!accountNoM || !openingM || !closingM) continue;

    sections.push({
      accountNo:      accountNoM[1],
      holderName:     holderM ? holderM[1].replace(/\s+/g, " ").trim() : null,
      openingBalance: parseAmount(openingM[1]),
      closingBalance: parseAmount(closingM[1]),
      body,
    });
  }
  return sections;
}

function parseAccessFormat2(text) {
  const sections = extractAccountSections2(text);
  if (sections.length === 0) {
    return { ok: false, reason: "no-account-sections-found", sample: text.slice(0, 500) };
  }

  let totalBlocks = 0;
  let unmatched = 0;
  const unmatchedSamples = [];
  const rows = [];

  for (const section of sections) {
    const INTERNAL = buildInternalRegex(section.holderName);
    const BOILERPLATE = /^(this is an automated transaction alert|account statement|generated on|account details|financial summary|summary\s*statement\s*period|currency:|account name:|branch address:|account class:|customer'?s?\s*address:|account number:|opening balance:|total withdrawals:|total deposits:|closing balance:|cleared balance:|uncleared balance:|posted\s*date\s*value\s*date\s*description|for enquiries on access bank)/i;
    // The trailing "automated transaction alert" disclaimer at the very end
    // of the statement wraps across multiple pdf-parse lines (e.g. a phone
    // number split mid-sentence), and only its first line matches
    // BOILERPLATE above — later wrapped lines (like "2802500, +234 0201-
    // 2712500-7 or send an email to...") don't start with any known phrase,
    // so a stateless per-line filter lets them slip through and glue onto
    // the last transaction block, corrupting its balance parse. Once the
    // disclaimer starts, nothing meaningful follows it in the document, so
    // stop collecting lines entirely rather than filtering line-by-line.
    const rawLines = section.body.split(/\r?\n/);
    const lines = [];
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (/^this is an automated transaction alert/i.test(trimmed)) break;
      if (!BOILERPLATE.test(trimmed)) lines.push(line);
    }

    const blocks = [];
    let current = null;
    for (const line of lines) {
      if (RECORD_START2.test(line)) {
        if (current) blocks.push(current);
        current = line;
      } else if (current) {
        current += " " + line;
      }
    }
    if (current) blocks.push(current);

    totalBlocks += blocks.length;
    let runningBalance = section.openingBalance;

    const parsed = [];
    for (const raw of blocks) {
      const block = raw.replace(/\s+/g, " ").trim();
      const pm = block.match(PREFIX_RE2);
      if (!pm) {
        unmatched++;
        if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
        continue;
      }
      parsed.push({ date: pm[1], candidates: getCandidates(pm[3]), block });
    }

    let i = 0;
    while (i < parsed.length) {
      let j = i + 1;
      while (j < parsed.length && parsed[j].date === parsed[i].date) j++;
      const batch = parsed.slice(i, j);
      i = j;

      let resolution = resolveBatch(batch, runningBalance);
      if (!resolution) {
        const fallback = resolveBatchSequential(batch, runningBalance);
        unmatched += batch.length - fallback.resolved.length;
        for (const b of batch) {
          if (unmatchedSamples.length < 8) unmatchedSamples.push(b.block.slice(0, 200));
        }
        resolution = fallback.resolved;
        for (const { index, chosen, prevBalance } of resolution) {
          const pm = batch[index];
          const { amount, desc } = chosen;
          const isOut = chosen.balance < prevBalance;

          if (!amount || amount <= 0) continue;
          if (INTERNAL && INTERNAL.test(desc)) continue;

          const isoDate = toIsoDate2(pm.date);
          if (!isoDate) continue;
          rows.push({
            date: isoDate,
            desc,
            amount,
            flow: isOut ? "out" : "in",
            beneficiary: extractBeneficiary(desc),
            balanceAfter: chosen.balance,
            accountRef: `access:${section.accountNo}`,
          });
        }
        runningBalance = fallback.finalBalance;
        continue;
      }

      for (const { index, chosen } of resolution) {
        const pm = batch[index];
        const { amount, desc } = chosen;
        const isOut = chosen.balance < runningBalance;
        runningBalance = chosen.balance;

        if (!amount || amount <= 0) continue;
        if (INTERNAL && INTERNAL.test(desc)) continue;

        const isoDate = toIsoDate2(pm.date);
        if (!isoDate) continue;
        rows.push({
          date: isoDate,
          desc,
          amount,
          flow: isOut ? "out" : "in",
          beneficiary: extractBeneficiary(desc),
          balanceAfter: chosen.balance,
            accountRef: `access:${section.accountNo}`,
        });
      }
    }

    const drift = Math.abs(runningBalance - section.closingBalance);
    if (drift > 1000) {
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

  keepLastBalancePerDate(rows);
  return { ok: true, rows };
}

export function parseAccessStatementDebug(text) {
  if (/posted\s*date\s*value\s*date\s*description\s*debit\s*\(ngn\)\s*credit\s*\(ngn\)\s*balance\s*\(ngn\)/i.test(text)) {
    return parseAccessFormat2(text);
  }

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

    // Parse every block up front and group consecutive same-date blocks
    // into batches, since intraday order in the printout isn't reliable
    // (see resolveBatch) but the date grouping itself is.
    const parsed = [];
    for (const raw of blocks) {
      const block = raw.replace(/\s+/g, " ").trim();
      const pm = block.match(PREFIX_RE);
      if (!pm) {
        unmatched++;
        if (unmatchedSamples.length < 8) unmatchedSamples.push(block.slice(0, 200));
        continue;
      }
      parsed.push({ date: pm[1], candidates: getCandidates(pm[3]), block });
    }

    let i = 0;
    while (i < parsed.length) {
      let j = i + 1;
      while (j < parsed.length && parsed[j].date === parsed[i].date) j++;
      const batch = parsed.slice(i, j);
      i = j;

      let resolution = resolveBatch(batch, runningBalance);
      if (!resolution) {
        const fallback = resolveBatchSequential(batch, runningBalance);
        unmatched += batch.length - fallback.resolved.length;
        for (const b of batch) {
          if (unmatchedSamples.length < 8) unmatchedSamples.push(b.block.slice(0, 200));
        }
        resolution = fallback.resolved;
        for (const { index, chosen, prevBalance } of resolution) {
          const pm = batch[index];
          const { amount, desc } = chosen;
          const isOut = chosen.balance < prevBalance;

          if (!amount || amount <= 0) continue;
          if (INTERNAL && INTERNAL.test(desc)) continue;

          const [dd, mm, yyyy] = pm.date.split("/");
          rows.push({
            date: `${yyyy}-${mm}-${dd}`,
            desc,
            amount,
            flow: isOut ? "out" : "in",
            beneficiary: extractBeneficiary(desc),
            balanceAfter: chosen.balance,
            accountRef: `access:${section.accountNo}`,
          });
        }
        runningBalance = fallback.finalBalance;
        continue;
      }

      for (const { index, chosen } of resolution) {
        const pm = batch[index];
        const { amount, desc } = chosen;
        const isOut = chosen.balance < runningBalance;
        runningBalance = chosen.balance;

        if (!amount || amount <= 0) continue;
        if (INTERNAL && INTERNAL.test(desc)) continue;

        const [dd, mm, yyyy] = pm.date.split("/");
        rows.push({
          date: `${yyyy}-${mm}-${dd}`,
          desc,
          amount,
          flow: isOut ? "out" : "in",
          beneficiary: extractBeneficiary(desc),
          balanceAfter: chosen.balance,
            accountRef: `access:${section.accountNo}`,
        });
      }
    }

    // The declared Closing Balance is a useful cross-check but isn't always
    // reliable — confirmed against a real statement where it's off by
    // ~486 from its own Debits/Credits totals (894.38 declared vs 408.48
    // actually implied), while every individual row still reconciles
    // correctly via resolveBatch. So this stays a generous backstop against
    // gross structural failures (a mis-detected section, wholesale bad
    // parsing), not a precise validator — the real correctness check is the
    // per-batch reconciliation above, which only accepts a batch when every
    // row in it resolves exactly.
    const drift = Math.abs(runningBalance - section.closingBalance);
    if (drift > 1000) {
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

  keepLastBalancePerDate(rows);
  return { ok: true, rows };
}

export function parseAccessStatement(text) {
  const result = parseAccessStatementDebug(text);
  return result.ok ? result.rows : null;
}
