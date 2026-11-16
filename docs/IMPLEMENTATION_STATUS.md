# WAMS Implementation Status

**Updated:** 2026-11-16
**Checkout:** `p2p-control` (local changes are not committed)

This note records verified implementation boundaries for the master development directive. It is not a production-readiness sign-off.

## Working foundations

- React/Vite client, Fastify API, PostgreSQL schema, and Docker/Caddy deployment files are present.
- Authentication and role/site checks are enforced in API routes. Generic record updates now reject latitude/longitude pairs outside valid ranges, invalid GPS accuracy, and site reassignment by site-scoped roles.
- Site list and detail endpoints now restrict site-scoped users to site records explicitly assigned to their account; administrators and researchers retain their existing wider access.
- Unassigned administrator-managed records (including notification contacts/rules, automation, audit, and training records) are hidden from ordinary site roles. Scoped records still require access to their assigned site; technical model/device catalogs retain their role-specific access.
- Unassigned incident, conflict, patrol, observation, and exact-coordinate records are visible only to their creator or review/admin roles. Creator IDs are retained internally for this check and omitted from JSON responses. Camera setup validates access to the selected Site record by assigned site ID.
- Unfiltered record lists with common date/ID sorts now paginate in PostgreSQL, with site and alert-recipient authorization applied before `LIMIT`/`OFFSET`. Filtered and distinct list requests keep the existing in-memory path and its 5,000-row cap.
- The schema bootstrap now creates idempotent B-tree indexes for site-scoped and alert-recipient record lookups. The PostgreSQL service is unavailable locally, so index creation and query plans remain to be verified against a database.
- Mobile capture has an IndexedDB retry queue and the PWA registers a service worker. Field capture and incident forms request location only from an explicit user action; the incident forms retain manual coordinate entry.
- Incident and HWC evidence photos are re-encoded in the browser, resized to a 1600-pixel maximum edge, and stripped of embedded camera metadata before upload. JPG, PNG, and WebP are supported; failed uploads now report a retryable error instead of silently disappearing.
- Incident and conflict descriptions support browser speech transcription in English or Nepali when the browser provides SpeechRecognition. The reporter can edit the text and submit manually.
- Browser push is queued only after a reviewer confirms a monkey label. The delivery worker retries failures and removes expired subscriptions. Exact farm coordinates are omitted from the push message.
- Species content is a static client-side catalog. Each listed mammal now links to a reviewed Nepal mammals source or DNPWC species profile; snow leopard also links to the 2024–2030 Government action plan. Source publication years and printed page references are shown in the bilingual species details. Older conservation categories are not copied into the catalog. The underlying ecological references include 2011 and 2017 material, so they are a documented baseline rather than a current conservation-status feed. Image credit/license/source fields remain separate. An administrator publishing and review workflow is not implemented.
- Technical assessment: the application is a React/Vite PWA backed by a same-origin Fastify REST API and PostgreSQL, with Docker/Caddy deployment files. Existing authentication is cookie-based and API routes enforce role/site permissions. The current pilot keeps JSONB record storage and has no live database/provider environment available for end-to-end acceptance.

## Incomplete or externally dependent

- Nepali translation coverage is partial. Navigation and the incident/HWC capture forms, including report types, validation, and photo controls, use the centralized catalog; other screens still contain English labels.
- Current AI service supports image detection only. There is no conversational text-report model, automatic speech transcription fallback, or AI-generated structured incident draft. No report text or exact coordinates are sent to an external AI provider; a provider destination and data-sharing scope still need configuration and approval.
- Incident and HWC forms can assign a report to one of the reporter's authorized sites. The server then creates an in-app alert for active field/government officers assigned to that same site; the alert opens the site-scoped report in WAMS and contains no description or coordinates. This uses assigned-site routing, not a geographic nearest-office calculation, and no external AI monitoring server is connected.
- Notification rules and contacts are stored as configuration; a general rule executor is not connected. SMS, WhatsApp, email alerts, and automated calls are not implemented. Browser push requires VAPID configuration and user permission. See `docs/PILOT_PLAN.md` for provider, consent, delivery, and operations requirements.
- User-defined geographic radii, polygon zones, risk-based recipient targeting, and PostGIS are not implemented. Existing push targeting uses assigned sites.
- Species administration and provenance review are not implemented. Do not treat the static catalog as a complete, officially reviewed species reference.
- The repository-wide TypeScript check currently reports many project and dependency errors. Lint passes. The production build passes from the OneDrive checkout with Vite's `--configLoader runner` option; the default config bundler cannot read ancestor directories from this environment's filesystem boundary.
- Local backend tests pass without a PostgreSQL service, but audit-event writes emit connection-refused warnings. Database-backed behavior still needs a configured database test run.
- Latest verification: frontend lint passes, 10 frontend tests pass, 28 backend tests pass, and Vite production build passes with the runner config loader when output is directed to the writable Codex workspace. Rewriting the OneDrive checkout's existing `dist` folder is not permitted in this environment. Android device/browser acceptance has not been run.
- Off-host backups, restore drills, monitoring, and real Android/offline acceptance remain unchecked in `docs/PILOT_ACCEPTANCE.md`.

## Current incremental changes

- Language selection persists in browser storage and updates the document language. Unknown translations fall back to English labels.
- Current-location and voice-transcription controls are available on incident and human-wildlife-conflict forms.
- Incident and HWC evidence photos are browser-compressed and stripped of camera metadata before upload.
- New incident, conflict, sighting, and patrol submissions are marked as research records (`is_demo: false`).
- Backend validation now covers coordinate pairs, coordinate ranges, location accuracy, and field-role site assignment changes.
- Site list/detail access now honors assigned site IDs for site-scoped roles.
- Generic record reads no longer expose unassigned privileged records to roles without explicit global access; camera setup also uses assigned-site authorization.
- Unassigned sensitive reports and coordinate-bearing records now require ownership or an authorized review/admin role.
- Common unfiltered record lists now use database-side pagination and authorization-aware row filters.
- New incident and HWC reports can route privacy-limited in-app review alerts to active authorized officers assigned to the selected site.
- Species details show an English/Nepali source section with publication year, report pages, and a review date; source validation has a focused test.

## Recommended next work

1. Complete the approved English/Nepali translation catalog for mobile reporting, validation, consent, and notification screens; verify with fluent Nepali review.
2. Configure and approve a specific private AI report provider and data-sharing scope before implementing text transmission. Keep drafts editable and require explicit submission.
3. Implement only consented notification channels with provider-specific configuration, delivery records, duplicate suppression, cooldowns, and explicit cost notices.
4. Add reviewed species sources and editorial controls before publishing conservation facts.
5. Complete role/site authorization tests, database-backed API tests, Android device checks, and off-site backup/restore acceptance.
