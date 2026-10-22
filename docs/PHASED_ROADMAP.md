# Phased Roadmap: Nepal Wildlife Management System

**Pilot focus:** Human–monkey agricultural conflict in Pokhara Metropolitan City, Ward 21

**Deployment target:** Contabo VPS at 169.58.25.131

**Product direction:** Mobile-first field reporting and research workflow
**Camera streaming:** Per-camera route setup and authenticated live-view relay are implemented; event-triggered image ingestion remains a later phase.

## Planning assumptions

The project already includes mobile camera capture, GPS/location, maps, alerts, automation, AI review, and reporting screens or entities. Treat these as product assets to connect and verify, not as proof that the workflows already work end to end. The frontend now calls a self-hosted REST API; later phases still need a real notification worker, trained monkey model, and broader end-to-end workflows.

Start with a responsive installable web app (PWA) for personal phones. Capture GPS only while a person is using the field workflow and has granted permission; provide a manual map-pin fallback. Background tracking is out of scope for the pilot unless the research protocol later requires it.

## Phase 0 — Agree the field study and data contract

**Goal:** Make sure the software measures the same things the Ward 21 research team intends to study.

- Confirm roles: farmer/community reporter, field enumerator, reviewer, researcher, and administrator.
- Define site, plot, crop, crop stage, species, behavior, raid-event boundary, damage estimate, human response, and verification fields.
- Distinguish a wildlife sighting from a crop-entry event, crop feeding/damage, and a verified human–wildlife conflict incident.
- Decide what a mobile report must contain, what can be added later, who may view exact farm coordinates, and how long images and GPS data are retained.
- Set baseline indicators: report completion rate, GPS accuracy/availability, upload success, time to review, reviewer agreement, alert delivery, and camera/mobile device uptime.

**Deliverable:** A short data dictionary, roles matrix, field form, privacy/consent checklist, and acceptance criteria. Confirm applicable local permissions and camera notice requirements before collecting identifiable footage or location data.

## Phase 1 — Self-hosted platform foundation

**Status: foundation implemented; operational verification and data migration remain.**

**Goal:** Establish the services that mobile capture, GPS, maps, and automation will use.

- Added a Compose deployment for the web app, Fastify API, PostgreSQL, private media volume, and Caddy HTTPS proxy. Configure and verify the supplied DNS record before starting Caddy.
- Replaced frontend SDK use with a same-origin REST adapter, cookie login, role checks, generic entity APIs, file uploads, and the supported capture/review functions.
- Added schema bootstrapping, a first-admin setup, audit events, upload checksums, private media delivery, health checks, and session invalidation on password reset.
- Current record storage is JSONB for pilot compatibility. Normalize site/plot/crop data, add a durable job queue and off-server backup, and migrate any needed legacy records before wider field use.

**Remaining acceptance:** verify account login, role/site permissions, capture retry/idempotency, private-media access, restart persistence, and a tested off-server database/media restore on the VPS.

## Phase 2 — Personal mobile camera, GPS, and offline capture

**Status: first vertical slice implemented; pilot usability and field checks remain.**

**Goal:** Make a phone the first reliable field data collector.

- The mobile camera capture screen, GPS coordinates/accuracy, observation notes, and online upload are connected to the self-hosted API.
- Added an IndexedDB offline queue that preserves image Blobs, retries uploads, and uses a capture ID to avoid duplicate observations.
- Add plot selection, consent/retention notice, queue-capacity warnings, location correction on a map, and field-device checks before the pilot.
- Ask for camera and location permission at the point of use. Show whether GPS was captured and its reported accuracy; let the user correct the location on a map or continue without GPS.
- Store coordinates as structured metadata linked to the report. Remove unnecessary photo metadata before storage; retain only the location and time the study needs.
- Make reports usable when connectivity is poor: save a local draft and queued media, show pending/sent/failed status, retry safely, and prevent duplicate reports when a user taps upload again.
- Compress images for upload while keeping the original evidence according to the retention policy. Do not silently discard a queued capture when phone storage is low.

**Field verification needed:** on an actual phone, capture a photo and GPS point offline, close/reopen, restore connectivity, and verify the report and media arrive once with the intended site, capture time, coordinates, and upload status.

## Phase 3 — Conflict case management and verification

**Goal:** Turn field observations into consistent, reviewable research records.

- Link sightings and mobile evidence to a plot, crop type, crop stage, and incident timeline.
- Record suspected species and behavior separately. Permit “unknown” and approximate group-size ranges.
- Add a reviewer queue for confirming or correcting reports, merging duplicate reports, and requesting missing details.
- Record crop impact and human response as separate observations; do not infer economic loss from a camera image alone.
- Show exact locations only to permitted roles. Community views should use the least precise location needed for their task.

**Acceptance:** A report can move from draft to submitted, reviewed, and verified, with an audit trail and its original evidence preserved.

## Phase 4 — Notifications and safe automation

**Goal:** Make existing automation features dependable and understandable.

- Implement a versioned rule engine with typed triggers and allowlisted actions. Do not run arbitrary code entered in the UI.
- Start with low-risk workflows: assign a review task, notify an assigned field officer, remind a reviewer about an overdue case, and send a daily operations summary.
- Let residents opt in by site or plot group and choose supported notification channels. Keep the message local-language friendly and avoid exposing exact animal locations to the wider public.
- Include duplicate suppression, cooldowns, expiry for stale alerts, retries, delivery receipts, quiet-hour preferences, and a dry-run mode for rules.
- Keep physical deterrents out of automatic action rules during the research pilot. Any non-contact audio response should be separately approved, supervised, recorded, and evaluated.

**Acceptance:** Operators can preview a rule, activate it, inspect each resulting action, and disable it. Repeated events do not create duplicate alerts.

## Phase 5 — AI-assisted review and local model evaluation

**Goal:** Use AI to reduce review effort without treating predictions as verified facts.

- Begin with an asynchronous vision worker that proposes labels for mobile images: monkey, other animal, person, no animal, or uncertain.
- Use short sequences when available to review behavior such as passing, plot entry, or feeding. Keep behavior and species judgments separate.
- Build a human review interface with accept, correct, unknown, and escalate-to-expert actions.
- Use active learning to prioritize uncertain and diverse examples for labeling. Train or fine-tune on locally reviewed images; keep a holdout set separated by site and date.
- Track event-level precision/recall, missed conflict events, false alerts per camera-day or field-day, performance by light/weather, and reviewer agreement.
- Version datasets and models. Roll back a model if its field performance drops.

**Acceptance:** AI suggestions are visibly marked as unverified, every correction is stored as a label, and a model release includes evaluation results on held-out local data.

## Phase 6 — Research dashboards, RAG, SLM, and MCP

**Goal:** Make accumulated evidence useful to field teams and researchers.

- Build dashboards for report completeness, crop and season patterns, incident locations, response times, device uptime, and missing observation periods.
- Export approved research records with data dictionaries and privacy-aware location handling.
- Add RAG over approved protocols, crop calendars, reviewed guidance, and published research. Show which source supports each answer and allow “not enough evidence.”
- Consider a small language model for Nepali/English summaries, guided form help, and questions over authorized records. Use reviewed examples to teach its response style; do not use it to decide that a monkey raid happened.
- Add an MCP server only when permissions and APIs are stable. Start with scoped, read-only tools such as camera/device health summaries, reviewed incident search, and report generation. Keep authorization in the application and API.

**Acceptance:** A research answer links to its approved source or records, respects the user’s site permissions, and can be checked against the underlying data.

## Phase 7 — Production hardening and operations

**Goal:** Prepare the mobile-first system for sustained field use.

- Add monitoring for API health, storage capacity, queue backlog, failed uploads, notification failures, and backup age.
- Review authentication, role changes, media access, rate limits, upload validation, secret rotation, and audit logs.
- Test restore procedures and document who handles incidents, lost phones, account removal, and data export requests.
- Review privacy notices, retention, field consent, and exact-coordinate access with the relevant local and research stakeholders.
- Pilot with a small group before adding more sites. Fix workflow friction and connectivity issues before expanding.

**Acceptance:** The team can identify a failed service or growing upload backlog, restore data from backup, revoke a phone or gateway credential, and explain who accessed sensitive reports.

## Phase 8 — Multi-camera connectivity and evidence ingestion

**Goal:** Let authorized staff configure different cameras on different farm routers, test the stream from the VPS, and then expand from live view into research evidence capture.

- Implemented camera identity and site setup, per-camera public/DDNS or VPN route profiles, RTSP/RTSPS and HLS source types, VPS-side connection testing, encrypted server-side passwords, MediaMTX path configuration, and authenticated WebRTC live view.
- Each camera stores an independent router/network name, host, mapped port, stream path, credentials, and transport. One farm's route does not determine another camera's connection.
- Test farm routing, exact model/firmware, stream path, codec, camera credentials, router access rules, and playback on the live Contabo server before field use. A UI connection profile cannot create a router port forward or VPN on its own.
- When using public port forwarding, restrict inbound source addresses to the VPS, use a dedicated least-privilege camera account, require encrypted transport where supported, and monitor/revoke the rule after the pilot. Never put camera credentials in browser code or logs.
- If the site is behind CGNAT, either use a router-supported outbound VPN/tunnel or defer camera integration. DDNS and Dahua's server-side event subscription do not create a route through CGNAT by themselves.
- Measure end-to-end latency on the actual farm uplink instead of promising a fixed sub-500 ms result. UDP 8189 must reach the VPS for WebRTC media; configure TURN only if field networks block direct UDP.
- Implement event subscription, sampled-frame analysis, still-image capture, and upload into the existing private review pipeline as a separate stage. Verify event names and snapshot endpoints against the exact firmware first; camera motion events do not mean a monkey was detected.
- Verify PTZ, speaker/light, and other firmware commands against the exact unit before adding any operator controls. Keep physical response actions supervised and outside automatic rules during this research pilot. Never connect high-voltage or hazardous actuators to this application.
- Add camera health and research-effort reporting so outages are not misread as absence of monkeys.
- Keep live streaming optional; it is not required for the research image-ingest workflow.

**Acceptance:** An authorized administrator can configure and test two cameras on different routes, the site-scoped viewer can open only permitted streams, credentials do not reach the browser or logs, and a service restart restores active paths. Event-triggered snapshots remain a separate acceptance gate.

## Recommended implementation order

Build one complete workflow first:

**phone photo + GPS → offline-safe upload → plot-linked conflict report → human review → opt-in notification → research dashboard**

Then expand automation and AI using reviewed field data. Replace remaining simulated/demo screens in feature groups and migrate any retained data before enabling field deployment.
