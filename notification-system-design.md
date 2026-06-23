# Stage 1

## Core API Endpoints

**GET /api/notifications**
Headers: `Authorization: Bearer <token>`
Query params: `page`, `limit`, `notification_type`

Response:
```json
{
  "notifications": [
    { "ID": "uuid", "Type": "Placement", "Message": "Amazon Hiring", "Timestamp": "2026-04-22 17:51:30" }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

**GET /api/notifications/:id**
Headers: `Authorization: Bearer <token>`

Response:
```json
{ "ID": "uuid", "Type": "Result", "Message": "mid-sem", "Timestamp": "2026-04-22 17:51:30" }
```

---

**PATCH /api/notifications/:id/read**
Headers: `Authorization: Bearer <token>`

Response: `{ "success": true }`

---

**PATCH /api/notifications/read-all**
Headers: `Authorization: Bearer <token>`

Response: `{ "success": true }`

---

**GET /api/notifications/unread-count**
Headers: `Authorization: Bearer <token>`

Response: `{ "count": 12 }`

---

**GET /api/notifications/priority?limit=10**
Headers: `Authorization: Bearer <token>`

Response:
```json
{
  "notifications": [
    { "ID": "uuid", "Type": "Placement", "Message": "CSX Corporation hiring", "Timestamp": "2026-04-22 17:51:18" }
  ]
}
```

---

## Real-Time Mechanism

Using **Server-Sent Events (SSE)**. Client opens a persistent connection to `GET /api/notifications/stream`. Server pushes events when new notifications arrive. Chosen over WebSockets because notifications are server → client only. SSE is simpler, uses plain HTTP, and auto-reconnects.

---

# Stage 2

## Database: PostgreSQL

Chosen because notifications have a fixed schema, we need indexed queries, and ACID guarantees ensure no notification is lost or duplicated. NoSQL isn't needed here since schema flexibility isn't required.

## Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE students (
  id    INT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INT NOT NULL REFERENCES students(id),
  type       notification_type NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Scaling Problems and Solutions

As data grows to 5M+ rows: full table scans get slow, `SELECT *` wastes memory, single table becomes a bottleneck.

Fixes:
- Add composite index on `(student_id, is_read, created_at)`
- Partition table by month on `created_at`
- Archive notifications older than 6 months

## Queries

Fetch paginated:
```sql
SELECT id, type, message, is_read, created_at FROM notifications
WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;
```

Filter by type:
```sql
SELECT id, type, message, created_at FROM notifications
WHERE student_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;
```

Mark as read: `UPDATE notifications SET is_read = TRUE WHERE id = $1;`

Mark all read: `UPDATE notifications SET is_read = TRUE WHERE student_id = $1;`

Unread count: `SELECT COUNT(*) FROM notifications WHERE student_id = $1 AND is_read = FALSE;`

---

# Stage 3

## Query Analysis

Original query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Is it accurate?** Yes functionally, but `SELECT *` is wasteful — fetches unused columns.

**Why is it slow?** No index on `(studentID, isRead, createdAt)`. With 5M rows this does a full table scan — O(N).

**Fix:**
```sql
CREATE INDEX idx_notif_student_unread ON notifications (student_id, is_read, created_at);

SELECT id, type, message, created_at FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at ASC;
```
Cost drops from O(N) to O(log N + results).

**Should you index every column?** No. Each index adds overhead on every INSERT and UPDATE. Too many indexes slow down writes and waste disk. Only index columns used in WHERE, ORDER BY, or JOIN.

**Students who got a Placement notification in the last 7 days:**
```sql
SELECT DISTINCT student_id FROM notifications
WHERE type = 'Placement' AND created_at >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## Problem: DB Hit on Every Page Load

At 50,000 students each fetching on page load, the DB gets overwhelmed.

**Option 1 — Client-side cache (localStorage)**
Cache fetched data with a timestamp. Skip the API call if data is under 60s old.
- Pro: zero server cost
- Con: stale data, user may miss new notifications

**Option 2 — HTTP Cache-Control headers**
Server sends `Cache-Control: private, max-age=30`. Browser reuses cached response.
- Pro: no client code needed
- Con: can't invalidate when a new notification arrives

**Option 3 — Redis server-side cache**
Cache per student with a TTL. Invalidate on new notification.
- Pro: fast reads, precise invalidation
- Con: extra infrastructure, added complexity

**Option 4 — SSE (recommended)**
Server pushes updates over a persistent connection. DB hit only on first load.
- Pro: no polling, instant updates
- Con: each client holds an open connection

Best approach: SSE for updates + Redis for the initial load.

---

# Stage 5

## Problems with Original `notify_all`

```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

1. **Sequential** — 50k students one by one ≈ 83 minutes at 100ms each.
2. **No retry** — email failed for 200 students, silently skipped, no record.
3. **Steps are coupled** — if email fails, DB save never runs. Notification lost.
4. **No resume** — if it crashes at student 25k, no way to pick up from there.

**Should DB save and email happen together?** No. DB save is the source of truth and must always run first. Email is a side effect — it should retry independently without blocking or losing the DB record.

## Redesigned Pseudocode

```
function notify_all(student_ids, message):
    for student_id in student_ids:
        enqueue("jobs", { student_id, message })
    # returns immediately, workers take over

function worker():
    while true:
        job = dequeue("jobs")

        saved = save_to_db(job.student_id, job.message)
        if not saved:
            requeue(job, delay=5s, max_retries=3)
            continue

        push_to_app(job.student_id, job.message)

        ok = send_email(job.student_id, job.message)
        if not ok:
            enqueue("email_retry", job)
```

Parallel workers reduce 83 min to seconds. DB and email are decoupled. Failed emails retry without losing the DB record.

---

# Stage 6

## Priority Inbox

Priority scoring: Placement = 3, Result = 2, Event = 1. Sort by score descending, then by timestamp descending. Take top N.

Backend exposes `GET /api/notifications/priority?limit=10`. It fetches from the evaluation service, sorts using the priority logic, and returns the top N.

**Sorting code:**
```js
const PRIORITY = { Placement: 3, Result: 2, Event: 1 };

function getTopN(notifications, n = 10) {
  return notifications
    .slice()
    .sort((a, b) => {
      const diff = (PRIORITY[b.Type] || 0) - (PRIORITY[a.Type] || 0);
      if (diff !== 0) return diff;
      return new Date(b.Timestamp) - new Date(a.Timestamp);
    })
    .slice(0, n);
}
```

**Maintaining top N as new notifications arrive:**
Use a min-heap of size N. On each new notification: if heap size < N push it in; else if its score > heap minimum, replace the minimum. Each insert is O(log N) vs O(M log M) for full re-sort.