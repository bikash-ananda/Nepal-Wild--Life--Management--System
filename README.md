# Nepal Wildlife Management System

Self-hosted field-research platform for wildlife observations and human–wildlife conflict, beginning with monkey crop-raiding in Pokhara Metropolitan City, Ward 21. The browser app uses a local REST API, PostgreSQL, private file storage, and a camera media relay. The field workflow supports personal mobile cameras, GPS, offline capture, and a separate connection profile for every farm camera.

## Install on desktop, Android, and iPhone

WLMS is distributed as an installable Progressive Web App (PWA) from the same HTTPS origin. No separate app server or mobile build pipeline is required for the installable web app.

- **Android:** open the site in Chrome, use the in-app Install prompt, or choose Install app / Add to Home Screen from the browser menu.
- **Windows desktop:** open the site in Edge or Chrome and choose Install this site as an app from the browser install icon/menu. The installed window behaves like a desktop app.
- **iPhone and iPad:** open the site in Safari, tap Share, choose Add to Home Screen, and confirm. iOS does not expose the same automatic install prompt as Chromium browsers, so WLMS displays these manual steps.
- **Other desktop/mobile browsers:** installation depends on that browser's PWA support; use its Install or Add to Home Screen menu when available.

The service worker checks for a new release when the app is opened or brought back into focus. A new worker takes control and WLMS displays an in-app update notice; the user can apply it with Update/reload. The app shell and queued field reports are kept separately from the versioned static cache, so applying an app update does not intentionally clear offline report data. An internet connection is required to receive new releases. iOS and browser vendors control their own installation and background-update behavior; this is not an App Store or Google Play Store listing.

## Local development

Requirements: Node.js 24 LTS and PostgreSQL 16 or newer.

1. Install the frontend packages: `npm install`.
2. Install API packages: `npm install --prefix server`.
3. Start PostgreSQL and create an empty `nepal_wildlife` database.
4. Set API variables in your shell: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `JWT_SECRET`, `APP_ORIGIN`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`.
5. Start the API with `npm run dev --prefix server`.
6. In a second terminal, run `npm run dev` and open the Vite URL.

The first API start creates the schema and bootstraps one administrator if the database has no users. Use a unique password of at least 12 characters. In development, the API allows Vite on localhost; production origins come from `APP_ORIGIN`.

## Contabo deployment

Docker Compose runs the web app, API, PostgreSQL, MediaMTX, and Caddy HTTPS proxy. Copy `.env.example` to `.env`, set unique secrets, and follow [docs/DEPLOY_CONTABO.md](docs/DEPLOY_CONTABO.md). Publish TCP 80/443, UDP 443, and UDP 8189 for browser WebRTC media. PostgreSQL, the API, and MediaMTX control API stay on private Docker networks.

The provided DNS records are `bikasheng.com.np A 169.58.25.131` and `AAAA 2a02:c207:2364:8298::1`. Caddy will request and renew HTTPS certificates after DNS resolves to the VPS and ports 80/443 are reachable. Open UDP 8189 for WebRTC media; see the deployment guide.

## Pilot behavior and current limits

- Mobile photo + GPS capture works online and queues captures in IndexedDB while offline.
- Captures upload to private server storage and become unverified observations with a human-review task.
- Optional browser push can notify users assigned to the site's account list after a reviewer confirms a monkey label. Push omits precise coordinates; VAPID keys and user opt-in are required.
- Browser push (after a reviewer confirms a monkey label) and password-reset email are the only delivery channels wired up. Generic automation rules are stored and validated but not executed; SMS, WhatsApp, and phone calls are not connected to any provider or worker.
- Optional general animal detection can be enabled as a private service; it does not identify monkeys. Reviewer-confirmed labels enter the dataset, while model training and automatic model updates remain disconnected. SMS, WhatsApp, phone calls, and physical deterrent activation are not configured.
- Public capture is rate-limited and creates an unverified review item.
- Registration is closed by default; the first admin creates accounts.
- Camera setup accepts individual RTSP/RTSPS and HLS routes, tests each stream from the VPS, encrypts camera passwords at rest, and configures a private MediaMTX path. Site-authorized users can open a short-lived WebRTC view. Router forwarding, VPN reachability, firewall rules, and the exact camera stream path still require deployment-time verification; see [docs/CAMERA_DAHUA_P3I_PV.md](docs/CAMERA_DAHUA_P3I_PV.md).
- For Dahua cameras on a private VPN route, the API subscribes to camera events, stores motion snapshots in private media, writes `CameraEvent` records, and exposes manual PTZ/siren/light endpoints. An authenticated `POST /api/v1/camera/events` webhook now accepts camera Alarm Center JPEG snapshots. These paths remain separate from verified wildlife observations and do not trigger actuators.
- The existing MediaMTX service now accepts authenticated per-camera RTMP publishing and serves HLS alongside WHEP/WebRTC. Recording is explicitly disabled. The DH-P3I-PV firmware's direct RTMP publishing capability is still unverified; see [docs/SERVER_CAMERA_SETUP.md](docs/SERVER_CAMERA_SETUP.md) for credentials, webhook setup, and daily cleanup.
- Use real records with `is_demo: false`; keep research labels human-confirmed and record capture effort/outages.

See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for research design and architecture, [docs/PHASED_ROADMAP.md](docs/PHASED_ROADMAP.md) for the staged product plan, [docs/ai-engine.md](docs/ai-engine.md) for the existing detector and learning strategy, [docs/AI_PIPELINE_ZERO_COST.md](docs/AI_PIPELINE_ZERO_COST.md) for the zero-cost AI pipeline plan and local consensus core, and [docs/CAMERA_DIRECT_CONNECTION.md](docs/CAMERA_DIRECT_CONNECTION.md) for camera routing and firmware limitations.
