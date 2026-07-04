"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSelfTransfer, extractAccountHolderName } from "@/lib/selfTransfer";
import { formatDateLong } from "@/lib/format";

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return "";
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, a, b, c] = dmy;
    const year = c.length === 2 ? `20${c}` : c;
    const aNum = parseInt(a, 10), bNum = parseInt(b, 10);
    if (aNum > 12) return `${year}-${String(bNum).padStart(2,"0")}-${String(aNum).padStart(2,"0")}`;
    return `${year}-${String(aNum).padStart(2,"0")}-${String(bNum).padStart(2,"0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return s;
}

function parseAmt(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : Math.abs(n);
}

function detectSep(line) {
  const t = (line.match(/\t/g) || []).length;
  const p = (line.match(/\|/g) || []).length;
  const c = (line.match(/,/g)  || []).length;
  if (t >= c && t >= p) return "\t";
  if (p >= c && p >= t) return "|";
  return ",";
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

// ── Beneficiary extraction ────────────────────────────────────────────────────

function cleanName(raw) {
  return (raw || "")
    .trim()
    // Remove trailing bank codes: /GTB, /ACCESS BANK, etc.
    .replace(/\s*\/\s*[A-Z]{2,15}(?:\s+BANK)?(?:\/.*)?$/i, "")
    // Remove trailing account numbers after slash (8+ digits)
    .replace(/\s*\/\s*\d{8,}.*$/, "")
    // Remove trailing long digit strings with preceding space
    .replace(/\s+\d{10,}.*$/, "")
    // Remove ref suffixes
    .replace(/\s*[-–]\s*(?:REF|TRAN|TXN)\w*$/i, "")
    .trim();
}

function cleanBank(raw) {
  return (raw || "")
    .trim()
    .replace(/\s*\d+[\*]+\d+.*$/, "")  // masked account: 906****707
    .replace(/\s*\d{6,}.*$/, "")        // raw account number: 9030699800
    .trim();
}

function extractBeneficiary(desc) {
  const d = (desc || "").trim();
  let m;

  // TRF//FRM NAME TO NAME2 (double-slash transfer log format) — the party
  // of interest is whoever is named after FRM, before TO.
  m = d.match(/^TRF\/+\s*FRM\s+(.+?)\s+TO\s+/i);
  if (m) return cleanName(m[1]);

  // MOBILE TRF TO PAY/ /NAME
  m = d.match(/^MOBILE\s+TRF\s+TO\s+PAY\/+\s*(.+)/i);
  if (m) return cleanName(m[1]);

  // NIP/YYYYMMDD/NAME/BANK
  m = d.match(/^NIP\/\d+\/([^\/]+)/i);
  if (m) return cleanName(m[1]);

  // NIP/NAME (no date segment)
  m = d.match(/^NIP\s*\/\s*([A-Za-z][^\/]+?)(?:\/|$)/i);
  if (m) return cleanName(m[1]);

  // TRF/NAME, TRF-NAME, TRF NAME
  m = d.match(/^TRF[\s\/\-]+(.+)/i);
  if (m) return cleanName(m[1]);

  // BT/NAME
  m = d.match(/^BT\/(.+)/i);
  if (m) return cleanName(m[1]);

  // TRANSFER CREDIT - NAME, TRANSFER DEBIT - NAME
  m = d.match(/^TRANSFER\s+(?:CREDIT|DEBIT)\s*[-–]\s*(.+)/i);
  if (m) return cleanName(m[1]);

  // TRANSFER TO/FROM NAME | BANK | account | ... (OPay, PalmPay, etc.)
  // Extracts "NAME | BANK" — strips account numbers and trailing duplicates
  m = d.match(/^(?:FUNDS?\s+)?TRANSFER\s+(?:TO|FROM)\s+(.+)/i);
  if (m) {
    const parts = m[1].split("|").map((s) => s.trim());
    const name = cleanName(parts[0]);
    const bank = parts[1] ? cleanBank(parts[1]) : null;
    return bank && bank.length > 1 ? `${name} | ${bank}` : name;
  }

  // PAYMENT TO/FROM NAME | BANK | ...
  m = d.match(/^PAYMENT\s+(?:TO|FROM)\s+(.+)/i);
  if (m) {
    const parts = m[1].split("|").map((s) => s.trim());
    const name = cleanName(parts[0]);
    const bank = parts[1] ? cleanBank(parts[1]) : null;
    return bank && bank.length > 1 ? `${name} | ${bank}` : name;
  }

  // CREDIT FROM NAME | BANK | ..., DEBIT TO NAME | BANK | ...
  m = d.match(/^(?:CREDIT|DEBIT)\s+(?:FROM|TO)\s+(.+)/i);
  if (m) {
    const parts = m[1].split("|").map((s) => s.trim());
    const name = cleanName(parts[0]);
    const bank = parts[1] ? cleanBank(parts[1]) : null;
    return bank && bank.length > 1 ? `${name} | ${bank}` : name;
  }

  // Airtime | account_number | CARRIER (OPay format)
  m = d.match(/^Airtime\s*\|\s*[\d*]+\s*\|\s*(.+)/i);
  if (m) return m[1].trim();

  // INTRA BANK TRANSFER/NAME or INTRA-BANK TRANSFER/NAME
  m = d.match(/^INTRA[\s\-]?(?:BANK\s+)?TRANSFER[\s\/]+(.+?)(?:\/\d+)?$/i);
  if (m) return cleanName(m[1]);

  // RTGS/NAME
  m = d.match(/^RTGS\s*\/\s*(.+)/i);
  if (m) return cleanName(m[1]);

  // FASTTELLER NAME or FASTTELLER/NAME
  m = d.match(/^FASTTELLER[\s\/]+(.+)/i);
  if (m) return cleanName(m[1]);

  // Bare person name (2–4 all-alpha words, no digits, no known merchant)
  if (looksLikePersonName(d)) return d.trim();

  return "";
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = detectSep(lines[0]);
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));

  const dateIdx   = findCol(headers, ["transaction date","trans date","posting date","date","value date"]);
  const descIdx   = findCol(headers, ["narration","description","transaction details","details","remarks","ref"]);
  const debitIdx  = findCol(headers, ["debit","dr","withdrawal","debit amount"]);
  const creditIdx = findCol(headers, ["credit","cr","deposit","credit amount"]);
  const amtIdx    = debitIdx === -1 && creditIdx === -1
    ? findCol(headers, ["amount","transaction amount"])
    : -1;

  if (dateIdx === -1 || descIdx === -1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const date = parseDate(cells[dateIdx] || "");
    if (!date) continue;
    const desc = (cells[descIdx] || "").trim();
    if (!desc) continue;

    let amount = null, flow = "out";
    if (debitIdx !== -1 || creditIdx !== -1) {
      const d  = debitIdx  !== -1 ? parseAmt(cells[debitIdx])  : null;
      const cr = creditIdx !== -1 ? parseAmt(cells[creditIdx]) : null;
      if (d && d > 0)        { amount = d;  flow = "out"; }
      else if (cr && cr > 0) { amount = cr; flow = "in";  }
      else continue;
    } else if (amtIdx !== -1) {
      const raw    = cells[amtIdx] || "";
      const signed = parseFloat(raw.replace(/,/g,"").replace(/[^\d.\-]/g,""));
      if (isNaN(signed)) continue;
      amount = Math.abs(signed);
      flow   = signed < 0 ? "out" : "in";
    } else continue;

    rows.push({ date, desc, amount, flow, beneficiary: extractBeneficiary(desc) });
  }
  return rows;
}

// ── Unclear narration detection ───────────────────────────────────────────────

const UNCLEAR_RE = [
  /^NIP[\s\/\-]/i,
  /^USSD/i,
  /^POS\b/i,
  /^ATM\b/i,
  /^TRANSFER\s+(CREDIT|DEBIT)/i,       // removed $ — matches "TRANSFER CREDIT - JOHN DOE"
  /^(INFLOW|OUTFLOW)$/i,
  /^STANDING\s+ORDER/i,
  /^DIRECT\s+DEBIT/i,
  /^DEBIT\s+MANDATE/i,
  /^WEB\s+(PURCHASE|PAYMENT)/i,
  /^BILL\s*PAYMENT$/i,
  /^E[\-\s]?TRANZ/i,
  /^INTER\s*BANK/i,
  /^MOBILE\s*TRANSFER$/i,
  /^CASH\s*(WITHDRAWAL|DEPOSIT)$/i,
  // Person-transfer patterns common in Nigerian banks
  /^TRF[\s\/\-]/i,                     // TRF/JOHN DOE, TRF-EMEKA
  /^TRANSFER\s+(TO|FROM)\b/i,          // TRANSFER TO TAIWO OGUNFILE
  /^PAYMENT\s+(TO|FROM)\b/i,           // PAYMENT FROM JOHN
  /^(CREDIT|DEBIT)\s+(FROM|TO)\b/i,    // CREDIT FROM JANE DOE
  /^INTRA[\s\-]?(BANK\s+)?TRANSFER/i,
  /^FUNDS?\s+TRANSFER/i,
  /^FASTTELLER/i,
  /^BT\//i,
  /^RTGS\b/i,
];

// Bank charges/fees ONLY (COT, AMC, levy, commission, VAT, card fees, etc.)
// — these are pure bank mechanics with no ambiguous "purpose" to label, so
// the wizard skips them. Nothing else is excluded: ordinary transfers,
// person payments, etc. still go through the wizard as before.
// Not anchored to the start of the narration — real statements prefix these
// with a bank-specific tag (e.g. "FGN Stamp Duty for 1 txns...", "FBN Stamp
// Duty ..."), so an anchored ^ missed them entirely.
const BANK_CHARGE_RE = [
  /\bCOMMISSION\b/i,
  /\bVAT\b/i,
  /\bCOT\b/i,          // Commission on Turnover
  /\bAMC\b/i,          // Account Maintenance Charge
  /\bLEVY\b/i,
  /\bCHARGE\b/i,
  /SMS\s*ALERT\s*FEE/i,
  /STAMP\s*DUTY/i,
  /(CARD\s*)?MAINTENANCE\s*FEE/i,
  /CARD\s*(MAINTENANCE|ISSUANCE)\s*FEE/i,
  /(ANNUAL|MONTHLY)\s*(MAINTENANCE|MGT|MANAGEMENT)\s*(FEE|CHARGE)/i,
  /\bEMTL\b/i,
  /ELECTRONIC\s*MONEY\s*TRANSFER\s*LEVY/i,
  /USSD\s*CHARGE/i,
];

function isBankCharge(desc) {
  const d = (desc || "").trim();
  return BANK_CHARGE_RE.some((re) => re.test(d));
}

// Loan-related narrations get auto-labeled (never asked about in the
// wizard): repayments on money out, disbursals on money in.
const LOAN_RE = /\bloan\b|principal\s*(liquidation|disbursement|repayment)|facility\s*disbursement|loan\s*disbursement/i;
function isLoanRelated(desc) {
  return LOAN_RE.test(desc || "");
}

// Rows already auto-labeled internal transfers (see launchWizard) are
// recognized by their label prefix so they're excluded from the wizard the
// same way loan/bank-charge rows are.
const INTERNAL_TRANSFER_LABEL_RE = /^Internal transfer —/i;
function isInternalTransferLabeled(desc) {
  return INTERNAL_TRANSFER_LABEL_RE.test(desc || "");
}

// Narrations that already say exactly what they are — no ambiguity for a
// human to resolve, so these get auto-labeled and skip the wizard entirely,
// the same way loan rows do. Order matters: first match wins.
const AUTO_LABEL_RULES = [
  { pattern: /mobile\s*data|data\s*(bundle|plan)|\bdata\w*mtn\b|\bdata\w*(airtel|glo|9mobile)\b|\d\s*(mb|gb)\b.*\bplan\b/i, label: "Data subscription" },
  { pattern: /^airtime\b|\brecharge\b(?!.*data)/i,                                                                       label: "Airtime" },
  { pattern: /\bdstv\b|\bgotv\b|\bstartimes\b|\bnetflix\b|\bspotify\b|\bshowmax\b|\bprime\s*video\b|\bapple\s*music\b/i,  label: "Subscription" },
  { pattern: /\bikedc\b|\bekedc\b|\bkedco\b|\bphed\b|\bphcn\b|\bnepa\b|\belectricity\b|\bpower\s*bill\b|\butilit(y|ies)\b/i, label: "Utility bill" },
  { pattern: /\batm\s*(cash\s*)?withdrawal\b|\bcash\s*withdrawal\b/i,                                                    label: "ATM withdrawal" },
  { pattern: /\bjumia\b|\bkonga\b|\bshoprite\b|\bspar\b(?!kle)|\bamazon\b/i,                                             label: "Shopping" },
  { pattern: /\bbet9ja\b|\bsportybet\b|\bnairabet\b|\b1xbet\b|\bbetway\b|\bbetking\b|\bmerrybet\b|\bstake\.com\b/i,       label: "Betting" },
  { pattern: /^reversal\b|\btransaction\s*reversal\b|\bfailed\s*transaction\b.*revers/i,                                 label: "Reversal" },
  { pattern: /\btotal\s*filling\b|\bmobil\s*(filling|station)\b|\bnnpc\b|\boando\b|\bconoil\b|\bforte\s*oil\b|\bfilling\s*station\b|\bfuel\s*station\b/i, label: "Fuel" },
  { pattern: /\bkfc\b|\bdomino'?s\b|\bchicken\s*republic\b|\bcold\s*stone\b|\bmr\.?\s*bigg'?s\b|\btantalizers\b/i,        label: "Eat out" },
  { pattern: /\bmedplus\b|\bhealthplus\b|\bpharmacy\b|\bhospital\b|\bclinic\b|\bdiagnostics?\b/i,                        label: "Medical" },
  { pattern: /\baiico\b|\bleadway\b|\baxa\s*mansard\b|\bcornerstone\s*insurance\b|\bcustodian\s*insurance\b|\bninsure\b/i, label: "Insurance" },
  { pattern: /\blcc\s*toll\b|\btoll\s*gate\b|\blekki\s*concession\b/i,                                                   label: "Transport" },
  { pattern: /\bgym\b|\bfitness\s*(centre|center|club)\b|\bsalon\b|\bbarber(shop)?\b|\bspa\b/i,                          label: "Personal care" },
  { pattern: /\binterest\s*(earned|paid|credit)\b|\bcredit\s*interest\b/i,                                              label: "Interest/dividend" },
];
function autoLabelFor(desc) {
  const d = (desc || "").trim();
  const rule = AUTO_LABEL_RULES.find((r) => r.pattern.test(d));
  return rule ? rule.label : null;
}

// Words that suggest a clear merchant or category purpose — not a bare person name
const NOT_A_PERSON = /\b(school|fee|fees|rent|fuel|petrol|food|market|grocery|groceries|loan|repayment|salary|transport|hospital|clinic|medical|drug|pharmacy|savings|invest|pension|insurance|premium|electricity|nepa|phcn|water|gas|internet|wifi|cable|dstv|airtime|data|recharge|clothes|shopping|gym|salon|barber|spa|betting|bet|purchase|subscription|maintenance|repair|service|charge|tax|tithe|offering|donation|church|mosque|toll|fare|ticket|levy|bill|fine|refund|bonus|dividend|konga|jumia|shoprite|spar|amazon|netflix|spotify|paypal|uber|bolt|flutterwave|paystack|opay|palmpay|kuda|mtn|airtel|glo|mobile)\b/i;

// A bare 2–4-word all-alpha narration that looks like a person's name
function looksLikePersonName(desc) {
  const d = desc.trim();
  const words = d.split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 4 &&
    !NOT_A_PERSON.test(d) &&
    !/\d/.test(d) &&
    words.every((w) => /^[A-Za-z'.-]{2,}$/.test(w))
  );
}

function isUnclearPattern(desc) {
  const d = (desc || "").trim();
  if (d.length < 6) return true;
  return UNCLEAR_RE.some((re) => re.test(d)) || looksLikePersonName(d);
}

// Group rows by identical narration — show every group so each transaction
// gets reviewed in the wizard, except pure bank charges/fees (COT, AMC,
// levy, commission, VAT, card fees, etc.), which have no ambiguous purpose
// to label and go straight into the ledger untouched.
function buildLabelGroups(rows) {
  const map = new Map();
  rows.forEach((r, i) => {
    if (isBankCharge(r.desc) || isLoanRelated(r.desc) || isInternalTransferLabeled(r.desc) || autoLabelFor(r.desc)) return;
    // Group by beneficiary + flow when one was extracted, not the raw
    // narration — two transfers to/from the same person almost always carry
    // different masked account digits or reference numbers, so grouping on
    // the untouched desc text scatters what's really one relationship across
    // dozens of one-off batches. Falls back to the raw narration when no
    // beneficiary could be extracted (e.g. USSD/POS/ATM rows).
    const bene = (r.beneficiary || "").trim().toLowerCase();
    const key  = bene ? `${r.flow}|${bene}` : r.desc.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { desc: r.desc.trim(), indices: [] });
    map.get(key).indices.push(i);
  });
  return Array.from(map.values());
}

// ── Quick-pick chips ──────────────────────────────────────────────────────────

const CHIPS = [
  "Fuel", "Eat out", "Groceries", "Transport", "Airtime", "Data subscription",
  "Subscription", "Salary", "Business income", "Gift", "Refund",
  "Interest/dividend", "Rental income", "Cashback", "Loan repayment",
  "Loan disbursal", "School fees", "Rent", "Utility bill", "Crypto",
  "Savings deposit", "Shopping", "Personal care", "Medical", "Betting",
  "Insurance", "Donation", "ATM withdrawal", "Family/friend support",
  "Reversal", "Charges",
];

// A distinct chip, not a text label: picking it tags the batch as cash
// moving between the user's own accounts (see internalTransferFields()),
// bypassing description-based categorization entirely.
const SELF_TRANSFER_CHIP = "Self transfer";

// ── Labeling Wizard ───────────────────────────────────────────────────────────

function LabelingWizard({ rows, groups, totalRows, onApply, onSplitBatch, onFinish, onSkipAll, onCancel }) {
  const [step,  setStep]  = useState(0);
  const [label, setLabel] = useState("");
  // Remembers what was picked for each batch so ‹ Back can re-show it, and
  // so re-labeling a batch after going back replaces rather than stacks
  // onto the previous choice (onApply always rebuilds from group.desc, the
  // untouched original narration, never the already-labeled one).
  const [appliedLabels, setAppliedLabels] = useState({});
  // Highest step the user has actually acted on (labeled or skipped) — lets
  // ‹ Back / Next › move freely across already-visited batches without
  // touching what's already been applied to them.
  const [maxStep, setMaxStep] = useState(0);
  // Rows the user has unchecked because they don't belong with this label
  // (e.g. same beneficiary, different reason) — tracked by row index within
  // group.indices, reset every time the step changes.
  const [excluded, setExcluded] = useState(() => new Set());
  const inputRef = useRef(null);

  const group    = groups[step];
  const isLast   = step === groups.length - 1;
  const isFirst  = step === 0;
  const groupRows = group.indices.map((i) => rows[i]);
  const includedCount = groupRows.length - excluded.size;
  const progress  = (step / Math.max(groups.length, 1)) * 100;

  useEffect(() => {
    setLabel(appliedLabels[step] || "");
    setExcluded(new Set());
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleExcluded = (i) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const advance = (labelStr) => {
    if (includedCount === 0) return;
    const clean = labelStr && labelStr.trim() ? labelStr.trim() : null;
    const includedIndices = group.indices.filter((_, i) => !excluded.has(i));
    const excludedIndices = group.indices.filter((_, i) => excluded.has(i));
    setAppliedLabels((prev) => ({ ...prev, [step]: clean }));
    onApply(includedIndices, clean, group.desc);
    // Deselected rows aren't discarded — they get re-queued as their own
    // batch right after this one, so they still go through the wizard
    // instead of silently inheriting a label that doesn't apply to them.
    if (excludedIndices.length > 0) onSplitBatch(step, excludedIndices, group.desc);
    setMaxStep((m) => Math.max(m, step + 1));
    if (isLast && excludedIndices.length === 0) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => { if (!isFirst) setStep((s) => s - 1); };
  // Moves to a batch that's already been labeled/skipped without re-applying
  // anything — pure navigation, entered data is untouched.
  const goNext = () => { if (step < maxStep) setStep((s) => s + 1); };

  const totalAmt = groupRows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background:   "var(--ink-2)",
          border:       "1px solid var(--rule)",
          borderRadius: 20,
          width:        "100%",
          maxWidth:     500,
          maxHeight:    "92vh",
          overflow:     "auto",
          display:      "flex",
          flexDirection:"column",
        }}
      >
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--rule)" }}>
          {/* Progress line */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              onClick={onCancel}
              title="Cancel import — discard everything"
              className="hover:scale-125 active:scale-150 transition-transform duration-150"
              style={{
                color: "var(--red)", background: "rgba(184,57,43,0.12)",
                border: "1px solid var(--red)", borderRadius: "50%",
                width: 26, height: 26, fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                color: "var(--gold)", fontFamily: "var(--font-mono)",
                fontSize: 11, fontWeight: 700,
              }}>
                {step + 1} / {groups.length}
              </span>
              <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11 }}>
                batches to review
              </span>
            </div>
            <button
              onClick={onSkipAll}
              title="Close this wizard and import all transactions with their original narrations, no further labeling"
              style={{
                color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: "none", border: "1px solid var(--rule)",
                borderRadius: 8, padding: "5px 10px",
              }}
            >
              Import as-is
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: "var(--rule)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, var(--gold-deep), var(--gold))",
              borderRadius: 4, transition: "width 0.35s ease",
            }} />
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Headline */}
          <div>
            <p style={{
              color: "var(--ink-text)", fontFamily: "var(--font-serif)",
              fontSize: 18, fontWeight: 700, margin: "0 0 6px",
            }}>
              What {groupRows.length > 1 ? `were these ${groupRows.length} transactions` : "was this transaction"} for?
            </p>
            <p style={{
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 13, lineHeight: 1.6, margin: 0,
            }}>
              {groupRows.length > 1
                ? `These all share the same bank narration. The statement doesn't tell us the actual purpose, so adding a label helps Trakit7 categorize them correctly.`
                : "Adding a short label helps Trakit7 categorize this transaction correctly."}
            </p>
          </div>

          {/* Narration chip */}
          <div style={{
            background: "var(--ink-3)",
            border: "1px solid rgba(169,133,79,0.4)",
            borderRadius: 10,
            padding: "10px 14px",
          }}>
            <p style={{
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.1em", margin: "0 0 4px",
            }}>
              Bank narration
            </p>
            <p style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 13, margin: 0 }}>
              {group.desc}
            </p>
          </div>

          {/* Transaction list */}
          <div>
            <p style={{
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.1em", margin: "0 0 6px",
            }}>
              Transactions in this batch
            </p>
            <div style={{
              display: "flex", flexDirection: "column", gap: 3,
              maxHeight: 150, overflowY: "auto",
            }}>
              {groupRows.map((r, i) => {
                const isExcluded = excluded.has(i);
                return (
                  <div
                    key={i}
                    onClick={() => groupRows.length > 1 && toggleExcluded(i)}
                    title={groupRows.length > 1 ? (isExcluded ? "Excluded — will be handled as its own batch" : "Uncheck if this one isn't for the same reason") : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      justifyContent: "space-between",
                      background: "var(--ink-3)",
                      borderRadius: 7,
                      padding: "7px 12px",
                      opacity: isExcluded ? 0.45 : 1,
                      cursor: groupRows.length > 1 ? "pointer" : "default",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {groupRows.length > 1 && (
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleExcluded(i)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: "var(--gold)", cursor: "pointer" }}
                        />
                      )}
                      <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {formatDateLong(r.date)}
                      </span>
                    </span>
                    <span style={{
                      color: r.flow === "out" ? "var(--red)" : "var(--green)",
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13,
                      textDecoration: isExcluded ? "line-through" : "none",
                    }}>
                      {r.flow === "out" ? "−" : "+"}₦{Number(r.amount).toLocaleString("en-NG")}
                    </span>
                  </div>
                );
              })}
            </div>
            {groupRows.length > 1 && (
              <p style={{
                color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)",
                fontSize: 11, margin: "6px 0 0", textAlign: "right",
              }}>
                Total: ₦{totalAmt.toLocaleString("en-NG")}
                {excluded.size > 0 && ` (${includedCount} selected)`}
              </p>
            )}
          </div>

          {/* Quick picks */}
          <div>
            <p style={{
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.1em", margin: "0 0 8px",
            }}>
              Quick picks
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => advance(chip)}
                  style={{
                    background: label === chip ? "rgba(169,133,79,0.2)" : "var(--ink-3)",
                    border: `1px solid ${label === chip ? "var(--gold)" : "var(--rule)"}`,
                    color:  label === chip ? "var(--gold)" : "var(--ink-text-dim)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {chip}
                </button>
              ))}
              <button
                key={SELF_TRANSFER_CHIP}
                onClick={() => advance(SELF_TRANSFER_CHIP)}
                title="Cash movement between your own accounts"
                style={{
                  background: "rgba(91,143,168,0.15)",
                  border: "1px solid var(--blue-accent)",
                  color:  "var(--blue-accent)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ↔ Self transfer
              </button>
            </div>
            <p style={{
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 11, lineHeight: 1.5, margin: "8px 0 0", opacity: 0.8,
            }}>
              These quick picks help Trakit7 categorize your transactions properly. If none of them fit, describe it in the box below instead.
            </p>
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) advance(label); }}
            placeholder="e.g. Petrol at filling station, suya from Mallam, transfer to my brother — the more specific, the smarter the categorisation"
            style={{
              background:   "var(--ink-3)",
              border:       "1px solid var(--rule)",
              borderRadius: 10,
              color:        "var(--ink-text)",
              fontFamily:   "var(--font-sans)",
              fontSize:     14,
              padding:      "12px 16px",
              outline:      "none",
              width:        "100%",
            }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={goBack}
              disabled={isFirst}
              title={isFirst ? "This is the first batch" : "Go back to the previous batch — doesn't change anything you've already entered"}
              style={{
                background:   "var(--ink-3)",
                border:       "1px solid var(--rule)",
                color:        "var(--ink-text-dim)",
                borderRadius: 10,
                padding:      "13px 16px",
                fontFamily:   "var(--font-sans)",
                fontSize:     13,
                cursor:       isFirst ? "not-allowed" : "pointer",
                opacity:      isFirst ? 0.4 : 1,
                whiteSpace:   "nowrap",
              }}
            >
              ‹ Back
            </button>
            <button
              onClick={goNext}
              disabled={step >= maxStep}
              title={step >= maxStep ? "You haven't gone past this batch yet" : "Go forward to a batch you've already handled — doesn't change anything you've already entered"}
              style={{
                background:   "var(--ink-3)",
                border:       "1px solid var(--rule)",
                color:        "var(--ink-text-dim)",
                borderRadius: 10,
                padding:      "13px 16px",
                fontFamily:   "var(--font-sans)",
                fontSize:     13,
                cursor:       step >= maxStep ? "not-allowed" : "pointer",
                opacity:      step >= maxStep ? 0.4 : 1,
                whiteSpace:   "nowrap",
              }}
            >
              Next ›
            </button>
            <button
              onClick={() => advance(label)}
              disabled={!label.trim() || includedCount === 0}
              style={{
                flex:         1,
                background:   (label.trim() && includedCount > 0) ? "linear-gradient(135deg, var(--gold-deep), var(--gold))" : "var(--ink-3)",
                border:       "none",
                color:        (label.trim() && includedCount > 0) ? "#fff" : "var(--ink-text-dim)",
                borderRadius: 10,
                padding:      "13px",
                fontFamily:   "var(--font-sans)",
                fontWeight:   700,
                fontSize:     14,
                cursor:       (label.trim() && includedCount > 0) ? "pointer" : "not-allowed",
              }}
            >
              Label {includedCount} transaction{includedCount !== 1 ? "s" : ""}{(isLast && excluded.size === 0) ? " & finish" : " →"}
            </button>
            <button
              onClick={() => advance(null)}
              style={{
                background:   "var(--ink-3)",
                border:       "1px solid var(--rule)",
                color:        "var(--ink-text-dim)",
                borderRadius: 10,
                padding:      "13px 18px",
                fontFamily:   "var(--font-sans)",
                fontSize:     13,
                cursor:       "pointer",
                whiteSpace:   "nowrap",
              }}
            >
              Skip {isLast ? "& finish" : "→"}
            </button>
          </div>

          {/* Total context */}
          <p style={{
            color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
            fontSize: 11, margin: 0, textAlign: "center",
          }}>
            {totalRows} transactions ready to import · {groups.length - step - 1} batch{groups.length - step - 1 !== 1 ? "es" : ""} remaining after this
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAX_BYTES = 4 * 1024 * 1024;

const inputBase = {
  background:   "var(--paper-2)",
  border:       "1px solid var(--rule-paper)",
  color:        "var(--paper-text)",
  borderRadius: 4,
  padding:      "2px 6px",
  fontSize:     12,
  outline:      "none",
  width:        "100%",
};

// ── Import summary modal ─────────────────────────────────────────────────────

function monthLabelLong(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function ImportSummaryModal({ summary, firstName, onJumpToMonth, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background:   "var(--ink-2)",
          border:       "1px solid rgba(169,133,79,0.4)",
          borderRadius: 20,
          width:        "100%",
          maxWidth:     480,
          maxHeight:    "92vh",
          overflow:     "auto",
          padding:      "26px 26px 22px",
          display:      "flex",
          flexDirection:"column",
          gap:          16,
        }}
      >
        <div>
          <p style={{
            color: "var(--gold)", fontFamily: "var(--font-serif)",
            fontSize: 21, fontWeight: 700, margin: "0 0 6px",
          }}>
            Nice one{firstName ? `, ${firstName}` : ""} 🎉
          </p>
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {summary.inserted} transaction{summary.inserted !== 1 ? "s" : ""} logged
            {summary.learnedCount > 0 ? ` · ${summary.learnedCount} recognized instantly from memory` : ""}
            {summary.categorized > 0 ? ` · ${summary.categorized} categorized by Trakit AI` : ""}.
            {summary.catError ? ` A few entries kept their keyword category because ${summary.catError.toLowerCase()} — worth a manual check.` : ""}
          </p>
        </div>

        <div style={{
          background: "var(--ink-3)", border: "1px solid var(--rule)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <p style={{
            color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", margin: "0 0 10px",
          }}>
            Where it landed
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summary.months.map(({ ym, count, total }) => (
              <div
                key={ym}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--ink-2)",
                }}
              >
                <div>
                  <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {monthLabelLong(ym)}
                  </p>
                  <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11, margin: "2px 0 0" }}>
                    {count} entr{count !== 1 ? "ies" : "y"} · ₦{total.toLocaleString("en-NG")}
                  </p>
                </div>
                <button
                  onClick={() => onJumpToMonth(ym)}
                  style={{
                    flexShrink: 0, background: "rgba(169,133,79,0.15)", border: "1px solid var(--gold)",
                    color: "var(--gold)", borderRadius: 8, padding: "6px 12px",
                    fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          {summary.months.length > 1
            ? "These transactions span more than one month — the ledger below only shows one month at a time, so use ‹ › above it (or the buttons above) to jump between them."
            : "Use ‹ › above the ledger to move between months any time."}
        </p>

        <button
          onClick={onClose}
          style={{
            background:   "linear-gradient(135deg, var(--gold-deep), var(--gold))",
            border:       "none",
            color:        "#fff",
            borderRadius: 10,
            padding:      "12px",
            fontFamily:   "var(--font-sans)",
            fontWeight:   700,
            fontSize:     14,
            cursor:       "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function CsvImport({ onImported, onJumpToMonth }) {
  const [rows,         setRows]         = useState([]);
  const [wizardGroups, setWizardGroups] = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [status,       setStatus]       = useState(null);
  const [extracting,   setExtracting]   = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [extractProgress, setExtractProgress] = useState(null); // null | { done, total }
  const [accountHolderName, setAccountHolderName] = useState(null);
  const [catProgress,  setCatProgress]  = useState(null); // null | { done, total }
  const [passwordFile, setPasswordFile] = useState(null); // file awaiting a password retry
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [sortKey, setSortKey] = useState(null); // null = default order (date, then in-before-out)
  const [sortDir, setSortDir] = useState("asc");
  const [importSummary, setImportSummary] = useState(null); // null | { inserted, learnedCount, categorized, catError, months }
  const fileRef = useRef(null);
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);

  // Drives a statement-import job to completion, stepping through it one
  // chunk at a time so extraction never exceeds free-tier AI rate limits
  // within a single request. Backs off exactly as long as the server asks
  // on a rate-limit hit instead of hammering the API.
  const pollJob = useCallback(async (jobId, totalChunks) => {
    setExtractProgress({ done: 0, total: totalChunks });
    while (!cancelledRef.current) {
      const res  = await fetch("/api/migrate/statement/step", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        setStatus({ type: "error", msg: data.error || "Extraction failed." });
        return null;
      }
      setExtractProgress({ done: data.chunkIndex, total: data.totalChunks });
      if (data.status === "done") return data.rows;
      await new Promise((r) => setTimeout(r, data.waitMs > 0 ? data.waitMs : 300));
    }
    return null;
  }, []);

  const launchWizard = useCallback(async (extractedRows, statementHolderName) => {
    // Prefer the name printed on the statement itself (it's what will
    // actually match beneficiaries in *this* statement); fall back to the
    // Settings profile name if the statement didn't have a recognizable
    // "Account Name:" line (e.g. some CSV exports, or images).
    let fullName = statementHolderName || null;
    if (!fullName) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        fullName = user?.user_metadata?.full_name || null;
      } catch { /* proceed without self-transfer detection */ }
    }
    setAccountHolderName(fullName);

    const rowsWithBene = extractedRows.map((r) => {
      const beneficiary = r.beneficiary || extractBeneficiary(r.desc) || "";
      if (fullName && isSelfTransfer(beneficiary, fullName)) {
        return { ...r, beneficiary, desc: `Internal transfer — ${r.desc}` };
      }
      if (isLoanRelated(r.desc)) {
        const label = r.flow === "in" ? "Loan disbursal" : "Loan repayment";
        return { ...r, beneficiary, desc: `${label} — ${r.desc}` };
      }
      const auto = autoLabelFor(r.desc);
      if (auto) return { ...r, beneficiary, desc: `${auto} — ${r.desc}` };
      return { ...r, beneficiary };
    });
    setRows(rowsWithBene);
    const groups = buildLabelGroups(rowsWithBene);
    if (groups.length > 0) {
      setWizardGroups(groups);
    }
  }, []);

  const processFile = useCallback(async (file, password) => {
    setStatus(null);
    setRows([]);
    setWizardGroups(null);

    if (file.size > MAX_BYTES) {
      setStatus({ type: "error", msg: "File too large (max 4 MB). For PDFs, try exporting a shorter date range from your bank." });
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv" || ext === "txt") {
      const text   = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setStatus({ type: "error", msg: "Could not detect columns. Make sure the file has Date, Narration, and Debit/Credit columns." });
        return;
      }
      launchWizard(parsed, extractAccountHolderName(text));
    } else if (ext === "pdf" || ["jpg","jpeg","png","webp"].includes(ext)) {
      setExtracting(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (password) fd.append("password", password);
        const startRes  = await fetch("/api/migrate/statement/start", { method: "POST", body: fd });
        const startData = await startRes.json();
        if (!startRes.ok) {
          if (startData.passwordRequired) {
            setPasswordFile(file);
            setPasswordError(password ? startData.error : null);
            return;
          }
          const msg = startData.debug ? `${startData.error}: ${JSON.stringify(startData.debug)}` : (startData.error || "Extraction failed.");
          setStatus({ type: "error", msg });
          return;
        }
        setPasswordFile(null);
        setPasswordError(null);

        let rows = null;
        if (startData.status === "done") {
          rows = startData.rows;
        } else {
          rows = await pollJob(startData.jobId, startData.totalChunks);
        }

        if (rows === null) {
          // Error already surfaced by pollJob, or start.
        } else if (!rows.length) {
          setStatus({ type: "error", msg: "No transactions found. Try a clearer image or a different page." });
        } else {
          launchWizard(rows, startData.accountHolderName);
        }
      } catch {
        setStatus({ type: "error", msg: "Network error during extraction. Please try again." });
      } finally {
        setExtracting(false);
        setExtractProgress(null);
      }
    } else {
      setStatus({ type: "error", msg: "Unsupported format. Drop a CSV, PDF, JPG, or PNG." });
    }
  }, [launchWizard, pollJob]);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); };
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; };

  const submitPassword = () => {
    if (!passwordFile || !passwordInput.trim()) return;
    processFile(passwordFile, passwordInput.trim());
  };
  const cancelPassword = () => {
    setPasswordFile(null);
    setPasswordInput("");
    setPasswordError(null);
  };

  // Default order is chronological, with "in" rows sitting below "out" rows
  // on the same date. Clicking a column header overrides this with an
  // ascending/toggling sort on that column instead; each row keeps its
  // original index (_idx) so edits/deletes still target the right entry
  // after reordering.
  const sortedRows = useMemo(() => {
    const withIdx = rows.map((r, i) => ({ ...r, _idx: i }));
    if (!sortKey) {
      withIdx.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.flow !== b.flow) return a.flow === "in" ? -1 : 1;
        return 0;
      });
      return withIdx;
    }
    const dir = sortDir === "asc" ? 1 : -1;
    withIdx.sort((a, b) => {
      if (sortKey === "amount") return (Number(a.amount) - Number(b.amount)) * dir;
      const av = String(a[sortKey] || "").toLowerCase();
      const bv = String(b[sortKey] || "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return withIdx;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const updateRow = (i, field, val) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const deleteRow = (i) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  // Called by wizard for each batch. `origDesc` is the untouched narration
  // captured when the wizard opened (group.desc) — always rebuild the label
  // prefix from that, never from the row's current (possibly already
  // labeled) desc, so going ‹ Back and picking a different label replaces
  // it instead of stacking prefixes.
  const handleWizardApply = (indices, label, origDesc) => {
    if (!label) {
      setRows((prev) =>
        prev.map((r, i) => (indices.includes(i) ? { ...r, desc: origDesc, forceInternalTransfer: false } : r))
      );
      return;
    }
    if (label === SELF_TRANSFER_CHIP) {
      setRows((prev) =>
        prev.map((r, i) =>
          indices.includes(i)
            ? { ...r, desc: `Internal transfer — ${origDesc}`, forceInternalTransfer: true }
            : r
        )
      );
      return;
    }
    setRows((prev) =>
      prev.map((r, i) =>
        indices.includes(i) ? { ...r, desc: `${label} — ${origDesc}`, forceInternalTransfer: false } : r
      )
    );
  };

  // Re-queues rows the user unchecked in a batch as their own new batch,
  // inserted right after the one being labeled, so they still get reviewed
  // individually instead of inheriting a label that doesn't apply to them.
  const handleWizardSplitBatch = (afterStep, indices, origDesc) => {
    setWizardGroups((prev) => {
      const next = [...prev];
      next.splice(afterStep + 1, 0, { desc: origDesc, indices });
      return next;
    });
  };

  const handleWizardFinish  = () => setWizardGroups(null);
  const handleWizardSkipAll = () => setWizardGroups(null);
  const handleWizardCancel  = () => { setWizardGroups(null); setRows([]); };

  const doImport = async () => {
    const valid = rows.filter((r) => r.date && r.desc && Number(r.amount) > 0);
    if (!valid.length) return;
    setImporting(true);
    setStatus(null);
    try {
      // Step 1: Insert all entries. Self-transfers are resolved server-side
      // right here (beneficiary vs. the statement's own account-holder
      // name); everything else gets a learned-rule match if one exists, or
      // the keyword fallback otherwise.
      const res  = await fetch("/api/entries/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: valid, accountHolderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Import failed." });
        return;
      }

      // Step 2: AI-categorize whatever the keyword fallback couldn't
      // confidently place (status 'fallback') — learned-rule/self-transfer
      // matches are already 'done' and skipped. Sent in small chunks so a
      // single request never has to carry a large-enough prompt to risk the
      // serverless function's execution window; every successful AI result
      // is saved as a merchant rule, so the *same* recurring beneficiary/
      // narration needs AI only once, ever, going forward.
      const learnedCount = (data.rows || []).filter((r) => r.flow === "out" && r.status === "done").length;
      const outEntries   = (data.rows || []).filter((r) => r.flow === "out" && r.status !== "done");
      let categorized = 0;
      let catError = null;
      // Fewer, bigger chunks beats more, smaller ones: each chunk costs one
      // fixed round-trip (network + AI latency) regardless of size, so chunk
      // count — not entry count — dominates total wall time.
      const CHUNK_SIZE = 25;

      if (outEntries.length > 0) {
        setImporting(false);
        setCatProgress({ done: 0, total: outEntries.length });
        const supabase = createClient();

        for (let start = 0; start < outEntries.length; start += CHUNK_SIZE) {
          const chunk = outEntries.slice(start, start + CHUNK_SIZE);
          try {
            const batchRes = await fetch("/api/ai/categorize-batch", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                entries: chunk.map((e) => ({ description: e.desc, amount: e.amount, beneficiary: e.beneficiary })),
              }),
            });

            if (batchRes.ok) {
              const { results } = await batchRes.json();
              await Promise.all(
                chunk.map(async (e, i) => {
                  const ai = results?.[i];
                  if (!ai) return;
                  try {
                    await supabase.from("entries").update(ai).eq("id", e.id);
                    categorized++;
                  } catch { /* skip */ }
                })
              );
            } else {
              const errBody = await batchRes.json().catch(() => null);
              catError = errBody?.error || `AI categorization failed (HTTP ${batchRes.status}).`;
            }
          } catch (err) {
            catError = err?.message || "AI categorization request failed (network error or timeout).";
          }

          setCatProgress({ done: Math.min(start + CHUNK_SIZE, outEntries.length), total: outEntries.length });
        }
      }

      // Group by month so the confirmation can point the user straight at
      // where each transaction landed — critical when importing a
      // backdated statement while the ledger is sitting on the current
      // (possibly still-empty) month.
      const monthMap = new Map();
      for (const r of valid) {
        const ym = r.date.slice(0, 7);
        const bucket = monthMap.get(ym) || { ym, count: 0, total: 0 };
        bucket.count += 1;
        bucket.total += Number(r.amount);
        monthMap.set(ym, bucket);
      }
      const months = [...monthMap.values()].sort((a, b) => (a.ym < b.ym ? -1 : 1));

      setStatus(null);
      setImportSummary({ inserted: data.inserted, learnedCount, categorized, catError, months });
      setRows([]);
      if (onImported) onImported();
    } catch {
      setStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setImporting(false);
      setCatProgress(null);
    }
  };

  return (
    <div style={{ background: "var(--ink-2)" }}>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-3">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            style={{
              border:     `2px dashed ${dragging ? "var(--gold)" : "var(--rule)"}`,
              background: dragging ? "rgba(169,133,79,0.08)" : "var(--ink-3)",
              padding:    "1.5rem 1rem",
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{extracting ? "⏳" : "📄"}</span>
            {extracting ? (
              <>
                <span className="text-sm font-medium" style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}>
                  Trakit7 is extracting transactions...
                </span>
                {extractProgress && extractProgress.total > 1 && (
                  <div style={{ width: "min(280px, 80%)", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--ink)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, background: "var(--gold)",
                        width: `${Math.min(100, (extractProgress.done / extractProgress.total) * 100)}%`,
                        transition: "width 300ms ease",
                      }} />
                    </div>
                    <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                      {extractProgress.done} of {extractProgress.total} sections processed
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  Drop your bank statement here, or{" "}
                  <span style={{ color: "var(--gold)" }}>click to select</span>
                </span>
                <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.7 }}>
                  CSV · PDF · JPG · PNG — GTBank, Access, Zenith, UBA, OPay (max 4 MB)
                </span>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,.txt,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onPick} />
          </div>

          {/* Password prompt — shown when a PDF turns out to be encrypted */}
          {passwordFile && (
            <div
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                🔒 {passwordFile.name} is password-protected
              </p>
              {passwordError && (
                <p className="text-xs" style={{ color: "var(--red)", fontFamily: "var(--font-sans)" }}>
                  {passwordError}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && passwordInput.trim()) submitPassword(); }}
                  placeholder="PDF password"
                  style={{ ...inputBase, background: "var(--ink-2)", color: "var(--ink-text)", flex: 1 }}
                />
                <button
                  onClick={submitPassword}
                  disabled={!passwordInput.trim() || extracting}
                  className="rounded-lg px-3 py-1 text-sm font-semibold"
                  style={{
                    background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)",
                    opacity: (!passwordInput.trim() || extracting) ? 0.6 : 1,
                    cursor: (!passwordInput.trim() || extracting) ? "not-allowed" : "pointer",
                  }}
                >
                  {extracting ? "Unlocking…" : "Unlock"}
                </button>
                <button
                  onClick={cancelPassword}
                  className="rounded-lg px-3 py-1 text-sm"
                  style={{ background: "var(--ink-2)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", border: "1px solid var(--rule)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <p className="text-sm" style={{ color: status.type === "error" ? "var(--red)" : "var(--green)", fontFamily: "var(--font-sans)" }}>
              {status.msg}
            </p>
          )}

          {/* Preview table — visible after wizard closes */}
          {rows.length > 0 && !wizardGroups && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  {rows.length} transactions ready · Edit or remove rows before importing
                </p>
                <button
                  onClick={() => setRows([])}
                  className="text-xs"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  Clear all
                </button>
              </div>

              <div
                className="rounded-lg overflow-auto"
                style={{ background: "var(--paper)", maxHeight: 360, border: "1px solid var(--rule-paper)" }}
              >
                <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: "var(--paper-2)", position: "sticky", top: 0, zIndex: 1 }}>
                      {[
                        { label: "Date", key: "date" },
                        { label: "Description", key: "desc" },
                        { label: "Beneficiary", key: "beneficiary" },
                        { label: "Amount (₦)", key: "amount" },
                        { label: "Flow", key: "flow" },
                        { label: "", key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label || "actions"}
                          onClick={() => handleSort(key)}
                          className="text-left px-2 py-2"
                          style={{
                            color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)",
                            borderBottom: "1px solid var(--rule-paper)", fontWeight: 600,
                            cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                          }}
                          title={key ? "Click to sort" : undefined}
                        >
                          {label}{key && sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, pos) => { const i = row._idx; return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--rule-paper)", background: pos % 2 === 0 ? "var(--paper)" : "var(--paper-2)" }}>
                        <td className="px-2 py-1" style={{ minWidth: 110 }}>
                          <input
                            type="date"
                            defaultValue={row.date}
                            onBlur={(e) => updateRow(i, "date", e.target.value)}
                            style={{ ...inputBase, fontFamily: "var(--font-mono)", width: 110 }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 180 }}>
                          <input
                            type="text"
                            defaultValue={row.desc}
                            onBlur={(e) => updateRow(i, "desc", e.target.value)}
                            style={{ ...inputBase, fontFamily: "var(--font-sans)" }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 120 }}>
                          <input
                            type="text"
                            defaultValue={row.beneficiary || ""}
                            onBlur={(e) => updateRow(i, "beneficiary", e.target.value.trim() || null)}
                            placeholder="—"
                            style={{ ...inputBase, fontFamily: "var(--font-sans)", width: 110 }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 110 }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={row.amount}
                            onBlur={(e) => {
                              const v = parseFloat(String(e.target.value).replace(/,/g,""));
                              updateRow(i, "amount", isNaN(v) ? row.amount : v);
                            }}
                            style={{ ...inputBase, fontFamily: "var(--font-mono)", width: 100 }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 70 }}>
                          <select
                            value={row.flow}
                            onChange={(e) => updateRow(i, "flow", e.target.value)}
                            style={{
                              ...inputBase, width: "auto", paddingRight: 20,
                              color: row.flow === "in" ? "var(--green)" : "var(--red)",
                              fontWeight: 600,
                            }}
                          >
                            <option value="out">Out</option>
                            <option value="in">In</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => deleteRow(i)}
                            title="Remove row"
                            className="text-xs"
                            style={{ color: "var(--red)" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>

              <button
                onClick={doImport}
                disabled={importing || !!catProgress}
                className="rounded-lg px-4 py-2 text-sm font-semibold"
                style={{
                  background: "var(--gold)",
                  color:      "#fff",
                  fontFamily: "var(--font-sans)",
                  opacity:    (importing || catProgress) ? 0.7 : 1,
                  cursor:     (importing || catProgress) ? "not-allowed" : "pointer",
                  display:    "flex",
                  alignItems: "center",
                  gap:        8,
                }}
              >
                {catProgress ? (
                  <>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: 0.8, animation: "pulse 1s infinite" }} />
                    Categorizing {catProgress.done}/{catProgress.total}...
                  </>
                ) : importing ? (
                  "Importing…"
                ) : (
                  `Import ${rows.filter((r) => r.date && r.desc && Number(r.amount) > 0).length} rows`
                )}
              </button>
            </div>
          )}
        </div>

      {/* Batch labeling wizard — renders as full-viewport overlay */}
      {wizardGroups && (
        <LabelingWizard
          rows={rows}
          groups={wizardGroups}
          totalRows={rows.length}
          onApply={handleWizardApply}
          onSplitBatch={handleWizardSplitBatch}
          onFinish={handleWizardFinish}
          onSkipAll={handleWizardSkipAll}
          onCancel={handleWizardCancel}
        />
      )}

      {/* Post-import confirmation — renders as full-viewport overlay */}
      {importSummary && (
        <ImportSummaryModal
          summary={importSummary}
          firstName={accountHolderName ? accountHolderName.trim().split(/\s+/)[0] : null}
          onJumpToMonth={(ym) => {
            if (onJumpToMonth) {
              const [y, m] = ym.split("-").map(Number);
              onJumpToMonth(y, m);
            }
            setImportSummary(null);
          }}
          onClose={() => setImportSummary(null)}
        />
      )}
    </div>
  );
}
