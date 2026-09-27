# Budget Planner v5.2 — Implementation Plan

Three features: Weekly Digest Notification, Kanban Board + Task Comments, and Contacts Transaction History.

---

## 1. Weekly Digest Notification

### What it does
Every Sunday at 9:00 AM, one scheduled notification fires (even if the app is closed) containing:
- Total spent this week
- Comparison against your 3-week rolling average (up/down, %)
- One goal's current progress — the one closest to its target date

### What already exists that this builds on
`notifications.js` has `setupChannels()`, `requestNotificationPermissions()`, and the full Capacitor LocalNotifications scheduling pattern. Adding a new `scheduleWeeklyDigest()` function is the same shape as `scheduleUpcomingReminders()`.

### One important limitation to plan around
`@capacitor/local-notifications` can only schedule a notification for a *specific future datetime*, not a repeating cron-style rule. So "every Sunday 9 AM" means: schedule next Sunday when the app is opened, cancel the old pending one first so it doesn't stack. Same pattern already used for subscription/debt reminders — cancel all pending, then reschedule.

### Backend — one new endpoint
```
GET /api/analytics/weekly-digest
```
Returns the digest data needed to build the notification body:
```json
{
  "week_start": "2026-09-21",
  "week_end": "2026-09-27",
  "total_spent": 4820.00,
  "three_week_avg": 3950.00,
  "change_pct": 22.0,
  "trending_up": true,
  "spotlight_goal": {
    "name": "Goa Trip Fund",
    "current_amount": 8500,
    "target_amount": 12000,
    "pct": 70.8,
    "target_date": "2026-12-01"
  }
}
```

**Query logic:**
- `total_spent` — `SUM(amount)` from `transactions` where `type = 'expense'` and `occurred_at` is within the last 7 days
- `three_week_avg` — same query repeated for the 3 weeks prior, averaged
- `spotlight_goal` — active goal with the nearest non-null `target_date`, with `current_amount`, `target_amount`, and computed `pct`

### Frontend — `lib/notifications.js`
Add a dedicated channel and a new exported function:

```js
// In setupChannels():
await LocalNotifications.createChannel({
  id: 'weekly_digest',
  name: 'Weekly Digest',
  importance: 3,          // DEFAULT — less intrusive than bills (4) or alerts (5)
  visibility: 0,          // PRIVATE — hides content on lockscreen (financial data)
});
```

```js
export async function scheduleWeeklyDigest(digestData) {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    // Find the next Sunday 9 AM
    const now = new Date();
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(9, 0, 0, 0);

    // Cancel any existing weekly digest notification
    const pending = await LocalNotifications.getPending();
    const existing = pending.notifications.filter(n => n.extra?.type === 'weekly_digest');
    if (existing.length > 0) {
      await LocalNotifications.cancel({ notifications: existing });
    }

    const { total_spent, three_week_avg, change_pct, trending_up, spotlight_goal } = digestData;
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const trend = trending_up ? `↑${change_pct.toFixed(0)}% vs avg` : `↓${change_pct.toFixed(0)}% vs avg`;

    await LocalNotifications.schedule({
      notifications: [{
        id: 99999,   // fixed ID so it's always the same slot, never stacks
        title: `📊 Weekly Digest — Spent ${fmt.format(total_spent)}`,
        body: `${trend} • ${spotlight_goal.name}: ${spotlight_goal.pct.toFixed(0)}% funded`,
        schedule: { at: nextSunday },
        channelId: 'weekly_digest',
        extra: { type: 'weekly_digest' }
      }]
    });
  } catch (e) {
    console.error('Failed to schedule weekly digest', e);
  }
}
```

### Where to call it
In `App.jsx`, alongside where `scheduleUpcomingReminders` is already called on app load:
```js
const digest = await apiClient.get('/analytics/weekly-digest');
await scheduleWeeklyDigest(digest);
```
This reschedules next Sunday's notification every time you open the app — stale data from a previous week gets replaced automatically, and if the notification fires while the app is open, the user just sees the digest in-app instead (no duplicate shown).

---

## 2. Kanban Board + Task Comments

### What's already built (confirmed in the code)
- `projects.js` — full CRUD, mounted at `/api/projects`
- `task_comments.js` — get/post/delete, mounted at `/api/task-comments/:taskId`
- `Tasks.jsx` — has `view` state with `'list'` and `'board'` modes, `useProjects()` already imported, `LayoutGrid` icon already imported for the toggle
- `TaskCard` — already shows `<MessageSquare size={12}/> 7` (hardcoded) — the comment count slot exists, just needs real data
- `TaskModal.jsx` — exists but doesn't have a comments section

### What's missing (only frontend work — backend is complete)

**A. The board view is a dead toggle**
`Tasks.jsx` switches `view` state but renders the same list regardless. The board just needs a render branch:

```jsx
{view === 'board' ? (
  <KanbanBoard tasks={filteredTasks} onTaskClick={setEditingTask} onDrop={handleDrop} />
) : (
  // existing list render
)}
```

**B. `KanbanBoard` component** (new file: `components/KanbanBoard.jsx`)

Three columns: `todo`, `in_progress`, `done`. Each column renders its tasks using the existing `TaskCard`.

Drag-and-drop: use `@dnd-kit/core` + `@dnd-kit/sortable` (lighter than `react-beautiful-dnd`, maintained, works with touch for mobile):
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

On drop, call `update.mutate({ id: task.id, status: newColumn })` — the backend `PUT /tasks/:id` already accepts `status`. No schema changes.

Column layout:
```jsx
const columns = {
  todo:        { label: 'To Do',       icon: '📋' },
  in_progress: { label: 'In Progress', icon: '⚡' },
  done:        { label: 'Done',        icon: '✅' }
};
```

Style: same glassmorphic card background, column header with count badge, tasks stack vertically, horizontal scroll between columns on mobile (one column wide, swipeable).

**C. Real comment count on `TaskCard`**

`useComments` hook (add to `useBudget.js`):
```js
export function useComments(taskId) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => apiClient.get(`/task-comments/${taskId}`),
    enabled: !!taskId,
  });
}
```

The comment count currently shows hardcoded `7`. Replace it with the real count by fetching comment counts alongside the task list — either embed `task_comments(count)` in the `GET /tasks` Supabase select (add to tasks.js: `.select('*, task_comments(count)')`), or use a separate count-only query per card. The Supabase aggregate approach is cleaner since it doesn't fire N requests for N task cards.

**D. Comment thread in `TaskModal`**

Add a "Comments" section at the bottom of the existing task detail modal:

```jsx
function CommentThread({ taskId }) {
  const { data: comments = [] } = useComments(taskId);
  const [text, setText] = useState('');
  const add = useMutation({ mutationFn: (t) => apiClient.post(`/task-comments/${taskId}`, { text: t }) });

  return (
    <div className="comment-thread">
      <div className="section-title mt-4 mb-2">Comments</div>
      {comments.map(c => (
        <div key={c.id} className="comment-row">
          <p className="text-sm">{c.text}</p>
          <span className="text-xs text-muted">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input className="input flex-1" value={text} onChange={e => setText(e.target.value)}
          placeholder="Add a comment..." onKeyDown={e => e.key === 'Enter' && add.mutate(text)} />
        <button className="btn btn-primary" onClick={() => add.mutate(text)}>Send</button>
      </div>
    </div>
  );
}
```

**E. Task → Project assignment in `TaskModal`**
A project dropdown using the already-fetched `useProjects()` data — sets `project_id` on create/edit.

---

## 3. Contacts Transaction History

### What's needed

**Backend — one new endpoint** (no schema changes):
```
GET /api/contacts/:id/history
```

Aggregates all financial interactions involving this person across three tables:

```js
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;

  // Verify contact ownership
  const { data: contact } = await supabase
    .from('people').select('id, name').eq('id', id).eq('user_id', req.userId).single();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const [ledgerItems, tripParticipations] = await Promise.all([
    // People Ledger entries
    supabase.from('people_ledger')
      .select('*')
      .eq('person_id', id)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false }),

    // Trips they participated in
    supabase.from('trip_participants')
      .select('*, trips(id, name, start_date, end_date, status, destination)')
      .eq('person_id', id)
  ]);

  // For each trip, get their payment share and what they owe/are owed
  const tripIds = (tripParticipations.data || []).map(tp => tp.trips?.id).filter(Boolean);
  const tripSettlements = tripIds.length ? await supabase
    .from('trip_settlements')
    .select('*')
    .in('trip_id', tripIds)
    .eq('participant_id', id) : { data: [] };

  res.json({
    contact,
    ledger: ledgerItems.data || [],
    trips: tripParticipations.data || [],
    settlements: tripSettlements.data || [],
    summary: {
      total_lent:     (ledgerItems.data || []).filter(l => l.direction === 'lent').reduce((s,l) => s + Number(l.amount), 0),
      total_borrowed: (ledgerItems.data || []).filter(l => l.direction === 'borrowed').reduce((s,l) => s + Number(l.amount), 0),
      total_trips:    tripIds.length,
    }
  });
});
```

### Frontend — Contact detail view

Clicking a contact in `Contacts.jsx` currently opens an edit modal. Add a **"View History"** button that opens a full-screen slide-over or a dedicated route (`/contacts/:id`):

**Three sections:**

**① Summary strip (top)**
```
₹3,200 lent  |  ₹800 borrowed  |  4 trips together
```

**② People Ledger history** — list of IOUs (who owes whom, amount, date, status: paid/unpaid). Each row shows the existing WhatsApp UPI link button for unpaid entries — reuses `PeopleLedger.jsx`'s existing link generation, just filtered to this person.

**③ Shared trips** — each trip this person participated in, showing:
- Trip name, destination, dates
- Their share of the settlement (from `trip_settlements`): how much they paid, their fair share, net balance
- Status badge (planned / active / settled)

### Hook addition (`useBudget.js`)
```js
export function useContactHistory(contactId) {
  return useQuery({
    queryKey: ['contact-history', contactId],
    queryFn: () => apiClient.get(`/contacts/${contactId}/history`),
    enabled: !!contactId,
  });
}
```

---

## Build order

1. **Backend: `/analytics/weekly-digest`** — small, self-contained, no schema changes
2. **Frontend: `scheduleWeeklyDigest()`** in `notifications.js` — extend existing pattern
3. **Frontend: wire it in `App.jsx`** alongside existing `scheduleUpcomingReminders` call
4. **Backend: embed `task_comments(count)` in `GET /tasks` select** — one-line change
5. **Frontend: `KanbanBoard.jsx`** — install `@dnd-kit`, build the three-column board
6. **Frontend: wire the board view toggle** in `Tasks.jsx` — already has the state, just needs the render branch
7. **Frontend: `CommentThread` in `TaskModal`** — uses the existing `task-comments` endpoint
8. **Frontend: project dropdown in `TaskModal`** — uses already-fetched `useProjects()`
9. **Backend: `GET /contacts/:id/history`** — new endpoint, no schema changes
10. **Frontend: Contact history view** — slide-over with three sections
