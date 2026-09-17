# Budget Manager — Backend Rebuild Plan (v2)

Supersedes the automatic allocator design. Currency: **INR (₹)** throughout. No automatic distribution anywhere — every allocation, every rupee, is entered manually.

---

## 1. Core architectural decision

**`transactions` becomes the single source of truth for every balance-affecting event**: income, expense, account-to-account transfer, debt/rent payment, and goal contribution. The old standalone `debt_payments` table is retired — a debt payment is just a `transactions` row with `type = 'debt_payment'`. This is what makes "every transaction subtracts from the current amount and shows on all pages" actually true, instead of being three different tables that can drift out of sync.

Account balances and debt/goal totals are never computed by summing on read — they're maintained by a **Postgres trigger** on `transactions`, so they're always correct no matter which code path inserted the row.

---

## 2. Schema

### `accounts` (new)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| name | text | e.g. "HDFC Savings", "Cash" |
| type | text | `bank` \| `cash` |
| last4 | text | nullable, last 4 digits for bank accounts |
| current_balance | numeric(12,2) | maintained by trigger, never written directly by the app |
| is_active | boolean | default true |
| created_at | timestamptz | |

### `transactions` (rebuilt — the hub)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| account_id | uuid FK → accounts | required |
| type | text | `income` \| `expense` \| `transfer_in` \| `transfer_out` \| `debt_payment` \| `goal_contribution` |
| amount | numeric(12,2) | always positive; direction comes from `type` |
| occurred_at | timestamptz | date **and** time, user-entered |
| item_id | uuid FK → items | nullable — set for `expense` when the user picks a saved item |
| debt_id | uuid FK → debts | nullable — required when `type = debt_payment` |
| goal_id | uuid FK → goals | nullable — required when `type = goal_contribution` |
| transfer_pair_id | uuid | nullable — links a `transfer_out` row to its matching `transfer_in` row |
| utr_id | text | nullable — optional UPI reference |
| note | text | nullable |
| created_at | timestamptz | |

Transactions are **immutable** once created — no edit endpoint, only delete (which reverses the trigger's effect) and re-create. This keeps the balance trigger's logic to two simple cases (apply / reverse) instead of arbitrary diffing.

### `debts` (extended)
| Column | Type | Notes |
|---|---|---|
| *(existing)* | | name, principal, remaining_balance, interest_rate, min_payment, priority, status, description |
| debt_date | date | **new** — the real-world date the debt/rent was incurred, separate from `created_at` |
| kind | text | **new** — `debt` \| `rent`. A month's rent is just a `kind='rent'` row with `principal` = that month's rent amount |

### `goals` — unchanged structurally (`id, user_id, name, target_amount, current_amount, target_date`), now updated by the trigger instead of a manual PUT.

### `budget_allocations` — unchanged structurally, now populated by hand instead of an algorithm.

---

## 3. Balance trigger logic

One trigger function on `transactions`, fired `AFTER INSERT` and `AFTER DELETE`:

| type | On INSERT | On DELETE (reverse) |
|---|---|---|
| income | `account.current_balance += amount` | `-= amount` |
| expense | `account.current_balance -= amount` | `+= amount` |
| transfer_out | `account.current_balance -= amount` | `+= amount` |
| transfer_in | `account.current_balance += amount` (on the *other* account) | `-= amount` |
| debt_payment | `account.current_balance -= amount`; `debts.remaining_balance -= amount` (mark `paid_off` if 0) | reverse both |
| goal_contribution | `account.current_balance -= amount`; `goals.current_amount += amount` | reverse both |

### Transfers
`transfer_in`/`transfer_out` can **only** be created through one RPC, never through the generic `POST /transactions`:

```sql
transfer_between_accounts(from_account_id, to_account_id, amount, utr_id, note, occurred_at)
```
This inserts both paired rows (same `transfer_pair_id`) in one atomic call, so the trigger updates both balances together — no risk of a half-completed transfer.

---

## 4. API

### Accounts
- `GET /accounts`
- `POST /accounts` — `{ name, type, last4? }`
- `PUT /accounts/:id`
- `DELETE /accounts/:id` — soft-delete (`is_active=false`) if it has transactions, hard delete if empty
- `POST /accounts/:id/transfer` — `{ to_account_id, amount, utr_id?, note?, occurred_at? }` → calls the RPC

### Transactions
- `GET /transactions?account_id=&item_id=&debt_id=&goal_id=&type=&from=&to=`
- `POST /transactions` — `{ account_id, type, amount, occurred_at, item_id?, debt_id?, goal_id?, utr_id?, note? }`. Rejects `type` of `transfer_in`/`transfer_out` (must use the transfer endpoint); requires `debt_id` for `debt_payment` and `goal_id` for `goal_contribution`.
- `DELETE /transactions/:id`

### Items — unchanged (`GET/POST/PUT/DELETE /items`); powers the item picker in the transaction form.

### Debts / Rent
- `GET /debts?kind=debt|rent`
- `POST /debts` — `{ name, principal, debt_date, kind, interest_rate?, min_payment?, priority?, description? }`
- `PUT /debts/:id`
- `DELETE /debts/:id`
- `GET /debts/:id/payments` — convenience read, joins `transactions` where `debt_id = :id AND type = 'debt_payment'`
- Paying a debt/rent = `POST /transactions` with `type: 'debt_payment'`, `debt_id`, `account_id`, `utr_id?` — no separate payoff endpoint.

### Goals
- `GET /goals`
- `POST /goals` — `{ name, target_amount, target_date? }`
- `PUT /goals/:id`
- `GET /goals/:id/contributions` — convenience read, joins `transactions` where `goal_id = :id`
- Contributing = `POST /transactions` with `type: 'goal_contribution'`, `goal_id`, `account_id`.

### Manual budget allocations (replaces the allocator entirely)
- `GET /budget/:month` — returns each `budget_allocations` row plus a live-computed `spent_amount` (sum of matching transactions within the month's cycle bounds)
- `PUT /budget/:month/allocations/:target_type/:target_id` — `{ allocated_amount }`, upserts. No algorithm, no scaling, no priority logic — whatever number you enter is what's stored.
- `DELETE /budget/:month/allocations/:target_type/:target_id`

### Dashboard / Analytics
- `GET /dashboard/summary?month=` — total balance across all accounts, income/expense for the current cycle, per-item spend vs. manual allocation, per-debt remaining balances, upcoming/unpaid rent, goals progress
- `GET /analytics/trends` — category-deviation flagging, now reading from the unified `transactions` table (fixes the earlier income-source-of-truth mismatch automatically)
- Cycle bounds: `user_settings.cycle_start_date` = the 21st, `cycle_days` ≈ 31, so "this month" always means your actual pay cycle, not the calendar month.

---

## 5. Phased build order

1. **Schema** — since this is a fresh start (no data to migrate), write one clean migration: create `accounts`, rebuild `transactions`, extend `debts` (`kind`, `debt_date`), drop the old `debt_payments` table, add the balance trigger function + trigger, add the `transfer_between_accounts` RPC.
2. **Balance engine** — trigger + RPC, tested in isolation with raw SQL before any API code touches it.
3. **Accounts API**.
4. **Transactions API** — the hub; get validation rules right here since every other page depends on this endpoint behaving correctly.
5. **Debts/Rent API** — CRUD + the `/payments` convenience read.
6. **Goals API** — CRUD + the `/contributions` convenience read.
7. **Manual allocations API** — replaces `allocator.js` outright.
8. **Dashboard/analytics rewrite** against the unified ledger.
9. **Cleanup** — delete `allocator.js`, `distributeDebtPayments`, all references to the old `debt_payments` table and the old `/budget/allocate` algorithmic route.
10. **Frontend** — new Accounts page, transaction form with account/item/UTR fields, updated Debts page (rent + paid-date + UTR), manual allocation UI on the Budget Planner page. This is a separate pass once the backend endpoints above are live.

Ready for me to start writing Phase 1 (the migration SQL) and Phase 2 (the trigger + RPC) now?

