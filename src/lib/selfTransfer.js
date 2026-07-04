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

function normalizeNameWords(name) {
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
const HOLDER_NAME_PATTERNS = [
  /account\s*name\s*[:\-]\s*([A-Za-z .'-]{4,60})/i,
  /customer\s*name\s*[:\-]\s*([A-Za-z .'-]{4,60})/i,
  /a\/?c\s*name\s*[:\-]\s*([A-Za-z .'-]{4,60})/i,
  /name\s*of\s*account\s*holder\s*[:\-]\s*([A-Za-z .'-]{4,60})/i,
  /account\s*holder\s*[:\-]\s*([A-Za-z .'-]{4,60})/i,
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

// True if `beneficiary` and `fullName` name the same person, regardless of
// word order. Requires at least 2 shared name words (so a single shared
// surname/first name doesn't false-positive against an unrelated person),
// and requires the smaller name to be fully contained in the larger one
// (so a bank's shortened name still matches the account holder's full name).
export function isSelfTransfer(beneficiary, fullName) {
  const benWords  = normalizeNameWords(beneficiary);
  const selfWords = normalizeNameWords(fullName);
  if (benWords.length < 2 || selfWords.length < 2) return false;
  const selfSet = new Set(selfWords);
  const shared  = benWords.filter((w) => selfSet.has(w)).length;
  return shared >= 2 && shared >= Math.min(benWords.length, selfWords.length);
}
