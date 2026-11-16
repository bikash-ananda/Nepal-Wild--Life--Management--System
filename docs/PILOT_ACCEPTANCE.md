# Pilot acceptance checklist

Run this against the deployed server with real records (`is_demo: false`). Each item needs an
observer, a result, and a pointer to evidence (screenshot, audit ID, log line, dump file). A pilot
week does not start until every P0 item passes.

**Environment:** `https://bikasheng.com.np` · API image version `APP_VERSION` · browser + phone model
· date/time (Asia/Kathmandu) · operator.

## P0 — must pass before field use

### 1. Bootstrap and login

- [ ] A fresh database creates exactly one administrator from `BOOTSTRAP_ADMIN_*`, with no default
      password left behind.
- [ ] Login sets an HttpOnly session cookie; logout and password reset invalidate existing sessions.
- [ ] Five failed logins are rate-limited; the audit log records the attempts.

**Evidence:** `app_users` row count, cookie flags, audit rows.

### 2. Roles and site scoping

- [ ] Field user cannot open another site's records (403 via API, not only hidden UI).
- [ ] Reviewer can confirm a record; field user cannot.
- [ ] Admin can disable an account and that account's next request fails.

**Evidence:** API responses (status codes), audit entries.

### 3. Offline capture

- [ ] Capture a photo with location, then go offline before upload; the item appears as queued.
- [ ] Close and reopen the browser; the queued capture and its Blob still exist.
- [ ] Restore connectivity; exactly one observation is created with the intended site, time,
      coordinates and accuracy.

**Evidence:** IndexedDB entry, one `WildlifeObservation`, media row.

### 4. Duplicate suppression

- [ ] Upload the same capture twice (retry / double tap); only one observation and one media asset
      exist for the capture ID.
- [ ] The second attempt returns success or a clear "already uploaded" response without creating a
      second record.

**Evidence:** DB counts by `data->>'capture_id'`.

### 5. Private media

- [ ] Media URL without a session returns 401/403.
- [ ] A user outside the site gets 403.
- [ ] A permitted user gets the original image; checksum matches the stored value.
- [ ] Logs contain no media path with credentials and no camera password.

**Evidence:** curl responses, checksum comparison, log grep.

### 6. Review workflow

- [ ] A submitted capture appears in the review queue as unverified.
- [ ] Reviewer confirms or corrects the label; the original evidence is preserved.
- [ ] `is_demo` stays false; the record shows who reviewed it and when.
- [ ] AI suggestion, if present, remains visibly unverified until a human acts.

**Evidence:** record JSON before/after, audit trail.

### 7. Camera connection test

- [ ] `POST /api/cameras/test-connection` returns success only when the VPS actually receives media.
- [ ] A wrong password, wrong path, or unreachable host fails with an actionable message.
- [ ] The camera password never appears in the response, browser payload, or logs.

**Evidence:** test response, redacted log lines.

### 8. Live view

- [ ] A site-authorized user opens `/cameras/:id/live` on a phone and sees video.
- [ ] A user outside the site is refused; the WHEP token expires after 30 minutes.
- [ ] Latency is measured and recorded on the farm uplink (do not claim a fixed number).

**Evidence:** screen recording with a clock, token expiry test.

### 9. Camera event capture (VPN + Dahua only)

- [ ] Motion triggers a Dahua event; one `CameraEvent` and one JPEG snapshot are stored.
- [ ] A second event within 30 s does not create a duplicate.
- [ ] The event is visible on the live page WebSocket and the snapshot is private.
- [ ] The camera outage is distinguishable from "no events".

**Evidence:** `CameraEvent` rows, snapshot file, event WebSocket message.

### 10. Restart and persistence

- [ ] `docker compose restart api mediamtx` restores every configured path, session and queued upload.
- [ ] In-flight uploads retry rather than disappear.
- [ ] Audit and review state survive the restart.

**Evidence:** before/after path list, upload test.

### 11. Backup and restore

- [ ] Automated `pg_dump` + media archive lands off the VPS with a checksum and a timestamped name.
- [ ] Restore into a scratch container reproduces the same record count, media checksums and one
      reviewed record.
- [ ] RTO and RPO are written down and meet the pilot target (RTO < 2 h, RPO ≤ 24 h).

**Evidence:** backup log, restore transcript, RTO/RPO note.

### 12. Notification

- [ ] After a reviewer confirms a monkey label, an opted-in site user receives browser push.
- [ ] The message contains no precise coordinates.
- [ ] A failed delivery is recorded and retried, not silently dropped.
- [ ] SMS/WhatsApp/phone-call claims are absent unless a provider is actually configured.

**Evidence:** push subscription row, delivery row status, message body.

## P1 — before expanding beyond one site

- [ ] Export of reviewed records with a data dictionary and privacy-aware coordinates.
- [ ] Retention job removes expired snapshots and media; counts are logged.
- [ ] Camera health dashboard shows last event, listener state and snapshot errors.
- [ ] Monitoring alerts on API down, disk > 85%, backup older than 36 h.
- [ ] `fail2ban` or equivalent blocks repeated auth failures.
- [ ] Data-export and account-removal requests have a documented owner and procedure.

## Sign-off

| Item | Result | Evidence | Verified by | Date |
|---|---|---|---|---|
| 1–6 |  |  |  |  |
| 7–9 |  |  |  |  |
| 10–12 |  |  |  |  |

**Known accepted gaps at sign-off:** `CameraEvent` has no review UI; automation rules are stored but
not executed; RTMP push ingest is not implemented; leaderboard is a stub; no AAAA record is
published. These are listed in `docs/PILOT_PLAN.md` and must not be represented as working features.
