export const CATEGORIES = [
  { name: "Housing & Utilities",   essentiality: "Essential",     nature: "Fixed"    },
  { name: "Transportation",        essentiality: "Essential",     nature: "Variable" },
  { name: "Food & Groceries",      essentiality: "Essential",     nature: "Variable" },
  { name: "Dining & Lifestyle",    essentiality: "Discretionary", nature: "Variable" },
  { name: "Healthcare",            essentiality: "Essential",     nature: "Variable" },
  { name: "Family & Dependents",   essentiality: "Essential",     nature: "Variable" },
  { name: "Debt Service",          essentiality: "Essential",     nature: "Fixed"    },
  { name: "Savings & Investment",  essentiality: "Essential",     nature: "Fixed"    },
  { name: "Personal Care",         essentiality: "Discretionary", nature: "Variable" },
  { name: "Betting",               essentiality: "Discretionary", nature: "Variable" },
  { name: "Charges",               essentiality: "Discretionary", nature: "Variable" },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export const CATEGORY_COLORS = [
  "#A9854F", "#5B8FA8", "#7C8C5B", "#A8645B", "#8A6FA8",
  "#A89A5B", "#5BA88A", "#A85B86", "#6C7686", "#8C4F5B", "#B07A4E",
];

// Deliberately narrow — Charges exists only for genuine bank-generated
// fees/levies, never as a catch-all for "AI is unsure what this is." Used
// both for keyword fallback below and as a validation guard on live AI
// results in the /api/ai/categorize* routes: if a model ever returns
// "Charges" for a description that doesn't actually match this, that
// result is rejected in favor of keyword fallback instead of trusted
// blindly (confirmed happening in practice — regular transfers to named
// people were coming back tagged Charges from the model with no fee
// keyword anywhere in the narration).
export const BANK_CHARGE_PATTERN = /stamp duty|emtl|electronic money transfer levy|ussd charge|service charge|bank charge|\bvat\b|sms alert|account maintenance|card maintenance|card issuance fee|card fee|annual fee|quarterly charge|\bcommission\b|\bcharges?\b|reversal|\bcot\b/i;

export function looksLikeBankCharge(description) {
  return BANK_CHARGE_PATTERN.test((description || "").toLowerCase());
}

// Same failure mode as Charges above, but for telco/subscription
// sub-categories: a model can confidently label a plain "Transfer to
// [NAME]" as "Data subscription", "Airtime", etc. with no such word
// anywhere in the actual narration (confirmed happening on a first-ever
// import, so not a stale learned rule — a genuine live miscall). If the
// AI's own subcategory text claims one of these but the source
// description contains none of the real trigger words, the result is
// rejected in favor of keyword fallback instead of trusted blindly.
const SUBSCRIPTION_CLAIM_PATTERN  = /data|airtime|recharge|bundle|subscription|dstv|gotv|startimes|netflix|spotify|showmax|prime video|apple music/i;
const SUBSCRIPTION_KEYWORD_IN_DESC = /\bdata\b|airtime|recharge|\bbundle\b|\bmtn\b|\bairtel\b|\bglo\b|9mobile|dstv|gotv|startimes|netflix|spotify|showmax|prime video|apple music|subscription/i;

export function looksLikeFalseSubscription(subcategory, description) {
  if (!SUBSCRIPTION_CLAIM_PATTERN.test(subcategory || "")) return false;
  return !SUBSCRIPTION_KEYWORD_IN_DESC.test((description || "").toLowerCase());
}

// Every rule below was audited for one specific failure mode: a bare word
// with no \b boundaries matches as a *substring* of a completely unrelated
// word, not just as its own token. Confirmed real cases this caused before
// boundaries were added: "rice" inside "price", "bus" inside "business",
// "fare" inside "welfare", "spa" inside "dispatch", "bar" inside "barber"
// (and "bar" beat "barber" to a match anyway, since Dining & Lifestyle is
// checked before Personal Care), "bet" inside "alphabet" (no leading
// boundary), "invest" inside "investigation". Multi-word phrases (e.g.
// "cooking oil") don't need boundaries since a short common phrase is very
// unlikely to appear as an accidental substring of something else.
const FALLBACK_RULES = [
  { pattern: BANK_CHARGE_PATTERN, category: "Charges", subcategory: "Bank charges" },
  { pattern: /rent|mortgage|electric|nepa|phcn|water bill|generator|diesel|estate due|dstv|gotv|startimes|internet|wifi|\bdata\b|data subscription|airtime|recharge|netflix|showmax|spotify|apple music|amazon prime|youtube premium|disney\+|hbo|deezer|audiomack/i, category: "Housing & Utilities" },
  { pattern: /uber|\bbolt\b|fuel|petrol|\bfare\b|transport|keke|\bbus\b|flight|car service/i,                       category: "Transportation" },
  // Checked before Food & Groceries specifically to resolve the "market"
  // ambiguity: "stock market"/"money market" investment narrations would
  // otherwise be caught by Food & Groceries' bare "market" first.
  { pattern: /savings|invest(?!igat)|mutual fund|\bstocks\b|treasury|fixed deposit|target save/i,                  category: "Savings & Investment" },
  { pattern: /(?<!stock )(?<!money )market|\bgroceries?\b|foodstuff|supermarket|provisions|noodles|indomie|spaghetti|\beggs?\b|bread(?! ?fruit)|\brice\b|\bbeans\b|\byam\b|pasta|tomato|pepper|onion|garlic|\bfish\b|\bchicken\b|\bmeat\b|vegetables|groundnut|palm oil|stockfish|apple|orange\b|banana|mango|watermelon|pineapple|avocado|pear\b|cucumber|carrot|lettuce|cabbage|plantain|sweet potato|irish potato|potato\b|ginger|turmeric|seasoning|maggi|knorr|salt\b|sugar\b|flour\b|semovita|wheat\b|garri|cornmeal|oatmeal|cereal\b|milk\b|butter\b|cheese\b|yogurt|cream\b|cooking oil|vegetable oil|groundnut oil|bottled water|pure water|sachet water|eva water|table water|zobo|kunu|smoothie\b|fruit juice|orange juice|tomato paste|tin tomato|canned|sardine|tuna\b|corned beef|sausage|hotdog|akara|moimoi|ofe|egusi|bitterleaf|ogbono|uziza|ugu|waterleaf|peeled\b|frozen|condiment|spice|seasoning/i, category: "Food & Groceries" },
  { pattern: /restaurant|suya|lounge|\bbar\b|bukka|dining|eat[\s-]?out|takeout|delivery|cafe|coffee|soft drink|chapman|malt\b|smoothie|snack/i, category: "Dining & Lifestyle" },
  { pattern: /hospital|clinic|pharmacy|drug|medical|health insurance/i,                                            category: "Healthcare" },
  { pattern: /school fee|\bfees\b|family|dependant|dependent|relative|upkeep|girlfriend|boyfriend|\bwife\b|husband|mother|father|sister|brother|uncle|aunt|parents|spouse/i, category: "Family & Dependents" },
  { pattern: /loan|repayment|credit card payment|\bdebt\b|principal\s*(liquidation|disbursement)|facility\s*disbursement/i, category: "Debt Service" },
  { pattern: /salon|barber|\bspa\b|\bgym\b|clothes|shopping|skincare/i,                                            category: "Personal Care" },
  { pattern: /bet9ja|sportybet|nairabet|1xbet|betway|betking|merrybet|stake\.com|\bbet\b|wager|odds|parlay|accumulator|betting deposit/i, category: "Betting" },
];

export function fallbackCategorize(description) {
  const lower = description.toLowerCase();
  for (const rule of FALLBACK_RULES) {
    if (rule.pattern.test(lower)) {
      const cat = CATEGORIES.find((c) => c.name === rule.category);
      return {
        category:      cat.name,
        essentiality:  cat.essentiality,
        nature:        cat.nature,
        confidence:    0.5,
        subcategory:   rule.subcategory || "",
        note:          "Keyword match",
        status:        "fallback",
      };
    }
  }
  // Truly unrecognized: default to Dining & Lifestyle (Discretionary/Variable)
  // rather than Charges, which is specifically for bank fees
  const dining = CATEGORIES.find((c) => c.name === "Dining & Lifestyle");
  return {
    category:     dining.name,
    essentiality: dining.essentiality,
    nature:       dining.nature,
    confidence:   0.2,
    subcategory:  "",
    note:         "No keyword match",
    status:       "fallback",
  };
}

export function categoryDefaults(categoryName) {
  const cat = CATEGORIES.find((c) => c.name === categoryName);
  if (!cat) return { essentiality: "Discretionary", nature: "Variable" };
  return { essentiality: cat.essentiality, nature: cat.nature };
}
