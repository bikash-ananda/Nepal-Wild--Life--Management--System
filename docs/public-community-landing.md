# Public community landing page and API

The public root route shows a mobile-responsive English/Nepali landing page to signed-out visitors. Signed-in users continue to see the existing operations dashboard. The public camera report uses the existing private upload and human-review workflow.

The camera photo form requires a separate confirmation before a public image upload. The upload endpoint checks both the multipart consent field and the report endpoint's consent flag.

## Public reporting

`POST /api/public/reports` accepts a JSON damage report with `loss_type` (`crop`, `livestock`, `both`, or `other`), loss details, administrative area, optional reporter contact, optional GPS (`latitude`, `longitude`, `accuracy`), and an idempotency `submission_id` UUID. It returns a report ID with `pending_review`; it does not classify the animal or send an emergency dispatch. Precise GPS and reporter contact stay on a `HwcCase` record with `visibility: reviewer_only`. Anonymous submissions are rate-limited and require same-origin requests.

`POST /api/public/geocode/reverse` accepts `latitude` and `longitude` in the request body. It is disabled unless `PUBLIC_GEOCODER_URL` is set. When enabled, the server calls the configured Nominatim-compatible `/reverse` endpoint, throttles requests, caches rounded locations, and returns only suggested administrative fields. The public UI tells the reporter that this optional lookup sends their exact coordinates to the configured provider; the reporter must check suggestions before submission. Keep the provider under an appropriate privacy policy. Leave the setting blank to keep coordinates on this server and use manual area fields.

`GET /api/v1/notices/active?municipality=Pokhara%20Metropolitan%20City&ward=21` returns current public notices targeting that area, plus notices marked for all areas. The landing page remembers the visitor's municipality and ward locally and refreshes the feed once per minute. Notices are not SMS, push, or phone-call delivery.

## Notice authoring

All notice administration requires an authenticated admin or researcher account and same-origin writes.

- `POST /api/v1/notices/manual` (also `/anual` for compatibility) creates an immediately published bilingual manual notice. Required JSON fields: `title_en`, `title_np`, `content_en`, `content_np`, `expiry_time`; optional: `target_ward`, `target_municipality`, `priority` (1–4).
- `POST /api/v1/notices/ai-generate` accepts a short evidence summary such as `target_ward`, `target_municipality`, `detection_count`, `incident_count` or up to 200 `incident_logs`, `window_minutes`, optional `site_id`, and `human_verified`. It stores an AI notice in `draft` status, and the response explicitly requires human approval. It rejects empty activity summaries.
- `GET /api/v1/notices/manage` lists drafts and published notices for authorized staff.
- `POST /api/v1/notices/:id/publish` publishes an unexpired draft after human review.

AI drafting uses a deterministic bilingual safety template if no model is configured. To enable a private or approved OpenAI-compatible endpoint, set `NOTICE_LLM_URL`, `NOTICE_LLM_MODEL`, and optionally `NOTICE_LLM_API_KEY` on the server. Provider calls have a timeout and receive area/count metadata only, not GPS, images, or reporter contact. Draft generation never publishes a notice. Model output is bounded and still requires review.

All manual expiry times must be in the future and no more than 30 days out. Public notices expose only the bilingual message, target area, priority, and timestamps. A notice's reading timer uses 200 English words/minute or 150 Nepali words/minute plus a 4-second base, and pauses while hovered, pressed, or keyboard-focused.

## Operational notes

The database schema is migrated by the existing API startup migration, which creates the `public_notices` table and an HWC submission idempotency index. No separate FastAPI process, public media bucket, or browser-side provider credential is added. Before a field study, set an approved retention policy for private reports and precise coordinates.
