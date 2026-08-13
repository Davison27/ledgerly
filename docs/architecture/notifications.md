# Persisted notifications

The notifications context lives in `apps/back/src/contexts/notifications/`.
The frontend data slice is `apps/front/src/entities/notification/`; the bell
and panel belong to `apps/front/src/widgets/app-layout/`.

## Purpose and lifecycle

Notifications record conditions that must remain visible after a request,
browser session, or backend restart. They are persisted rather than derived at
read time so an event is not lost simply because no user had the application
open when it occurred.

The current notification types are defined in
`domain/notification-type.ts`:

- document overdue, due soon, or incomplete;
- expired or expiring staff documents;
- upcoming schedule events and schedule conflicts;
- duplicate documents and failed document extraction.

Every notification has a `dedupe_key` built by `buildDedupeKey()` as
`<type>:<parts>`. `notifications.dedupe_key` is unique and
`TypeOrmNotificationRepository.insertIfAbsent()` uses `INSERT ... ON CONFLICT
DO NOTHING`. Producers may therefore be retried without creating duplicate
notifications.

## Producers

`ScanForNotificationsUseCase` evaluates current state, not a change log. It
reads document, staff-document, and schedule ports and creates the seven
time-based types. Before inserting, it resolves open scanned notifications
that are no longer active. A missed scan is self-healing: the next scan sees
the current state and the unique dedupe key protects already-created rows.

`DailyNotificationScanScheduler` runs once at startup and then schedules the
next run for 07:00 in the process local timezone. Deployments that require
Madrid local time must set `TZ=Europe/Madrid`. The same run purges read
notifications older than `READ_RETENTION_DAYS`; unread notifications are not
purged automatically.

Domain events create the action-based types. Documents and schedule publish
through the shared `DomainEventPublisher` port, while
`NotificationEventSubscriber` dispatches `DocumentCreatedEvent`,
`InvoiceExtractionFailedEvent`, and `ScheduleEventSavedEvent` to the relevant
use cases. This keeps producing contexts independent from the notifications
module.

If event handling fails, the subscriber stores a unique retry job in
`notification_event_retries` and rethrows. `NotificationEventRetryScheduler`
checks due jobs every minute, removes successful jobs, and retries failures
with capped exponential backoff. This retry queue protects event-triggered
notifications; it is separate from notification deduplication.

## Delivery and retention

`NotificationDelivery` is a port invoked only for newly inserted
notifications. The configured adapter is `NoopNotificationDelivery`; email is
not currently sent. `email_sent_at` remains part of the persisted model for a
future delivery adapter.

Notifications use a polymorphic resource reference (`resource_kind`,
`resource_id`, and optional `resource_project_id`), so the database cannot
enforce a foreign key for every resource type. A notification may therefore
outlive a deleted resource; it remains valid historical information.

## HTTP and frontend consumption

All notification endpoints require notification access:

- `GET /notifications` returns a paginated list, optionally filtered by
  `unread`, `open`, or `resolved` status.
- `GET /notifications/unread-count` returns the bell badge count.
- `POST /notifications/read-all`, `POST /notifications/:id/read`, and
  `POST /notifications/:id/resolve` update lifecycle state.

The frontend polls the unread count and loads the paginated list when the
notification panel is opened. See `docs/architecture/data-layer.md` for query
and mutation conventions.
