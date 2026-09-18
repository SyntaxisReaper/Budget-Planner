# Travel Finance Module — Implementation Plan

Extends the existing Budget Manager backend. Currency: INR throughout, consistent with the rest of the app.

---

## 1. Concept

A trip (solo or group) gets its own budget, dates, destination, and ticket costs, plus its own transaction log so multiple people's spending on the trip is tracked separately from your personal ledger. At trip end, group costs are split equally across participants and settled with the minimum number of payments. Solo trips skip settlement entirely — there's nothing to split.

Ticket prices (onward/return) are **budget-reference numbers only** — they show against the trip budget but are never part of the equal-split pool. Participants are entered fresh per trip — no persistent "friends" list behind them.

---

## 2. Schema

### `trips`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | trip owner |
| name | text | e.g. "Goa Weekend" |
| type | text | `solo` \| `group` |
| is_international | boolean | |
| destination | text | free-form — "Manali, Himachal Pradesh" or "Bangkok, Thailand" |
| budget | numeric(12,2) | overall trip budget |
| ticket_price_onward | numeric(12,2) | nullable, reference only |
| ticket_price_return | numeric(12,2) | nullable, reference only |
| start_date | date | |
| end_date | date | |
| status | text | `planned` \| `active` \| `completed` |
| created_at | timestamptz | |

### `trip_participants`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK → trips | |
| name | text | free-form, entered fresh per trip |
| is_owner | boolean | true for your own row — every trip has exactly one |
| created_at | timestamptz | |

A solo trip is just a trip with one `is_owner=true` row and no others — no special-case logic needed elsewhere.

### `trip_transactions`
Kept separate from the main `transactions` table because most of this money never touches your real accounts (a friend paying for dinner isn't your money moving).
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK → trips | |
| paid_by_participant_id | uuid FK → trip_participants | |
| amount | numeric(12,2) | |
| description | text | e.g. "Hotel", "Dinner" |
| occurred_at | timestamptz | |
| account_id | uuid FK → accounts | nullable — set only when you paid from a real account |
| linked_transaction_id | uuid FK → transactions | nullable — set when this row also created a real expense in your personal ledger |
| created_at | timestamptz | |

### `trip_settlements` (snapshot, written once at completion)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK → trips | |
| participant_id | uuid FK → trip_participants | |
| paid | numeric(12,2) | what they actually paid across the trip |
| fair_share | numeric(12,2) | total_spend / participant_count |
| balance | numeric(12,2) | paid − fair_share |
| created_at | timestamptz | |

Snapshotting at completion means the historical record doesn't shift if transactions are edited or deleted afterward.

### Existing `transactions` table
Add one nullable column: `trip_id uuid FK → trips` — lets a personal expense be cross-referenced back to the trip it belongs to.

---

## 3. Dual-write behavior

When you log a `trip_transactions` row with an `account_id` set (meaning you paid from a real account of yours), the same action also inserts a row into the main `transactions` table (`type='expense'`, `trip_id` set), so it correctly affects your account balance and shows up in your existing Analytics. `linked_transaction_id` on the trip row and `trip_id` on the personal row point at each other. Deleting the trip transaction reverses/deletes the linked personal one too, so the two never drift out of sync.

A friend's payment never creates a row in `transactions` at all — it only ever lives in `trip_transactions`, since it isn't your money.

---

## 4. Settlement logic

For a group trip:
```
total_spend      = sum(trip_transactions.amount)          // tickets excluded
fair_share       = total_spend / participant_count
per-person paid  = sum(trip_transactions.amount WHERE paid_by = this participant)
balance          = paid − fair_share
```
Positive balance → the group owes them. Negative → they owe the group.

To avoid a tangle of who-owes-whom, run a standard debt-simplification pass: sort participants by balance, repeatedly match the largest creditor against the largest debtor for the smaller of the two amounts, until all balances hit zero. This gives the **minimum number of payments** needed to settle the trip (e.g. 4 people → 3 payments instead of up to 6).

For a solo trip: `participant_count = 1`, so `balance` is always 0 — the settlement step is simply not shown in the UI.

---

## 5. API

### Trips
- `GET /trips`
- `POST /trips` — `{ name, type, is_international, destination, budget, ticket_price_onward?, ticket_price_return?, start_date, end_date, participants: [{ name }] }` (your own `is_owner` row is added automatically)
- `GET /trips/:id` — full detail: trip fields, participants, live settlement summary
- `PUT /trips/:id`
- `DELETE /trips/:id`
- `POST /trips/:id/participants` — `{ name }`
- `DELETE /trips/:id/participants/:participantId`

### Trip transactions
- `GET /trips/:id/transactions`
- `POST /trips/:id/transactions` — `{ paid_by_participant_id, amount, description, occurred_at, account_id? }`
- `DELETE /trips/:id/transactions/:txId` — also removes the linked personal transaction if one exists

### Settlement
- `GET /trips/:id/settlement` — live-computed at any time (viewable mid-trip, not just at the end), returns per-participant paid/fair_share/balance plus the simplified payment list
- `POST /trips/:id/complete` — sets `status = 'completed'` and writes the `trip_settlements` snapshot

---

## 6. Phased build order

1. **Schema** — all four new tables, plus the `trip_id` column on `transactions`.
2. **Trips API** — CRUD + participant management, owner-row auto-creation on trip creation.
3. **Trip Transactions API** — logging, the optional dual-write into the personal ledger, and reversal on delete.
4. **Settlement engine** — the live calculation endpoint and the debt-simplification pass.
5. **Frontend**
   - Trips list page (planned / active / completed)
   - Create Trip flow — solo/group toggle, participant entry, budget, the two ticket fields, start/end dates, destination + international toggle
   - Trip Detail page — budget-vs-spend progress bar, transaction log tagged by who paid, live settlement view
   - Complete Trip flow — final settle-up screen, writes the snapshot

Later, optional extension (not in this build): generating a UPI deep link per participant from the final settlement list, so anyone owed money can be paid with one tap — same mechanism discussed for the personal-transaction UPI-SMS ideas, just pointed at trip settlement instead.
