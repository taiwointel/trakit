// Detects transfers between the user's own accounts, so they can be tagged
// as "Self" instead of a real expense/income category. Bank
// narrations name the account holder in inconsistent word orders across
// banks (e.g. "OGUNFILE TAIWO OLAGOKE" vs "TAIWO OLAGOKE OGUNFILE"), so
// matching is done as an order-independent set of name words rather than an
// exact string comparison.

export const INTERNAL_TRANSFER_CATEGORY = "Self";

export function internalTransferFields() {
  return {
    category:     INTERNAL_TRANSFER_CATEGORY,
    subcategory:  "",
    essentiality: "—",
    nature:       "—",
    confidence:   1,
    note:         "Cash movement between own accounts",
  };
}

export function normalizeNameWords(name) {
  return (name || "")
    .split("|")[0] // strip any trailing " | BANK" segment
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// Pulls the account holder's name straight off the statement itself (the
// "Account Name:" / "Customer Name:" line banks print near the top), rather
// than relying on a name the user separately typed into Settings — this is
// the name that will actually match beneficiaries inside *this* statement.
// [:\-]? (optional, not required) — OPay's PDF extraction renders the label
// and value on separate lines with no colon at all ("Account Name\nTAIWO
// OLAGOKE OGUNFILE"), while other banks use "Account Name: TAIWO...". A
// required colon silently failed to match OPay statements, leaving
// accountHolderName null and self-transfer detection dependent on whatever
// name happens to be set in the user's profile instead of the statement.
const HOLDER_NAME_PATTERNS = [
  /account\s*name\s*[:\-]?\s*\n?\s*([A-Za-z .'-]{4,60})/i,
  /customer\s*name\s*[:\-]?\s*\n?\s*([A-Za-z .'-]{4,60})/i,
  /a\/?c\s*name\s*[:\-]?\s*\n?\s*([A-Za-z .'-]{4,60})/i,
  /name\s*of\s*account\s*holder\s*[:\-]?\s*\n?\s*([A-Za-z .'-]{4,60})/i,
  /account\s*holder\s*[:\-]?\s*\n?\s*([A-Za-z .'-]{4,60})/i,
  // PalmPay glues the bare label directly onto the value with zero
  // separator ("NameTAIWO OLAGOKE OGUNFILE"), immediately followed by the
  // next glued label ("Phone Number..."). Matching a run of ALL-CAPS words
  // right after "name" (rather than allowing mixed case) is what stops the
  // capture at the name and not the next label, since real names print in
  // caps on this statement but labels don't.
  /\b[Nn]ame\s*((?:[A-Z]{2,}\s*){2,5})(?=[A-Z][a-z]|$)/,
];

export function extractAccountHolderName(text) {
  if (!text) return null;
  for (const re of HOLDER_NAME_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const name = m[1].split("\n")[0].trim();
      if (normalizeNameWords(name).length >= 2) return name;
    }
  }
  return null;
}

// True if two names likely belong to the same person, regardless of word
// order. Requires at least 2 shared name words (so a single shared
// surname/first name doesn't false-positive against an unrelated person),
// and requires the smaller name to be fully contained in the larger one —
// this is what lets "KEHINDE OGUNFILE" match "KEHINDE OLAYINKA OGUNFILE",
// or "FERANMI OLUSESIN" match "FERANMI OLUSESIN ADEYEMI", since one bank's
// statement (or one transaction) may print a shorter form of a name that
// another prints in full.
export function namesLikelySamePerson(a, b) {
  const wordsA = normalizeNameWords(a);
  const wordsB = normalizeNameWords(b);
  if (wordsA.length < 2 || wordsB.length < 2) return false;
  const setB   = new Set(wordsB);
  const shared = wordsA.filter((w) => setB.has(w)).length;
  return shared >= 2 && shared >= Math.min(wordsA.length, wordsB.length);
}

// True if `beneficiary` and `fullName` name the same person — kept as a
// distinctly-named wrapper since call sites read better as "is this a
// self transfer" than "do these names match."
export function isSelfTransfer(beneficiary, fullName) {
  return namesLikelySamePerson(beneficiary, fullName);
}

// Bank fee/levy narrations (VAT on a transfer, EMTL, USSD charge, etc.) often
// embed the account holder's own name because they're printed right below —
// or fused onto — the narration of the real self-transfer that triggered
// them, e.g. "VAT MOBILE TRF TO PAY/ /TAIWO OLAGOKE OGUNFILE". That makes
// every one of the holder's name words appear in the text, but the row
// itself is a real (if tiny) expense, not money moving between the user's
// own accounts — it must never be swept into isSelfTransferInText below.
const FEE_LIKE = /\bvat\b|stamp duty|emtl|electronic money transfer levy|ussd charge|service charge|bank charge|sms alert|account maintenance|card maintenance|card issuance fee|card fee|annual fee|quarterly charge|\bcommission\b|\bcharges?\b|\bcot\b/i;

// Fallback for rows whose `beneficiary` field was never populated (a parser
// extraction gap, not a name mismatch) — checks whether all of the account
// holder's name words appear somewhere in the raw description text. Requires
// every word of fullName to be present (not just 2 shared), since desc text
// is unstructured and a weaker threshold would false-positive on unrelated
// narrations that happen to share a common word.
export function isSelfTransferInText(desc, fullName) {
  if (FEE_LIKE.test(desc || "")) return false;
  const selfWords = normalizeNameWords(fullName);
  if (selfWords.length < 2) return false;
  const descWords = new Set(normalizeNameWords(desc));
  return selfWords.every((w) => descWords.has(w));
}
