# Notification System Design
# Stage 1 - Notification API Design

## APIs

### Fetch Notifications

GET /notifications

Purpose:
Retrieve notifications for a student.

Parameters:

* page
* pageSize
* category

Response:

```json
{
  "items": [],
  "currentPage": 1,
  "totalPages": 10
}
```

### Fetch Single Notification

GET /notifications/{notificationId}

Returns details of a specific notification.

### Mark Notification Viewed

PUT /notifications/{notificationId}/viewed

Response:

```json
{
  "status": "updated"
}
```

### Mark All Viewed

PUT /notifications/viewed/all

Response:

```json
{
  "status": "success"
}
```

### Notification Summary

GET /notifications/summary

Response:

```json
{
  "unread": 5,
  "total": 42
}
```

### Priority Inbox

GET /notifications/top-priority?count=10

Returns the highest priority unread notifications.

---

## Real-Time Delivery

I would use a publish-subscribe model with WebSockets.

Flow:

Notification Service
→ WebSocket Gateway
→ Connected Students

Advantages:

* Instant delivery
* Bi-directional communication
* Low latency updates
* Suitable for future chat-like features

# Stage 2 - Database Design

## Selected Database

PostgreSQL

Reasons:

* Strong consistency
* Efficient indexing
* Relational structure fits notification data
* Reliable transactional support

## Tables

```sql
CREATE TABLE notification_records (
    notification_id UUID PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    category VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Scalability Challenges

* Millions of notifications
* Frequent unread lookups
* Large historical datasets

### Mitigation

* Composite indexes
* Table partitioning by date
* Archival strategy
* Query pagination

## Example Queries

Unread Notifications

```sql
SELECT *
FROM notification_records
WHERE recipient_id = $1
AND read_status = FALSE
ORDER BY created_on DESC;
```

Latest Notifications

```sql
SELECT *
FROM notification_records
WHERE recipient_id = $1
ORDER BY created_on DESC
LIMIT 20;
```

Notification Count

```sql
SELECT COUNT(*)
FROM notification_records
WHERE recipient_id = $1
AND read_status = FALSE;
```
