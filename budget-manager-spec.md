# Smart Budget Manager — Technical Spec

**Stack:** React.js (frontend) · Node.js + Express.js (backend) · Supabase (Postgres + Auth)

---

## 1. Overview

A personal finance app that:
- Tracks income, spending, and savings
- Distributes available income across user-defined items (needs to buy) by priority
- Pays down debts by **equal distribution** across all active debts each period
- Calculates monthly save/spend targets for goals
- Analyzes spending trends and savings rate over time

---

## 2. Database Schema (Supabase / Postgres)

Supabase Auth provides `auth.users`; all tables below reference `auth.users.id` as `user_id` and should have Row Level Security enabled with a policy of `user_id = auth.uid()`.

### `income_sources`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | default `gen_random_uuid()` |
| user_id | uuid, FK → auth.users | |
| name | text | e.g. "Salary", "Freelance" |
| amount | numeric(12,2) | |
| frequency | text | `monthly`, `weekly`, `one-time` |
| created_at | timestamptz | default `now()` |

### `items`
Things the user needs to buy / recurring expense categories.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK | |
| name | text | |
| amount_needed | numeric(12,2) | requested amount for the period |
| priority | text | `essential` \| `important` \| `optional` |
| is_recurring | boolean | default false |
| due_date | date | nullable |
| created_at | timestamptz | |

### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK | |
| item_id | uuid, FK → items | nullable (income rows won't have one) |
| amount | numeric(12,2) | |
| type | text | `income` \| `expense` |
| date | date | |
| note | text | nullable |

### `debts`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK | |
| name | text | |
| principal | numeric(12,2) | original amount |
| remaining_balance | numeric(12,2) | updated as payments log |
| interest_rate | numeric(5,2) | annual %, nullable |
| min_payment | numeric(12,2) | nullable |
| status | text | `active` \| `paid_off`, default `active` |
| created_at | timestamptz | |

### `debt_payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| debt_id | uuid, FK → debts | |
| amount | numeric(12,2) | |
| date | date | |

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK | |
| name | text | |
| target_amount | numeric(12,2) | |
| current_amount | numeric(12,2) | default 0 |
| target_date | date | nullable |

### `budgets`
One row per user per month — the computed plan.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK | |
| month | date | first-of-month convention |
| total_income | numeric(12,2) | |
| total_allocated | numeric(12,2) | |
| total_saved | numeric(12,2) | |

### `budget_allocations`
Line items of a budget — how the month's income was split.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| budget_id | uuid, FK → budgets | |
| target_type | text | `item` \| `debt` \| `goal` |
| target_id | uuid | polymorphic ref to items/debts/goals |
| allocated_amount | numeric(12,2) | |
| spent_amount | numeric(12,2) | default 0, updated as transactions post |

---

## 3. Core Algorithms

### 3.1 Monthly Allocator
Input: `total_income`, list of `items`, list of active `debts`, list of `goals`.

Order of allocation (each step consumes from remaining income):
1. **Essential items** — fund fully, sorted by `priority = essential`, up to `amount_needed`. If income can't cover all essentials, scale each proportionally: `allocated = amount_needed * (available / total_essential_needed)`.
2. **Debt payments (equal distribution)** — see 3.2.
3. **Goal contributions** — fund each goal's `monthly_needed` (see 3.3); if insufficient, scale proportionally across goals.
4. **Important, then optional items** — fund in that order with whatever remains.
5. **Leftover** — routed to a savings buffer or extra debt payoff (configurable).

### 3.2 Debt Payoff — Equal Distribution (default)
Every period, the debt-payment portion of income is split **evenly across all active debts**, regardless of balance or interest rate:

```
amount_per_debt = debt_payment_pool / count(active_debts)
```

- Each debt still has a `min_payment` floor — if `amount_per_debt` < a debt's `min_payment`, give that debt its minimum first, then redistribute the remainder evenly across the rest.
- When a debt's `remaining_balance` reaches 0, mark `status = paid_off`, remove it from the pool, and redistribute its share evenly across the remaining active debts for the rest of that period.
- Each payment insert into `debt_payments` triggers a recalculation: `remaining_balance -= amount`.

### 3.3 Goal-Based Monthly Savings
```
months_remaining = months_between(today, target_date)
monthly_needed   = (target_amount - current_amount) / months_remaining
```
If `monthly_needed` exceeds what step 3 of the allocator can actually fund, flag the goal as **at risk** in the API response rather than silently underfunding it.

### 3.4 Spend/Save Analysis
- **Savings rate** = `(total_income - total_expenses) / total_income` per month.
- **Category trend** = compare current month's spend per item/category against the trailing 3-month average; flag if deviation > 25%.
- **Debt payoff projection** = given current `remaining_balance` and the equal-distribution pool size, project months-to-zero per debt.

---

## 4. API Contracts (Express)

Base path: `/api`

### Income
- `GET /income` → list income sources
- `POST /income` → `{ name, amount, frequency }`
- `PUT /income/:id`
- `DELETE /income/:id`

### Items
- `GET /items`
- `POST /items` → `{ name, amount_needed, priority, is_recurring, due_date }`
- `PUT /items/:id`
- `DELETE /items/:id`

### Transactions
- `GET /transactions?month=YYYY-MM`
- `POST /transactions` → `{ item_id, amount, type, date, note }`

### Debts
- `GET /debts`
- `POST /debts` → `{ name, principal, interest_rate, min_payment }`
- `POST /debts/:id/payments` → `{ amount, date }` — logs a payment, recalculates `remaining_balance`
- `GET /debts/:id/projection` → months-to-payoff estimate

### Goals
- `GET /goals`
- `POST /goals` → `{ name, target_amount, target_date }`
- `PUT /goals/:id` → e.g. update `current_amount`

### Budget engine
- `POST /budget/allocate` → body `{ month }`, runs the full allocator (§3.1–3.3) against current income/items/debts/goals, writes a `budgets` row + `budget_allocations` rows, returns the full breakdown including any goals flagged at-risk.
- `GET /budget/:month` → fetch a previously computed allocation.

### Analytics
- `GET /analytics/summary?month=YYYY-MM` → savings rate, category trends, anomaly flags
- `GET /analytics/debt-projection` → payoff timeline across all debts under equal distribution

---

## 5. Frontend Structure (React)

```
src/
  pages/
    Dashboard.jsx        // savings rate, quick stats, alerts
    Transactions.jsx      // log + list expenses/income
    Items.jsx             // manage items & priorities
    Debts.jsx             // debts list, payment log, payoff projection chart
    Goals.jsx             // goals + at-risk flags
    BudgetPlanner.jsx     // trigger allocator, view breakdown
    Analytics.jsx         // trend charts (Recharts)
  components/
    AllocationBreakdown.jsx
    DebtPayoffChart.jsx
    GoalProgressCard.jsx
  hooks/
    useSupabaseAuth.js
    useBudget.js           // React Query wrapper around /budget endpoints
  lib/
    supabaseClient.js
    apiClient.js
```

State/data: React Query for server state, Supabase client-side SDK for auth session, Recharts for all charts.

---

## 6. Security Notes
- Enable Supabase Row Level Security on every table; policy `user_id = auth.uid()`.
- Express backend should verify the Supabase JWT on each request (via `supabase.auth.getUser(token)`) rather than trusting a client-supplied `user_id`.
