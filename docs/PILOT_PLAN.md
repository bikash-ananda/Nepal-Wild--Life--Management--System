# Pilot plan: from prototype to verified field use

**Pilot focus:** human–monkey crop-raiding, Pokhara Metropolitan City, Ward 21
**Target server:** Contabo VPS `169.58.25.131`, domain `bikasheng.com.np`
**Baseline:** commit `8b64c55`

This plan supersedes nothing in `docs/PHASED_ROADMAP.md`; it sequences the remaining work so the
pilot loop can be verified instead of demonstrated.

## 1. What exists today

```
Browser (React 18 + Vite, 58 routes)
   │  same-origin cookie session, /api/*
Fastify API (auth, records, media, cameras, ai, public, notifications)
   │
PostgreSQL 16 (JSONB `app_records` + typed side tables)
   │
Private media volume  ◄── camera snapshots (Dahua event listener, VPN only)
MediaMTX 1.21.2 (WHEP only)  ◄── RTSP/RTSPS pull from cameras
Caddy (TLS) · Docker Compose · optional wildlife-ai (Sparrow/MegaDetector)
```

Implemented and reasonably solid:

- Cookie auth, roles, site scoping, audit events, private media with checksums, session invalidation.
- Offline capture queue with idempotent capture IDs (IndexedDB).
- Per-camera route profiles, MediaMTX path configuration, encrypted camera passwords, short-lived
  WHEP tokens, Dahua PTZ/siren/light endpoints, Dahua event listener with 30 s dedupe and snapshot
  storage.
- Public reporting, bilingual landing page, notice API.
- AI adapter layer with unit tests for consensus, re-identification and adapters.

## 2. What is not real yet

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 1 | Docs drift from code | `README.md` limits section says event subscription/snapshot ingestion is absent; `server/src/cameras.js:440-483` implements it (Dahua, VPN only). | Acceptance tests and reviewer briefings target the wrong state. |
| 2 | Camera events dead-end | `recordCameraEvent()` writes `CameraEvent`; the only consumer is the live-page WebSocket (`src/pages/CameraLive.jsx:171`). `Detections.jsx` reads `DetectionEvent`. | Motion → snapshot → no review, no confirmed observation, no alert. |
| 3 | Automation is storage, not execution | `AutomationRule` is validated in `records.js`; no executor. Only the push outbox (`notifications.js`) and two `sendMail` call sites. | The UI implies rules fire. They do not. |
| 4 | No JS tests, no CI | One Python test file; no JS test runner; no `.github/`. | Every change to 58 routes and a 1,268-line `cameras.js` is unguarded. |
| 5 | Backup/restore is advice | `DEPLOY_CONTABO.md` tells the operator to test restores; no script, schedule or runbook. | Single VPS + single volume = single point of loss for research data. |
| 6 | Reachability assumes VPN or port-forward | `cameras.js:165` blocks controls/events unless `vpn_routed`; compose publishes only 8189. | CGNAT sites cannot onboard without a push-ingest path. |
| 7 | Breadth over depth | 58 routes; `functions.js:194` returns `{ leaderboard: [] }`; gamification/voice-bot/edge-device screens share the nav with the pilot workflow. | Pilot surface is indistinguishable from experiments; maintenance cost grows. |
| 8 | JSONB-only records | `schema.sql` stores entities in `data jsonb`. | Reporting/export and referential integrity get brittle as records grow. |
| 9 | Single API instance, in-memory fan-out | `cameraEventSubscribers` lives in process memory. | Fine for the pilot; blocks scaling and drops live subscriptions on restart. |

## 3. Definition of done

A Ward 21 farmer and reviewer can complete this loop on the VPS with real data, and the team can
prove it:

> phone photo + GPS → offline-safe upload → plot-linked conflict report → human review →
> opt-in notification → dashboard/export

with no duplicate observations on retry, exact coordinates restricted to permitted roles, camera
evidence reviewable, outages visible as outages, and a tested off-VPS restore.

## 4. Workstreams (8 weeks)

### W0 — Baseline and truth (days 1–3)

- [ ] Update `README.md` limits and `docs/PHASED_ROADMAP.md` statuses to match the code.
- [ ] Write `docs/PILOT_ACCEPTANCE.md` (12 testable criteria, each with a check and owner).
- [ ] Freeze pilot navigation behind `VITE_PILOT_MODE`: hide Leaderboard, VerificationGame, VoiceBot,
      Predictions, DecisionEngine, EdgeDevices, DeviceAdmin, Deterrents, ApiIntegrations,
      AI self-learning.
- [ ] Record a baseline: API p95, upload success, review turnaround, camera uptime.

### W1 — Engineering safety net (week 1)

- [ ] Add Vitest for `server/` (auth, records, camera state) and a Playwright smoke test
      (login → capture → review).
- [ ] `npm run verify` = lint + typecheck + build + tests.
- [ ] GitHub Actions workflow running `verify` on push/PR.
- [ ] `db`-only Compose profile + seed script so a fresh machine boots without production secrets.
- [ ] Fix whatever lint/typecheck surfaces on first install.

### W2 — End-to-end pilot verification (weeks 1–2)

- [ ] Run `docs/PILOT_ACCEPTANCE.md` with two roles on real phones.
- [ ] Verify: offline queue survives app close; retry creates one observation; media 403s for the
      wrong site; restart keeps data; session invalidation works.
- [ ] Backup tooling: `pg_dump` + media archive off-VPS, systemd timer, 7 daily / 4 weekly retention,
      checksums.
- [ ] Restore drill into a scratch container; record RTO/RPO.
- [ ] Add a regression test for each defect fixed.

### W3 — Camera evidence pipeline (weeks 3–4)

Decide per site how the VPS reaches the camera:

- **A — VPN / public port-forward (supported today).** Full PTZ/events on VPN; live view only on
  port-forward; fails behind CGNAT.
- **B — Push ingest (not implemented).** Camera pushes RTMP to
  `rtmp://vps:1935/cam_<camera-id>`; no inbound router rule; works behind CGNAT. Requires
  `rtmp: true`, a publish-auth branch in `/api/cameras/media-auth`, a per-camera publish key, and
  publishing port 1935. See `docs/CAMERA_PUSH_INGEST.md`.
- **C — Both, per camera.** Recommended long term.

Tasks:

- [ ] Surface `CameraEvent` in review: list/detail, pending → confirmed/rejected, site/plot link.
- [ ] Convert a confirmed `CameraEvent` into a `WildlifeObservation` (or link explicitly).
- [ ] Camera health: listener state, `last_event_at`, snapshot errors, offline alert after N minutes.
- [ ] Enforce snapshot retention (already pruned in `media.js`) and event retention.
- [ ] Push-ingest profile (option B) behind a feature flag once publish auth exists.

### W4 — Notifications and safe automation (weeks 5–6)

- [ ] Keep the DB outbox; add email and in-app channels.
- [ ] Allowlisted `AutomationRule` executor: `assign_review`, `notify_user`, `daily_digest`;
      dry-run preview, cooldown, dedupe, quiet hours, delivery receipts.
- [ ] Nepali/English templates; no precise coordinates in community messages.
- [ ] SMS/WhatsApp only with a real provider and recorded delivery results.
- [ ] Physical deterrents stay manual and audited.

### W5 — AI-assisted review and reporting (weeks 7–8)

- [ ] Async `wildlife-ai` proposals on the review queue; stored as unverified.
- [ ] Human accept/correct/unknown; every correction stored as a label.
- [ ] Reviewed-only dataset export; holdout split by site and date.
- [ ] Event-level precision/recall, reviewer agreement, model/dataset versions.
- [ ] Dashboards: completeness, crop/season, response time, camera uptime; CSV/JSON + data dictionary.

### W6 — Hardening and operations (continuous, release gate)

- [ ] Monitoring: `/api/health`, uptime probe, disk, backup age, failed uploads, notification failures.
- [ ] Secret rotation, `fail2ban`, dependency updates, log retention.
- [ ] Privacy: consent, retention enforcement, exact-coordinate access review, audio disabled.
- [ ] Quarterly restore and incident runbook (lost phone, revoked account, data export).

## 5. Defer and hide

RAG/SLM/MCP, edge-device fleet management, voice bot, gamified verification leaderboard,
prediction/decision engines, third-party API marketplace, multi-region scaling, automatic deterrents.
Keep the code, remove it from pilot navigation, label it experimental.

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Single VPS / single volume | Off-site backup + monthly restore drill; document RPO/RTO |
| CGNAT farm sites | Push-ingest profile as the default for those sites |
| Camera firmware variance (Dahua assumed) | One supported model/firmware matrix; feature-detect, fail closed |
| Scope creep from 58 routes | Pilot flag + acceptance doc gating merges |
| False AI claims | Unverified by default, human confirmation, event-level metrics |
| Sensitive imagery/coordinates | Private media, site scoping, retention, privacy masks, no audio |
| Credential leakage | Encrypted at rest, redacted logs, rotation, audit |

## 7. Success metrics

- Upload success ≥ 98% online; duplicate observations < 1%.
- API p95 < 500 ms; zero unplanned 5xx during the pilot week.
- Review turnaround < 48 h; 100% of AI-proposed labels human-decided.
- Camera outages detected < 15 min and shown as downtime, not absence.
- Restore drill RTO < 2 h, RPO ≤ 24 h.

## 8. First 7 days

1. `git switch -c pilot/hardening`
2. `npm ci` and `npm ci --prefix server`.
3. Add CI + `npm run verify`; get a green baseline.
4. Update README/roadmap; write `docs/PILOT_ACCEPTANCE.md`.
5. Snapshot the VPS; write the backup script and run it once.
6. Walk the pilot loop manually; log every defect.
7. Decide camera reachability for Ward 21 (A/B/C).

## 9. Not verified

- Runtime behavior: `node_modules` is absent in the local clone, so lint/typecheck/build/tests were
  not executed.
- Private GitHub issues and CI history.
- Live VPS content (ports 80/443/8189 are open; TLS content was not fetched from this session).
