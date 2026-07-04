// Rough, commonly-cited monthly spending ranges for an average Nigerian
// urban household, by category. Not an official survey — a compass for
// "is this normal," in the same spirit as the app's finance-fact trivia.
// Values are monthly Naira ranges; scale by period length before comparing.
export const CATEGORY_BENCHMARKS = {
  "Food & Groceries":     { low: 45_000, high: 70_000  },
  "Transportation":       { low: 25_000, high: 50_000  },
  "Housing & Utilities":  { low: 60_000, high: 150_000 },
  "Dining & Lifestyle":   { low: 15_000, high: 30_000  },
  "Personal Care":        { low: 8_000,  high: 15_000  },
  "Healthcare":           { low: 10_000, high: 20_000  },
  "Family & Dependents":  { low: 20_000, high: 40_000  },
};

/** Compare an amount (already scaled to the benchmark's monthly window) against
 *  the category's typical range. Returns null if no benchmark exists for it. */
export function compareToBenchmark(category, amountForPeriod, periodDays = 30) {
  const bench = CATEGORY_BENCHMARKS[category];
  if (!bench) return null;

  const scale = Math.max(0.1, periodDays / 30);
  const low   = bench.low  * scale;
  const high  = bench.high * scale;

  let verdict, color;
  if (amountForPeriod < low)       { verdict = "Below typical"; color = "var(--green)"; }
  else if (amountForPeriod > high) { verdict = "Above typical";  color = "var(--red)";   }
  else                              { verdict = "Typical range"; color = "var(--amber)"; }

  return { low, high, verdict, color };
}
