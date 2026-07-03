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

const FALLBACK_RULES = [
  { pattern: /stamp duty|emtl|electronic money transfer levy|ussd charge|service charge|bank charge|vat charge|sms alert|account maintenance|card maintenance|annual fee|quarterly charge|commission on turnover|cot\b/i, category: "Charges", subcategory: "Bank charges" },
  { pattern: /rent|mortgage|electric|nepa|phcn|water bill|generator|diesel|estate due|dstv|internet|wifi|\bdata\b|airtime|recharge/i, category: "Housing & Utilities" },
  { pattern: /uber|bolt|fuel|petrol|fare|transport|keke|bus|flight|car service/i,                                   category: "Transportation" },
  { pattern: /market|grocery|foodstuff|supermarket|provisions|noodles|indomie|spaghetti|\beggs?\b|bread(?! ?fruit)|rice|beans|yam|pasta|tomato|pepper|onion|garlic|\bfish\b|\bchicken\b|\bmeat\b|vegetables|groundnut|palm oil|stockfish/i, category: "Food & Groceries" },
  { pattern: /restaurant|suya|lounge|bar|bukka|dining|takeout|delivery|cafe|coffee|soft drink|chapman|malt\b|smoothie|snack/i, category: "Dining & Lifestyle" },
  { pattern: /hospital|clinic|pharmacy|drug|medical|health insurance/i,                                            category: "Healthcare" },
  { pattern: /school fee|fees|family|dependant|dependent|relative|upkeep|girlfriend|boyfriend|wife|husband|mother|father|sister|brother|uncle|aunt|parents|spouse/i, category: "Family & Dependents" },
  { pattern: /loan|repayment|credit card payment|debt/i,                                                           category: "Debt Service" },
  { pattern: /savings|invest|mutual fund|stocks|treasury|fixed deposit|target save/i,                              category: "Savings & Investment" },
  { pattern: /salon|barber|spa|gym|clothes|shopping|skincare/i,                                                    category: "Personal Care" },
  { pattern: /bet9ja|sportybet|nairabet|1xbet|betway|betking|merrybet|stake\.com|bet\b|wager|odds|parlay|accumulator|betting deposit/i, category: "Betting" },
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
  const charges = CATEGORIES.find((c) => c.name === "Charges");
  return {
    category:     charges.name,
    essentiality: charges.essentiality,
    nature:       charges.nature,
    confidence:   0.3,
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
