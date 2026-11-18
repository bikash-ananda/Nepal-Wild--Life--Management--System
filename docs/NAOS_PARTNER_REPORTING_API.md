# NAOS Partner Reporting API (WLMS)

**Status:** additive implementation on `feature/naos-partner-reporting-api`; staging and production acceptance are pending.

## Architecture

WLMS remains the only system of record for wildlife reports, review decisions and evidence bytes. NAOS authenticates farmers and authorizes farm membership. Its trusted backend calls WLMS using a server-to-server bearer credential. The credential must never be shipped to the Smart Krishi browser/mobile bundle.

No WLMS farmer account is created. WLMS stores only opaque `naos_subject_ref` and `naos_farm_ref` values, consent metadata, and the optional mapped WLMS site reference. It does not store farmer names, email addresses, phone numbers, citizenship numbers or NAOS passwords in this integration.

## Backward-compatible design

Existing browser endpoints remain unchanged:
- `POST /api/public/reports`
- `POST /api/public/uploads`
- `POST /api/functions/publicCapture`
- `POST /api/uploads`
- `GET /api/media/:id`
- `/api/entities/:entity` and existing WLMS review/admin routes.

New partner endpoints are added under `/api/v1/integrations/naos`. They write into existing WLMS `WildlifeObservation`, `HwcCase`, `Incident`, `VerificationSample` and `media_assets) workflows; no parallel incident or binary-media store is introduced.

## Authentication and server configuration

Set `NAOS_PARTNER_TOKEN_SHA256` on the WLMS API server to the lowercase SHA-256 hex digest of a high-entropy bearer token. Generate a token and digest outside the application:

```bash
TOKEN="$(openssl rand -hex 32)"
printf '%s' "$TOKEN" | sha256sum
```

Store the token only in the NAOS backend secret manager/environment and the digest only in WLMS configuration. Never expose the raw token in `VITE_*` variables, mobile code, logs or Git. Rotate by coordinating a new token and digest. If the digest is unset, partner routes return 503.

All requests use:
```
Authorization: Bearer <NAOS_SERVER_TO_SERVER_TOKEN>
```

## Endpoints

### 1. Register / renew reporter link

`POST /api/v1/integrations/naos/reporter-links`

```json
{
  "naos_subject_ref": "subject-demo-0001",
  "naos_farm_ref": "farm-demo-0001",
  "wlms_site_ref": "site-reference-optional",
  "consent": {
    "granted": true,
    "purpose": "wildlife_incident_reporting",
    "recorded_at": "2026-11-18T03:00:00.000Z",
    "policy_version": "naos-wildlife-v1"
  }
}
```

Only opaque references and purpose-specific consent metadata are accepted. Revoke using:

`DELETE /api/v1/integrations/naos/reporter-links?subject_ref=...&farm_ref=...`

### 2. Upload evidence to the existing WLMS private media store

`POST /api/v1/integrations/naos/media`

Headers:
- `Authorization: Bearer ...`
- `X-NAOS-Subject-Ref: ...`
- `X-NAOS-Farm-Ref: ...`
- `X-NAOS-Evidence-Consent: true`
- `Content-Type: multipart/form-data`

Multipart fields must include `consent=true` before the `file` part. Supported types are the existing WLMS image formats and MP4/WebM video formats. The current server-wide upload limit is 20 MB per file. The response contains a WLMS media ID; the binary itself is stored once in `media_assets` and the configured private media directory.

### 3. Submit a report

`POST /api/v1/integrations/naos/reports`

Required header: `Idempotency-Key` (8–128 characters).

```json
{
  "naos_subject_ref": "subject-demo-0001",
  "naos_farm_ref": "farm-demo-0001",
  "report_type": "crop_damage",
  "occurred_at": "2026-11-18T02:45:00.000Z",
  "location": {
    "precision": "exact",
    "latitude": 28.2096,
    "longitude": 83.9856,
    "accuracy_m": 12
  },
  "description": "Wildlife damaged the maize field.",
  "crop_type": "maize",
  "evidence_media_ids": []
}
```

Supported types: `wildlife_sighting`, `crop_damage`, `livestock_attack`, `human_encounter`, `other`.

- Sightings create a `WildlifeObservation` and the existing pending `VerificationSample` review item.
- Crop damage and livestock attacks create `HwcCase` records.
- Human encounters and other safety incidents create `Incident` records.
- Reports are unverified on submission; WLMS reviewers retain decision authority.
- Optional `wlms_site_ref` on the consented reporter link enables existing site-based officer routing.
- Evidence IDs must belong to the same active subject/farm link and cannot be attached to a second report.
- Exact coordinates are stored only in WLMS; farmer-facing status responses omit them.

### 4. List and retrieve farmer reports

`GET /api/v1/integrations/naos/reports?subject_ref=...&farm_ref=...`

`GET /api/v1/integrations/naos/reports/{reportId}?subject_ref=...&farm_ref=...`

Responses contain report ID, type, status, verification state, occurrence/update timestamps and evidence count. They do not include exact coordinates or personal identifiers.

### 5. Retrieve attached evidence

`GET /api/v1/integrations/naos/media/{mediaId}?subject_ref=...&farm_ref=...`

Requires an active reporter link and evidence already attached to a report under that same subject/farm. The NAOS backend should proxy this request to the authenticated farmer; never send the WLMS bearer token to the client.

## Data ownership and retention

- `naos_reporter_links` is an authorization/consent mapping, not a farmer profile.
- `naos_evidence_links` associates an existing WLMS `media_assets` row with an opaque subject/farm reference and report ID. It does not store file bytes.
- `naos_partner_idempotency` stores request hashes and response metadata to make retries safe.
- The authoritative report remains one existing WLMS `app_records` record; the evidence remains in the existing WLMS media store.
- Revoking a reporter link blocks future submissions and reads through the partner API. It does not erase the authoritative report or its audit history.

## Signed status-change webhooks\n\nWhen a WLMS reviewer changes the status/review state of a NAOS-originated report, WLMS writes a minimal event to `naos_webhook_outbox`. Configure `NAOS_WEBHOOK_URL` (HTTPS only) and `NAOS_WEBHOOK_SECRET` (at least 32 characters) to enable delivery. WLMS signs the exact JSON body with HMAC-SHA256 over `timestamp.body` and sends `X-WLMS-Event`, `X-WLMS-Delivery`, `X-WLMS-Timestamp`, and `X-WLMS-Signature: sha256=...`. NAOS must verify the signature, reject stale timestamps, deduplicate by delivery/event ID, and respond with 2xx only after durable acceptance. Failed deliveries are retried with exponential backoff; interrupted `sending` rows are re-queued on API startup. Events contain opaque subject/farm references and report status only—no GPS, names, contact data, or media bytes.\n\n## Current implementation boundary

The partner API routes, additive schema tables and media-store adapter are implemented on this feature branch. The current service credential is a single configured NAOS server token (hashed on the WLMS side), not yet a multi-client OAuth registry. Farmer status is currently available by authenticated polling. Staged NAOS backend proxying, mobile offline end-to-end synchronization, database-backed integration tests, and live staging acceptance remain follow-up work. Do not deploy this feature branch to production until those checks pass.
