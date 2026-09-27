# Budget Planner v5.3 — Implementation Plan

Four interconnected updates: phone contacts import, unified Debts + IOUs, debt-contact linking, and consistent delete confirmation across all pages.

---

## Overview of what changes

| Area | Before | After |
|---|---|---|
| Contacts | Manual entry only, no phone/email/birthday | Import from `.vcf`/`.csv`, stores phone + email + birthday |
| People Ledger (IOUs) | Separate page, free-text person_name, no contact link | Merged into Debts page, linked to a real `people` row |
| Debts | No contact link, no transaction awareness | Optional `person_id` FK to `people`, shows who the debt is with |
| Transactions | No debt awareness | Name-match prompt: "Was this a debt payment?" with one-tap link |
| Delete confirmations | Mix of `window.confirm` and undo-toast | Consistent undo-toast everywhere (already done for Debts/Transactions, extend to all other pages) |

---

## 1. Schema migration

### 1a. Extend the `people` table (add missing columns)
```sql
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS birthday   DATE;
```

### 1b. Migrate `people_ledger` to use `person_id` FK
The current `people_ledger.person_name` is a free-text field with no FK to `people`. Migrate it:
```sql
-- Add the FK column
ALTER TABLE people_ledger
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- For existing rows, try to match person_name to a people row (best-effort)
UPDATE people_ledger pl
SET person_id = p.id
FROM people p
WHERE p.user_id = pl.user_id
  AND LOWER(p.name) = LOWER(pl.person_name);

-- Keep person_name as a fallback for rows that didn't match
-- (do NOT drop it yet — needed for backward compat until all rows are migrated)
```

### 1c. Add `person_id` to `debts`
```sql
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;
```

### 1d. Add `debt_id` to `transactions` (already exists per the v2 rebuild — confirm it's there)
```sql
-- Only run if not already present
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;
```

### 1e. Add a `contacts_import_log` table (idempotent re-imports)
```sql
CREATE TABLE IF NOT EXISTS contacts_import_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ DEFAULT now(),
  total       INT,
  created     INT,
  updated     INT,
  skipped     INT
);
ALTER TABLE contacts_import_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own import logs" ON contacts_import_log FOR ALL USING (user_id = auth.uid());
```

---

## 2. Contacts import (phone → app)

### How to export from the phone
- **Android**: Contacts app → Export → `.vcf` file (vCard format) → share to the app or upload via web
- **Alternative**: Google Contacts → Export as `.csv` → upload via web/desktop
Both formats are supported.

### Backend — `src/services/contactsImporter.js`

```js
import { parse as parseVcf } from 'vcf';  // npm install vcf

export function parseVCF(fileText) {
  const cards = parseVcf(fileText);
  return cards.map(card => ({
    name:     card.get('fn')?.valueOf()     || card.get('n')?.valueOf() || null,
    phone:    card.get('tel')?.valueOf()    || null,
    email:    card.get('email')?.valueOf()  || null,
    birthday: parseBirthday(card.get('bday')?.valueOf()),
  })).filter(c => c.name); // skip cards with no name
}

export function parseCSV(fileText) {
  // Google Contacts CSV columns: Name, Given Name, Phone 1 - Value, E-mail 1 - Value, Birthday
  const lines = fileText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
    const get = (key) => cols[headers.indexOf(key)] || null;
    return {
      name:     get('name') || get('given name'),
      phone:    get('phone 1 - value') || get('mobile phone'),
      email:    get('e-mail 1 - value') || get('email'),
      birthday: parseBirthday(get('birthday')),
    };
  }).filter(c => c.name);
}

function parseBirthday(raw) {
  if (!raw) return null;
  // Handles: YYYYMMDD, YYYY-MM-DD, MM/DD/YYYY, --MMDD (no year)
  const patterns = [
    { re: /^(\d{4})(\d{2})(\d{2})$/,     fmt: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{4})-(\d{2})-(\d{2})$/,   fmt: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, fmt: (m) => `${m[3]}-${m[1]}-${m[2]}` },
    { re: /^--(\d{2})(\d{2})$/,          fmt: (m) => `0000-${m[1]}-${m[2]}` }, // no year
  ];
  for (const { re, fmt } of patterns) {
    const m = raw.match(re);
    if (m) return fmt(m);
  }
  return null;
}
```

### Backend — new endpoint in `src/routes/contacts.js`

```js
import multer from 'multer';
import { parseVCF, parseCSV } from '../services/contactsImporter.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/people/import
router.post('/import', upload.single('contacts'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const text    = req.file.buffer.toString('utf-8');
  const mime    = req.file.originalname.toLowerCase();
  const records = mime.endsWith('.vcf') ? parseVCF(text) : parseCSV(text);

  let created = 0, updated = 0, skipped = 0;

  for (const record of records) {
    if (!record.name) { skipped++; continue; }

    // Check if a contact with this name already exists for this user
    const { data: existing } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', req.userId)
      .ilike('name', record.name)   // case-insensitive match
      .single();

    if (existing) {
      // Update missing fields only — never overwrite data the user entered manually
      const patch = {};
      if (record.phone    && !existing.phone)    patch.phone    = record.phone;
      if (record.email    && !existing.email)    patch.email    = record.email;
      if (record.birthday && !existing.birthday) patch.birthday = record.birthday;

      if (Object.keys(patch).length > 0) {
        await supabase.from('people').update(patch).eq('id', existing.id);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await supabase.from('people').insert({
        user_id:  req.userId,
        name:     record.name,
        phone:    record.phone    || null,
        email:    record.email    || null,
        birthday: record.birthday || null,
      });
      created++;
    }
  }

  // Log the import
  await supabase.from('contacts_import_log').insert({
    user_id: req.userId,
    total:   records.length,
    created, updated, skipped,
  });

  res.json({ total: records.length, created, updated, skipped });
});
```

### Frontend — Contacts page import UI

Add an "Import Contacts" button that opens a file picker:

```jsx
function ImportContactsButton({ onSuccess }) {
  const [importing, setImporting] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('contacts', file);
      const result = await apiClient.post('/people/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(result);  // show toast: "Imported 47 contacts (12 new, 35 updated)"
    } catch (e) {
      toast.error('Import failed — check the file format');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <label className="btn btn-secondary cursor-pointer">
        {importing ? 'Importing...' : '📱 Import from Phone'}
        <input type="file" accept=".vcf,.csv" className="hidden" onChange={handleFile} />
      </label>
    </>
  );
}
```

On mobile (Capacitor), the `<input type="file" accept=".vcf">` prompt opens the file manager where the exported `.vcf` lives — no additional Capacitor plugin needed.

---

## 3. Unified Debts + IOUs

### The key insight
`debts` = money you owe to someone/something (a bank, a friend, a shop)
`people_ledger` (IOUs) = money a friend owes you, or you owe a friend informally

These are the same concept in opposite directions. The only meaningful distinction is:
- **Debt you owe** → `direction: 'borrowed'` or a formal debt with a lender
- **Money owed to you** → `direction: 'lent'`

### Schema approach: extend `debts` to cover both directions

Add a `direction` column to `debts` and a `person_id` FK (already in migration 1c above):

```sql
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'borrowed'
    CHECK (direction IN ('borrowed', 'lent'));
```

This means:
- `direction = 'borrowed'`, `person_id = NULL` → a formal debt (bank loan, credit card)
- `direction = 'borrowed'`, `person_id = <contact>` → you owe this person
- `direction = 'lent'`, `person_id = <contact>` → this person owes you (replaces people_ledger)

### Data migration
```sql
-- Migrate existing people_ledger rows into debts
INSERT INTO debts (user_id, name, principal, remaining_balance, direction, person_id, status, created_at, kind)
SELECT
  pl.user_id,
  COALESCE(p.name, pl.person_name) AS name,
  pl.amount AS principal,
  pl.amount AS remaining_balance,  -- assume none settled yet (settled ones below)
  pl.direction,
  pl.person_id,
  CASE WHEN pl.status = 'settled' THEN 'paid_off' ELSE 'active' END,
  pl.created_at,
  'debt'  -- kind column already on debts
FROM people_ledger pl
LEFT JOIN people p ON p.id = pl.person_id
WHERE pl.user_id IS NOT NULL;
```
After confirming data migrated correctly, `people_ledger` can be retired (keep the table but stop writing to it).

### Backend changes — `src/routes/debts.js`

- `GET /debts` — add `direction` filter: `?direction=lent` for "owed to me", `?direction=borrowed` for "I owe"
- `POST /debts` — accept `direction` (default `'borrowed'`), `person_id` (optional)
- Join `people` on `person_id` in GET so the contact name/phone comes back with each debt

### Frontend — merged Debts page

Replace the separate "People Ledger" nav item with tabs on the Debts page:

```
[ Formal Debts & Rent ] [ Money I Lent ] [ Money I Owe Informally ]
```

Or simpler — one list with a direction badge on each row:
- 🔴 **You owe** ₹5,000 → Rahul (informal) / HDFC Bank (formal)
- 🟢 **Owed to you** ₹1,200 → Priya

The existing Debts page UI (cards, progress bars, payment log, WhatsApp UPI link) stays identical — only the data source broadens to include `direction = 'lent'` rows.

Remove the "People Ledger" entry from the nav entirely.

---

## 4. Transaction → Debt name-match prompt

### How it works

When you log a transaction with `type = 'expense'` and a `note` or `recipient` (e.g. from a scanned receipt), the backend checks if that name fuzzy-matches any active contact who has an open debt:

**Backend — new endpoint: `GET /api/debts/match?name=Rahul`**

```js
router.get('/match', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.json({ matches: [] });

  // Fuzzy match: find active debts linked to a contact whose name is similar
  const { data: debts } = await supabase
    .from('debts')
    .select('*, people(id, name, phone)')
    .eq('user_id', req.userId)
    .eq('status', 'active')
    .not('person_id', 'is', null);

  const matches = debts.filter(d =>
    d.people?.name?.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(d.people?.name?.toLowerCase())
  );

  res.json({ matches });
});
```

**Frontend — in the transaction log modal (`Transactions.jsx`)**

After the user fills in the `note` or after a receipt scan populates `recipient`, run a debounced check:

```js
// After note/recipient field changes:
if (formData.type === 'expense' && formData.note) {
  const { matches } = await apiClient.get(`/debts/match?name=${formData.note}`);
  if (matches.length > 0) setDebtMatches(matches);
}
```

If `debtMatches.length > 0`, show a prompt **above the Save button** (not a blocking modal):

```jsx
{debtMatches.length > 0 && (
  <div className="debt-match-banner">
    <p>💳 Is this a payment toward a debt?</p>
    {debtMatches.map(d => (
      <button key={d.id} className="btn btn-sm"
        onClick={() => setFormData(f => ({ ...f, debt_id: d.id, type: 'debt_payment' }))}>
        Link to: {d.people.name} — ₹{d.remaining_balance} remaining
      </button>
    ))}
    <button className="btn btn-ghost btn-sm" onClick={() => setDebtMatches([])}>
      Not a debt payment
    </button>
  </div>
)}
```

If the user taps "Link to: Rahul — ₹5,000 remaining":
- `type` switches to `debt_payment`
- `debt_id` is set
- The existing balance trigger handles updating `debts.remaining_balance`
- No separate flow needed — it goes through `POST /transactions` exactly as any other debt payment

---

## 5. Consistent delete confirmation — undo-toast everywhere

`useUndoableAction` and `executeUndoable` already exist and work correctly on Transactions and Debts. The same hook needs wiring into every other page that currently uses `window.confirm`:

| Page | Current | Fix |
|---|---|---|
| `Goals.jsx` | `window.confirm('Delete goal?')` | `executeUndoable(() => remove.mutate(id), 'Goal deleted')` |
| `Items.jsx` | `window.confirm('Delete item?')` | Same pattern |
| `Tasks.jsx` | `window.confirm(...)` | Same pattern |
| `Notes.jsx` | `window.confirm(...)` | Same pattern |
| `Contacts.jsx` | `window.confirm(...)` | Same pattern — but also: if this contact has active debts linked to them, warn "This contact has 2 open debts — deleting them will unlink those debts" before the undo toast |
| `Trips.jsx` | `window.confirm(...)` | Same pattern |
| `Subscriptions.jsx` | `window.confirm(...)` | Same pattern |
| `TripDetail.jsx` (`handleComplete`) | `window.confirm(...)` | Replace with undo-toast (was flagged earlier) |

The pattern is identical in every case — find the `onClick` for delete, remove the `if (window.confirm(...))` wrapper, wrap the mutation in `executeUndoable`:

```js
// Before (every page with window.confirm):
if (window.confirm('Are you sure?')) {
  remove.mutate(id);
}

// After:
executeUndoable(
  () => remove.mutate(id),
  'Item deleted'  // toast message — customize per entity
);
```

---

## 6. Build order

1. **Migration** — run all schema changes (people columns, debts direction+person_id, people_ledger person_id FK, contacts_import_log). Start here since everything else depends on the schema.

2. **Contacts import backend** — `contactsImporter.js` parser + `POST /people/import` endpoint. Test with a real `.vcf` export from your phone before touching the frontend.

3. **Contacts import frontend** — the file picker button in `Contacts.jsx`, success toast with the import summary.

4. **Unified Debts backend** — extend `debts.js` GET/POST to accept and return `direction` and `person_id`; data migration from `people_ledger`.

5. **Unified Debts frontend** — merge the two views on the Debts page; remove "People Ledger" from the nav.

6. **Debt name-match backend** — `GET /debts/match` endpoint.

7. **Debt name-match frontend** — the prompt banner in the transaction modal, triggered on note/recipient change and on receipt scan auto-fill.

8. **Delete confirmation sweep** — replace `window.confirm` with `executeUndoable` across all remaining pages (Goals, Items, Tasks, Notes, Contacts, Trips, Subscriptions, TripDetail). All eight are mechanical, one at a time.

---

## 7. Edge cases to handle

- **Import: duplicate names with different numbers** (e.g. two "Rahul"s) — the importer does a case-insensitive name match. If it finds more than one match, skip and count as `skipped` rather than guessing. Surface a "2 contacts skipped due to ambiguous names" note in the import summary.
- **Import: birthday with no year** (vCard `--MMDD` format) — store as `0000-MM-DD` in the database; the Calendar birthday logic already handles this by only using month+day for the next-occurrence calculation.
- **Debt migration: person_name with no matching people row** — keep `person_id = NULL` and use `name` column as the display label. Don't block the migration on unmatched names.
- **Name-match prompt: multiple debt matches** — show all of them as separate buttons. Rare in practice, but possible if you owe two different people named Rahul.
- **Deleting a contact with linked debts** — don't cascade-delete the debts (that would silently wipe financial history). Set `debts.person_id = NULL` on contact delete (handled by `ON DELETE SET NULL` in migration 1c) and warn the user in the UI before the undo-toast fires.
