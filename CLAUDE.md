# CLAUDE.md — Taiwo's Personal Finance Tracker ("Ledger")

This file is the engineering and design specification for a personal finance
tracker originally prototyped as a single-file HTML/JS artifact and now being
rebuilt as a production web app on **Next.js (App Router) + Supabase + Vercel**.

It documents everything the prototype does — data model, business logic,
calculations, AI behavior, and pixel-level UI — so the rebuild is a faithful
port, not a reinterpretation. Where the new stack changes *how* something is
implemented (auth, storage, API key handling), that's called out explicitly
under "Architecture changes from the prototype."

The person this app is built for is **Taiwo**, a credit risk analyst at a
Nigerian commercial bank. The app should feel personal and address them by
name where the prototype did. All amounts are in **Naira (₦)**.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js 14+, App Router | Server components by default; client components only where interactivity requires it (forms, charts, chat) |
| Styling | Tailwind CSS + CSS variables for the design tokens below | Keeps the exact dark/paper dual-theme from the prototype |
| Backend / DB | Supabase (Postgres + Auth + Realtime) | Replaces the prototype's Firebase Realtime Database sync hack and `window.storage` |
| Auth | Supabase Auth (email/password or magic link) | Replaces the prototype's "paste a Firebase URL on every device" sync mechanism |
| AI provider calls | Next.js Route Handlers (server-side) | Replaces prototype's direct-from-browser API calls; keeps provider API keys off the client entirely |
| Hosting | Vercel | Environment variables for Supabase URL/anon key; provider keys stored encrypted in Supabase, never in Vercel env (they're per-user, not per-deployment) |
| Charts | Hand-rolled SVG (pie chart, bar/trend chart, gauges) — no charting library | Matches the prototype's lightweight, fully-custom visualizations; a library (e.g. Recharts) is acceptable if it can reproduce the exact look specified in §6 |

---

## 2. Architecture changes from the prototype

The prototype was a single HTML file with no backend, designed to run inside
a chat artifact sandbox. These constraints drove some workarounds that the
new stack should **remove**, not reproduce:

1. **AI provider keys move server-side.** The prototype stored Gemini/Claude/Groq
   API keys in `localStorage` and called provider APIs directly from the
   browser (requiring Anthropic's `anthropic-dangerous-direct-browser-access`
   header as a workaround). In the new app, each user's provider key is
   stored encrypted in Supabase (a `user_ai_settings` table, RLS-protected,
   never returned to the client in plaintext) and all AI calls go through
   Next.js Route Handlers that read the key server-side and proxy the
   request. The client never sees the raw key after initial entry.
2. **Cross-device sync becomes native.** The prototype's "paste the same
   Firebase URL on every device" flow is replaced entirely by Supabase Auth +
   Postgres: log in on any device, data is just there. The "Sync panel" UI
   described in §6.3 should be **removed** from the settings drawer — there's
   nothing to configure.
3. **The settings drawer keeps the Connection panel** (AI provider choice +
   key entry + "Test connection") but it now writes to Supabase instead of
   `localStorage`.
4. **Persistence keys.** Every `localStorage`/Firebase key the prototype used
   (`ledger:entries`, `ledger:budgets`, `ledger:cashbalance`,
   `ledger:investments`, `ledger:goals`, `ledger:chathistory`, etc.) maps to a
   Postgres table owned by `auth.uid()`, listed in §3.
5. **Real-time updates.** Supabase Realtime can replace manual "Sync now"
   buttons — table changes can push to other open tabs/devices live. Not
   required for v1, but the schema should support it (it already does, since
   it's just Postgres tables with RLS).

Everything else — every feature, every calculation, every screen — should be
preserved exactly as specified below.

---

## 3. Data model (Supabase / Postgres)

All tables include `id uuid primary key default gen_random_uuid()`,
`user_id uuid references auth.users not null`, `created_at timestamptz
default now()`, `updated_at timestamptz default now()`, and a Row Level
Security policy restricting all operations to `auth.uid() = user_id`.

### `entries` (the expense ledger)
| Column | Type | Notes |
|---|---|---|
| date | date | |
| desc | text | |
| amount | numeric(14,2) | |
| flow | text | `'out'` or `'in'` |
| beneficiary | text, nullable | "To" name when flow=out, "From" name when flow=in |
| category | text, nullable | one of the 11 categories in §5.1, or `'Income'` |
| subcategory | text, nullable | AI-assigned, free text |
| essentiality | text, nullable | `'Essential'`, `'Discretionary'`, or `'—'` for income |
| nature | text, nullable | `'Fixed'`, `'Variable'`, or `'—'` for income |
| confidence | numeric, nullable | 0–1, AI confidence score |
| note | text, nullable | AI's one-line categorization rationale, or `'Manual override'` |
| status | text | `'pending'` \| `'done'` \| `'fallback'` |

### `budgets`
Single row per user (or key/value): `overall numeric, nullable` and a
`category_budgets jsonb` map of category name → cap amount.

### `cash_balance`
Single row per user: `anchor_date date, nullable`, `anchor_amount numeric`.
This is the seed point; every day's opening/closing balance is *computed*
from this anchor plus all `entries` from that date forward — it is never
stored as a running total (see §5.5 for the algorithm).

### `investments`
| Column | Type | Notes |
|---|---|---|
| type | text | one of the 9 types in §5.6 |
| label | text | user-given name |
| group | text | derived from type: `'maturity'` \| `'balance'` \| `'life'` \| `'pension'` |
| principal | numeric, nullable | maturity group only |
| rate | numeric, nullable | maturity group only, percent p.a. |
| tenor_days | integer, nullable | maturity group only |
| purchase_date | date, nullable | maturity group only |
| mark_value | numeric, nullable | equities only — latest manually-entered market value |
| monthly_premium | numeric, nullable | life assurance only |
| start_date | date, nullable | life assurance only |
| monthly_contribution | numeric, nullable | pension only |
| balance | numeric, nullable | pension only — running accrued balance |
| last_accrual_month | text, nullable | pension only, `'YYYY-MM'` |
| last_payment_date | date, nullable | pension only — informational, does not affect accrual |

### `investment_transactions`
Child table of `investments` (`investment_id` FK). Used by the **balance**
group (deposits/withdrawals) and the **life assurance** group (monthly
payment log).
| Column | Type | Notes |
|---|---|---|
| investment_id | uuid FK | |
| date | date | for balance group; for life group, store as `month` text `'YYYY-MM'` instead — see note |
| type | text | `'deposit'` \| `'withdrawal'` (balance group) or `'paid'` \| `'missed'` (life group) |
| amount | numeric | |
| month | text, nullable | `'YYYY-MM'`, life-assurance log entries only |

(Pension's `contribution_history` can be the same table, `type='accrual'`,
`month` set, `amount` = that month's contribution; adjustments use
`type='adjustment'` with a free-text `month` label like `'2026-07 (adj)'`.)

### `goals`
Single row per user:
| Column | Type | Notes |
|---|---|---|
| salary | numeric, nullable | |
| payday_day | integer | default 22 |
| emergency_fund_target_override | numeric, nullable | |

### `emergency_fund_transactions`
| Column | Type | Notes |
|---|---|---|
| date | date | |
| type | text | `'deposit'` \| `'withdrawal'` |
| amount | numeric | |
| note | text, nullable | |

### `custom_goals`
| Column | Type | Notes |
|---|---|---|
| name | text | |
| target_amount | numeric | |
| target_date | date | |
| saved_so_far | numeric default 0 | manually updated by the user |

### `user_ai_settings`
| Column | Type | Notes |
|---|---|---|
| provider | text | `'gemini'` \| `'groq'` \| `'claude'`, default `'gemini'` |
| gemini_key_encrypted | text, nullable | encrypted at rest (Supabase Vault or pgcrypto) |
| groq_key_encrypted | text, nullable | |
| claude_key_encrypted | text, nullable | |

### `coach_sessions`
Cache of the last generated Coach RBC session, so reopening the Summary tab
doesn't require regenerating it.
| Column | Type | Notes |
|---|---|---|
| from_date | date | |
| to_date | date | |
| data | jsonb | the structured `{opener, headlines[], redFlags[], cutList[], closer}` shape, see §5.8 |

### `chat_messages`
Ask Coach RBC conversation history.
| Column | Type | Notes |
|---|---|---|
| role | text | `'user'` \| `'assistant'` |
| content | text | |
| created_at | timestamptz | doubles as ordering key |

This table is **per-device-shareable** (synced via Supabase like everything
else) — the prototype kept chat local-only as a workaround; the real app
should sync it like any other table unless the user explicitly wants
per-device history later.

---

## 4. AI integration

### 4.1 Providers
Three supported providers, user-selectable, each with their own stored key:
- **Gemini** (`gemini-2.5-flash`) — default, genuinely free tier, no card required at signup.
- **Groq** (`llama-3.3-70b-versatile`) — free tier, OpenAI-compatible chat completions API.
- **Claude** (`claude-sonnet-4-6`) — paid, $5 minimum prepaid credit on console.anthropic.com.

All three calls are made from Next.js Route Handlers (e.g.
`/api/ai/categorize`, `/api/ai/coach`, `/api/ai/chat`), which look up the
user's chosen provider + decrypted key from `user_ai_settings`, call the
provider, and return the result. The client never talks to
Gemini/Groq/Anthropic directly.

A **"Test connection"** action sends a trivial prompt ("Reply with exactly
one lowercase word: ok") and surfaces the literal success/failure message to
the user — never a generic "something went wrong."

### 4.2 Expense categorization
On every new "money out" entry, send `{description, amount}` to the AI with
a system prompt instructing it to classify into exactly one of the 11
categories in §5.1, plus subcategory, essentiality, nature, confidence
(0–1), and a ≤10-word rationale. Expect raw JSON back, no markdown fences.

**Offline fallback:** if the AI call fails for any reason, fall back to a
keyword rule table (see §5.1) and mark the entry `status: 'fallback'` so the
UI flags it for the user's review (a colored dot, see §6.4).

### 4.3 Natural-language "Ask about your spending"
On the Summary tab, free-text questions ("how much have I spent on Fuel in
the last month") are handled in two AI calls:
1. **Interpret** the question into a strict JSON filter: `{category,
   textContains, beneficiary, from, to, flow, essentiality}`, resolving
   relative dates against today's date.
2. **Apply the filter deterministically in code** against real ledger rows
   (never let the AI compute the total itself), then **narrate** the result
   in Coach RBC's voice in a second short AI call, given the exact computed
   numbers.

### 4.4 Coach RBC — the structured coaching session
A date-range-scoped (not just monthly) coaching feature. The system prompt
establishes a strong persona (see §6.6 for exact tone requirements) and
requests this exact JSON shape:
```json
{
  "opener": "2-3 sentences",
  "headlines": [{"title": "...", "body": "3-5 sentences"}],
  "redFlags": [{"title": "...", "body": "...", "amount": 0}],
  "cutList": [{"action": "...", "category": "...", "targetSaving": 0}],
  "closer": "2-3 sentences"
}
```
Context sent with the request includes: the selected date range, total
outflow/income, essential/discretionary split, top categories, "biggest
movers" (the range split into an earlier half and later half, compared
category-by-category), a trend object (earlier-half vs later-half totals,
with a computed `direction`: `'improving'` | `'declining'` | `'flat'`),
biggest individual transactions, discretionary cut candidates, current cash
balance, investment portfolio total, liquidity months-of-coverage, and (if
salary is set) the 50/30/20 targets prorated to the selected range length.

**Date range is user-selectable**, not fixed to "this month": preset buttons
(Today / Last 7 days / This month / Last 3 months / Last 6 months / This
year) plus custom From/To date pickers. Sessions are cached per exact date
range in `coach_sessions` so switching back to a previously-generated range
doesn't require a new AI call.

### 4.5 Ask Coach RBC — the chat tab
A true multi-turn conversation. Every message sent includes:
- The full prior conversation history (role + content pairs).
- A freshly recomputed **financial snapshot** as JSON in the system prompt:
  salary + 50/30/20 targets + actuals, emergency fund stats, current cash
  balance, liquidity months-of-coverage, investment portfolio total broken
  down by type, custom savings goals with feasibility, this month's spend by
  category, recent big transactions.

**Web research toggle.** A switch in the chat header, off by default. When
on, append the provider's *native, server-executed* search tool to the
request:
- Gemini: `tools: [{ google_search: {} }]`
- Claude: `tools: [{ type: 'web_search_20250305', name: 'web_search' }]`
- Groq: no equivalent exists — if the toggle is on but the active provider
  is Groq, the system prompt should instruct the model to say so plainly
  rather than silently answering from stale training data as if it were
  live.

When search is used, the system prompt instructs Coach RBC to weigh return
against risk and liquidity (never just chase the headline rate), name her
source, and explicitly flag that rates change and the user should verify
directly with the provider before acting — she should never present herself
as executing a financial decision, only informing one.

---

## 5. Business logic & calculations

This is the part that must be ported exactly — these are real financial
formulas, not arbitrary UI behavior.

### 5.1 Categories
Eleven fixed categories (plus `'Income'` for money-in rows), each with a
default essentiality/nature used as the AI's prior and the fallback rule's
output:

| Category | Essentiality | Nature |
|---|---|---|
| Housing & Utilities | Essential | Fixed |
| Transportation | Essential | Variable |
| Food & Groceries | Essential | Variable |
| Dining & Lifestyle | Discretionary | Variable |
| Healthcare | Essential | Variable |
| Family & Dependents | Essential | Variable |
| Debt Service | Essential | Fixed |
| Savings & Investment | Essential | Fixed |
| Personal Care | Discretionary | Variable |
| Betting | Discretionary | Variable |
| Miscellaneous | Discretionary | Variable |

Offline keyword fallback rules (regex tested against the lowercased
description), in order, first match wins, else `Miscellaneous`:
- Housing & Utilities: `rent|mortgage|electric|nepa|phcn|water bill|generator|diesel|estate due|dstv|internet|wifi`
- Transportation: `uber|bolt|fuel|petrol|fare|transport|keke|bus|flight|car service`
- Food & Groceries: `market|grocery|foodstuff|supermarket|provisions`
- Dining & Lifestyle: `restaurant|suya|lounge|bar|bukka|dining|takeout|delivery|cafe|coffee`
- Healthcare: `hospital|clinic|pharmacy|drug|medical|health insurance`
- Family & Dependents: `school fee|fees|family|dependant|dependent|relative|allowance`
- Debt Service: `loan|repayment|credit card payment|debt`
- Savings & Investment: `savings|invest|mutual fund|stocks|treasury|fixed deposit|target save`
- Personal Care: `salon|barber|spa|gym|clothes|shopping|skincare`
- Betting: `bet9ja|sportybet|nairabet|1xbet|betway|betking|merrybet|stake\.com|bet\b|wager|odds|parlay|accumulator`

### 5.2 Cash balance (opening/closing)
There is no stored running balance. Given an `anchor_date` and
`anchor_amount`:
```
closingBalance(date) = anchor_amount + Σ(amount where flow='in', else −amount)
                        for every entry with anchor_date ≤ entry.date ≤ date
openingBalance(date) = closingBalance(date) − netFlow(date)
```
Re-anchoring (editing the opening balance) just moves the anchor; it never
rewrites the ledger.

### 5.3 Liquidity ratio
Standard personal-finance benchmark: `monthsCoverage = currentCashBalance /
averageMonthlyEssentialSpend`, where the average is taken over up to the
last 3 calendar months that have any essential-tagged spend. Display
verdict bands: **<1 month** "Critically thin" (red), **1–3** "Below the
safety line" (amber), **3–6** "Healthy range" (green), **>6** "Very liquid"
(blue) — 3–6 months is the standard CFP-cited benchmark.

### 5.4 Emergency fund (kept deliberately separate from the above)
- Target = 6 × **this calendar month's** essential spend specifically (not a
  trailing average — recalculates fresh every month), unless the user has
  set a manual override.
- Balance = sum of dated lodgement transactions (deposit − withdrawal), its
  own log, **not** derived from `cash_balance` and **not** counted toward
  the 50/30/20 "Save & Invest" actual.

### 5.5 50/30/20 budget rule, with goal-driven reallocation
Given `salary`:
```
needsBudget       = salary × 0.50
baseWants         = salary × 0.30
baseSaveInvest    = salary × 0.20
extraFromGoals    = Σ requiredMonthly across all active custom_goals
wantsBudget       = max(0, baseWants − extraFromGoals)
saveInvestTarget  = baseSaveInvest + extraFromGoals
```
Every naira a custom savings goal needs per month is visibly pulled out of
Wants and added to Save & Invest — not a separate, disconnected number.

Per-goal `requiredMonthly = max(0, targetAmount − savedSoFar) /
max(1, monthsRemaining)`; feasibility checks `requiredMonthly` against a
**simple nominal** `salary × 0.20` (does not account for multiple goals
stacking — note this as a known simplification in the UI copy, not hidden).

**Actuals** for the current month: `actualNeeds`/`actualWants` from
`entries` split by essentiality; `actualSavings` summed from: balance-group
deposits this month + pension accruals this month + life-assurance premiums
marked "paid" this month + the *price paid* (not face value) of any
maturity-group instrument purchased this month.

**Breach / Within Limit badges:** for Needs and Wants (lower-is-better),
"Breach" if `actual > target`. For Save & Invest (higher-is-better),
"Breach" if `actual < target`.

### 5.6 Investments — 4 groups, 9 types

**Maturity group** (Treasury Bills, Fixed Term Notes, Commercial Papers).
Treasury Bills and Commercial Papers use **discount-basis** pricing; Fixed
Term Notes use **simple-interest**:
```
// discount basis (T-Bills, CP):
price          = faceValue × (1 − rate/100 × tenorDays/365)
expectedReturn = faceValue − price
maturityValue  = faceValue

// simple-interest basis (FTN):
price          = amountInvested              // unchanged
expectedReturn = amountInvested × rate/100 × tenorDays/365
maturityValue  = amountInvested + expectedReturn
```
`maturityDate = purchaseDate + tenorDays`. Status is `'Matured'` once
`daysToMaturity ≤ 0`, else `'Active'`. Show a tenor-elapsed progress bar:
`elapsedDays / tenorDays`, capped 0–100%.

**Balance group** (Equities, Savings, Ethical Investments, Mutual Funds).
Value = net of deposit/withdrawal transactions. Equities additionally
support an optional **mark-to-market** override (`mark_value`): if set,
`currentValue = markValue`, `gainLoss = markValue − netContributions`.

**Life Assurance.** Monthly premium, start date, and a per-month payment log
(`'paid'` or `'missed'`, amount defaults to the premium but is editable).
**Overdue detection must catch unlogged gap months, not just explicit
"missed" entries** — for every calendar month from `start_date` to the
current month inclusive, if it isn't logged as `'paid'`, it counts as
overdue (whether explicitly marked missed or simply never logged). This
matters for backfilling years of arrears that predate ever opening the
tracker.
```
monthsSinceStart = count of months from start_date's month to current month
paidCount        = distinct months logged 'paid'
coveragePct      = paidCount / monthsSinceStart × 100
arrearsMonths     = explicit 'missed' count + unlogged-gap count
arrearsAmount     = explicit missed amounts + (unloggedCount × monthlyPremium)
```
A **batch logger** lets the user fill a month range (From/To, status,
amount/month) in one action instead of one month at a time — essential for
multi-year arrears backfill.

**Pension.** Monthly contribution + balance that **auto-accrues**: on every
load, for every real calendar month elapsed since `last_accrual_month`,
add `monthly_contribution` to `balance`, log it, and advance
`last_accrual_month`. Editing the contribution amount only affects *future*
accruals. A manual "Adjust balance" action supports one-off corrections
(e.g. fund returns credited by the PFA), logged distinctly. `last_payment_date`
is a separate, purely informational field — it does not feed the accrual
engine.

A **bulk monthly-deposit** batch tool exists for the balance group too (From
month, To month, day-of-month, amount/month) for backfilling recurring
standing-order contributions.

**Portfolio total** = sum across all investments of: maturity → price paid
(not face value — it hasn't been earned yet); balance → current value;
life → available (paid) balance; pension → balance.

### 5.7 Payday countdown
Given `payday_day` (default 22): find the next occurrence in the current or
next month, clamped to that month's real length, then pulled back to the
nearest **weekday** if it lands on a Saturday or Sunday (mirrors standard
Nigerian payroll behavior). Display the **full long date** ("Wednesday, July
22, 2026"), not the raw ISO date. Show a visual pay-cycle progress bar
(`elapsed = 30 − daysUntil`, clamped, as a percentage of a 30-day estimate).

### 5.8 Range comparisons & trend
For any selected date range, split it at its midpoint into an "earlier half"
and "later half." Compare category totals (→ biggest movers) and overall
totals (→ trend direction: `improving` if later-half spend fell >5%,
`declining` if it rose >5%, else `flat`). Used by both the Summary tab's
"Biggest movers" card (always month-vs-previous-month) and Coach RBC's
range-aware analysis (earlier-half vs later-half of whatever range is
selected).

---

## 6. UI / Design system

This is the part that needs the most precision — match it exactly, not
approximately.

### 6.1 Color tokens
Two co-existing themes: a dark "ink" theme for the app shell/panels, and a
warm "paper" theme for ledger tables and investment cards (deliberately
evokes an actual paper ledger).

```css
/* Ink (dark) theme — app shell, panels, charts */
--ink:        #15191F;  /* page background */
--ink-2:      #1D232C;  /* panel background */
--ink-3:      #252C36;  /* input/card background, one step lighter */
--ink-text:       #ECE9E1;
--ink-text-dim:   #A7ACB6;
--rule:       rgba(255,255,255,0.09);   /* hairline borders on ink */

/* Paper (warm) theme — ledger tables, investment cards */
--paper:      #F6F3EC;
--paper-2:    #EDE9E1;
--paper-3:    #E3DFD2;
--paper-text:     #21242A;
--paper-text-dim: #5B6472;
--rule-paper: rgba(21,25,31,0.13);

/* Accent + semantic */
--gold:       #A9854F;   /* primary accent, ties both themes together */
--gold-deep:  #C8862E;   /* gradient partner for the gold */
--green:      #2F7A56;
--green-soft: rgba(47,122,86,0.15);
--amber:      #C8862E;
--amber-soft: rgba(200,134,46,0.18);
--red:        #B8392B;
--red-soft:   rgba(184,57,43,0.15);
--blue-accent:#5B8FA8;   /* used for "very liquid" verdict, equities mark-to-market, drawer accent */
```
Category chart colors (10-color rotating palette, used for pie slices, bar
fills, donut legends): `#A9854F, #5B8FA8, #7C8C5B, #A8645B, #8A6FA8,
#A89A5B, #5BA88A, #A85B86, #6C7686, #8C4F5B` (then repeats / extends with
`#B07A4E` for an 11th).

### 6.2 Typography
- **Headings / serif accents:** `'Source Serif 4'` — used for the app title,
  panel section titles where emphasis matters, the headline figure on
  Summary, the Coach's opener quote, the chat empty-state greeting, the
  payday widget's big number.
- **Body / UI text:** `'IBM Plex Sans'` — everything else: labels, buttons,
  prose.
- **Numbers, dates, money:** `'IBM Plex Mono'` — every amount, every date,
  every percentage. This is a deliberate, consistent rule: numbers are
  always monospace, prose never is.

### 6.3 App shell
- **Topbar:** brand mark (small gold uppercase "Ledger" eyebrow + serif
  "Daily Expense Tracker" h1) on the left, a horizontally-scrolling/wrapping
  tab bar in the center, a settings gear icon (⚙) button on the right.
- **Tabs, in order:** Summary (default/active on load) · Goals · Cash &
  Investments · Expense Entry · Ask Coach RBC. Active tab: filled
  background (`--ink-3`), gold bottom border. Inactive: ghost button,
  hover brightens text color.
- **Settings drawer:** triggered by the gear icon. Slides in from the right
  edge (`transform: translateX(100%)` → `0`, 220ms ease), 380px wide (max
  88vw on mobile), dark backdrop overlay behind it (50% black), dismissible
  via close button, backdrop click, or Escape key. Contains the Connection
  panel (AI provider tri-state toggle: Gemini/Groq/Claude, masked key input,
  Save/Clear, "Test connection" button with a live status line that prints
  the *actual* success/failure message, never generic).

### 6.4 Expense Entry tab
- **Month navigator:** "‹ JUNE 2026 ›" centered, monospace month label.
- **Stats strip:** 5-cell horizontal grid (today's outflow, last-7-days
  outflow, month out/in, net, essential-spend %), each cell a label/value
  pair; switches its labels to be day-scoped automatically when a day on the
  RAG strip below is selected, and switches back when deselected.
- **Day-flow RAG strip:** one thin colored bar per calendar day
  (green/amber/red against the daily-allowance portion of the overall
  budget, or a relative heatmap if no budget is set), horizontally
  scrollable, click a day to filter everything above and reveal a **Daily
  Summary** panel below the budgets grid (that day's opening/closing
  balance reference, category breakdown, full itemized entry list).
- **Entry form:** Date · Description · Amount (₦, comma-formatted as you
  type) · a dynamically-labeled "To"/"From" field that swaps its label and
  its autocomplete suggestion list based on the Flow selector (separate
  pools — people you pay vs. people who pay you, never mixed) · Flow select
  (Money out / Money in) · Add button. On submit, money-out entries
  immediately show a "categorizing…" state, then resolve to the AI's tags or
  fall back to rules with a colored confidence dot.
- **Ledger table:** lives on the **paper** theme (a visual "this is the
  actual ledger" cue distinct from the rest of the dark app). 6 columns:
  Date · Description (with a small subline showing subcategory, AI
  rationale, and "to/from {name}") · Amount (red for out, green for in) ·
  Category (dropdown, editable inline) · Tags (Essentiality dot + dropdown,
  stacked above Nature dropdown, in one compact cell) · row actions (✎ edit,
  ✕ delete). Clicking ✎ turns the row into inline editable inputs (date,
  description, beneficiary, amount, flow) with ✓/✕ to save/cancel. All
  `<select>` elements use a custom SVG chevron (never the raw browser
  default, which visually collided with text in early versions — keep the
  custom chevron).
- **Budgets:** a responsive card grid (not a tall stacked list) — one
  gold-bordered "Overall cap" card first, then one card per category, each
  with a thin progress bar (green/amber/red) and an inline ₦-cap input.

### 6.5 Cash & Investments tab
- **Cash balance setup panel:** before any anchor is set, a one-time "as of
  [date], I have ₦[amount]" form. After, shows current balance + a
  re-anchor form with a note that re-anchoring never rewrites the ledger.
- **Daily balance navigator:** date picker + ‹ Today › controls, shows that
  day's opening/net/closing balance and the actual entries that drove it
  (pulled live from Expense Entry, not re-typed).
- **Last-14-days table:** plain date/opening/net/closing rows.
- **Investments section:** a gold-bordered "Portfolio total" summary card,
  a "+ Log an investment" toggle revealing a **type dropdown** (grouped via
  `<optgroup>`: "Fixed-income & money market" / "Funds & holdings" /
  "Long-term") that dynamically swaps in the right form fields per type (see
  §5.6 for which fields each group needs), then four grouped listing panels
  (Fixed-income & money market / Funds & holdings / Life assurance /
  Pension), each only visible if it has entries.
- **Investment cards** (warm paper-card style, sitting inside dark panels —
  same visual language as the ledger table): name + type/rate/tenor
  subline, a status pill (Active/Matured for maturity group; "✓ Up to date"
  green or "⚠ N months overdue" red for life assurance), key figures in a
  horizontal stat row, then type-specific extras:
  - **Maturity:** a slim gold-gradient tenor-progress bar with "X% of tenor
    elapsed."
  - **Balance group:** a transaction log (most recent 6, scrollable
    conceptually), inline deposit/withdrawal add row, and (equities only) a
    "set current value" input showing live gain/loss in green/red.
  - **Life assurance:** the signature element — a **segmented two-color
    progress bar** (green = paid-coverage portion, red = overdue portion,
    each a `linear-gradient`), with a label line "{paid} of {total} months
    paid (X%)" on the left and either "₦Y overdue" (red, bold) or "Fully
    covered" (green, bold) on the right. Below it: payment log, a single-
    month logger (status/amount/month), a premium-update field, and a
    collapsible **batch logger** ("Log a range of months at once →") with
    From/To month pickers, an all-paid/all-missed status select, and an
    amount/month field — built specifically to backfill years of arrears in
    one action.
  - **Pension:** current balance, monthly contribution, last-accrued month,
    and a **last payment date** field (date input, purely informational),
    a contribution-history log, an editable contribution amount, and a
    manual "+/− adjust balance" field for one-off corrections.

### 6.6 Goals tab
- **Salary & payday setup panel.**
- **Payday widget** (reused on both Goals and Summary): a vivid centered
  card, `linear-gradient(135deg, #C8862E 0%, #A9854F 45%, #8C4F5B 100%)`,
  soft gold drop-shadow, a big serif white number with an escalating emoji
  (💰 normally, 🔥 inside 3 days, 🎉 the final day), the **full long date**
  underneath, and a white progress bar on a translucent track showing
  pay-cycle position.
- **This month's targets:** the payday widget, then three progress rows
  (Needs / Wants / Save & Invest), each with a **Breach** (red pill) or
  **Within limit** (green pill) badge next to its label, a colored progress
  bar, and explanatory note text — including a live note when goal-driven
  reallocation has trimmed Wants and grown Save & Invest. A congratulations
  banner (green-tinted, left gold border, 🎉) appears the moment Save &
  Invest is met for the month.
- **Emergency fund panel** (visually distinct, blue-accent border —
  deliberately *not* gold, to read as "related but separate" from the
  targets panel above it): progress bar, suggested-target explainer
  ("6 × this month's essential spend"), a dated lodgement log
  (deposit/withdrawal styled exactly like investment transaction logs), an
  add-lodgement row (type/amount/date), and a separate custom-target
  override field. A matching congrats banner when fully funded.
- **Custom savings goals:** card list, each showing target/date/months-left,
  a gold progress bar, "On track" (green) or "Tight — needs a cut" (amber)
  feasibility badge, saved-so-far vs. still-needed vs. required-per-month
  figures, a shortfall explanation linking to the Coach's cut list when
  infeasible, and an inline "update saved" control.

### 6.7 Summary tab (the default landing tab)
- **Payday widget** at the very top (full-width, same component as Goals).
- **Headline panel:** large serif figure (total outflow for the active
  filter), a sub-line naming the biggest category lever and a period-over-
  period delta arrow (▲ red / ▼ green) versus the equivalent prior period.
- **Cash & liquidity panel:** the three-stat row (cash now / avg monthly
  essentials / liquidity coverage), a labeled gauge bar with 0/3mo/6mo/9mo+
  marks, a plain-English verdict line, and a 30-day balance trend
  sparkline.
- **Coach RBC panel** (gold-bordered, the visual centerpiece): a date-range
  preset toolbar (Today / Last 7 days / This month / Last 3 months / Last 6
  months / This year, with the active one highlighted) plus custom From/To
  date inputs, a "Get coached for this period" button, and the rendered
  session: an italic serif **opener** quote, then card-style sections — "The
  Headlines" (plain), "Red Flags" (red-tinted left-border cards, only shown
  if non-empty), "The Cut List" (green-tinted left-border cards) — each item
  numbered or amount-tagged, then an italic **closer**.
- **Ask about your spending:** a single text input + Ask button; results
  show a big headline total, a short AI narrative, and the itemized
  matching entries below.
- **Where it went:** a **bars/pie-chart toggle**. The pie chart is large
  (≈260px), true filled SVG arcs (not a thin donut ring), with percentage
  labels directly on any slice ≥7% of the total and a legend with amounts
  beside it.
- **Category explorer:** an accordion list (paper-themed) — click a
  category to expand its individual transactions, largest category open by
  default, Expand-all/Collapse-all controls.
- **Three-up analytics row** (Biggest Movers / Big-Ticket Items / Where to
  Cut): equal-height cards (`max-height` + internal scroll so one long list
  never stretches the row), Movers shows ▲/▼ deltas with ₦ figures vs. the
  prior month, Big-Ticket shows the largest individual transactions with
  who/what/when, Where to Cut shows top discretionary categories with a
  "cut 20% → save ≈₦X/month" suggestion line.
- **Spending trend chart:** adaptive bucketing — daily if the range is ≤21
  days, weekly if ≤98 days, monthly beyond that (so it's never a wall of
  bars or just two bars). Real horizontal gridlines with ₦-value labels on
  the left, clear date labels along the bottom (auto-thinned to a max of ~8
  so they never overlap), value labels above individual bars when there are
  ≤14 of them, plain gold bars (no distracting line overlay).

### 6.8 Ask Coach RBC tab (chat)
- **Header:** a circular gradient avatar (`#C8862E` → `#8C4F5B`) with "RBC"
  in serif white, next to "Coach RBC" (serif, bold) and a one-line
  sub-description.
- **Web-research toggle:** a small pill switch + label ("Let Coach RBC
  search the web for current rates & options"), off by default.
- **Empty state:** a warm serif greeting ("Hey, I'm Coach RBC 👋"), a short
  explanation that she already has full visibility into the user's
  finances, and 3–4 clickable **suggested-prompt chips** that pre-fill and
  send a starter question.
- **Message thread:** user messages right-aligned in a gold gradient
  bubble (dark text); Coach RBC's replies left-aligned in a dark card
  bubble with a subtle border. An animated three-dot "Coach RBC is
  thinking…" indicator while awaiting a response.
- **Composer:** auto-growing textarea (caps around 120px tall) + Send
  button, Enter to send / Shift+Enter for a newline, a "Clear conversation"
  action below.

### 6.9 Shared component conventions
- **Currency inputs** are *always* `type="text" inputmode="decimal"` with
  live comma-grouping as the user types (never a native `type="number"`
  field for money — those can't be comma-formatted and don't match the
  prototype's typing feel). Percentage and day-count fields stay plain
  number inputs.
- **Progress bars** are a consistent 6–10px rounded track with a colored
  fill; color thresholds follow the same red/amber/green logic everywhere
  unless a metric is explicitly "higher is better" (savings, liquidity), in
  which case the thresholds invert.
- **Pills/badges** are small, uppercase, letter-spaced, soft-background +
  matching-tint text (never solid saturated fills) — e.g. essential vs.
  discretionary, breach vs. within-limit, active vs. matured.
- **Empty states** are never blank — always a short sentence telling the
  user what to do next, styled as muted prose, never an alarming color.

---

## 7. Page / route structure (Next.js App Router)

```
app/
  layout.tsx                 — fonts, theme tokens, Supabase auth provider
  page.tsx                   — redirects to /summary (or shows auth gate)
  (app)/
    summary/page.tsx
    goals/page.tsx
    cash/page.tsx             — "Cash & Investments"
    entries/page.tsx          — "Expense Entry"
    chat/page.tsx             — "Ask Coach RBC"
  api/
    ai/
      categorize/route.ts     — single entry categorization
      categorize-batch/route.ts
      coach/route.ts          — generates a Coach RBC session for a date range
      chat/route.ts           — multi-turn chat, with optional web-search tool
      ask/route.ts            — interpret + narrate natural-language query
      test-connection/route.ts
    investments/...            — CRUD if not done via Supabase client directly
  auth/...
```
Client components are needed for: the entry form, inline ledger row editing,
all charts, the day-strip, the settings drawer, the chat composer/thread,
and anywhere comma-formatted inputs or live AI status are involved. Static
shells (panel chrome, headings) can stay server components where there's no
interactivity.

---

## 8. Open questions for implementation

These were reasonable defaults in the prototype that are worth confirming
before the rebuild, rather than silently re-deciding them:

1. Should `chat_messages` sync across devices by default now that there's a
   real backend (recommended: yes), or stay per-device as the prototype did?
2. Should multi-goal feasibility checking become "stacked" (sum of all
   active goals' required-monthly vs. capacity) instead of each goal
   checked independently against the nominal 20%? The prototype flagged
   this as a known simplification.
3. Provider API keys: confirm Supabase Vault (or pgcrypto with a
   server-only decryption key) for encryption at rest, and decide whether a
   user can store more than one key per provider (e.g. personal vs. work).
