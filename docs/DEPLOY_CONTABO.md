# Deploy on the Contabo VPS

The Compose stack serves the SPA and API on one origin, stores application records in PostgreSQL, stores private images in a named volume, relays camera streams through MediaMTX, and terminates HTTPS with Caddy. The API, database, and MediaMTX control API have no published host ports.

## DNS and firewall

Configure the domain at the DNS provider using the supplied Contabo nameservers:

| Type | Name | Value |
|---|---|---|
| A | `@` / `bikasheng.com.np` | `169.58.25.131` |
| AAAA | `@` / `bikasheng.com.np` | `2a02:c207:2364:8298::1` |

The target is the Contabo Linux VPS `vmi3648298`. Before starting Caddy, confirm the A and AAAA records resolve to it and allow inbound TCP 80/443. The Compose stack also publishes UDP 443 for HTTP/3 and UDP 8189 for WebRTC media. Keep SSH restricted to the administrator's management network where possible. Never publish MediaMTX API port 9997 or camera RTSP ports on the VPS.

## First deployment

1. Install Docker Engine and the Docker Compose plugin on the VPS.
2. Clone this repository to a deployment directory and enter that directory.
3. Copy `.env.example` to `.env`.
4. Generate independent strong values for `POSTGRES_PASSWORD`, `JWT_SECRET`, `CAMERA_ENCRYPTION_KEY`, and `MEDIAMTX_API_PASSWORD`. Run `openssl rand -base64 48` for the database and JWT secrets, `openssl rand -base64 32` for the camera encryption key, and `openssl rand -hex 32` for the MediaMTX API password. Paste the results into `.env` without sharing them. Keep both camera keys stable and backed up separately; changing `CAMERA_ENCRYPTION_KEY` makes stored camera passwords unreadable. Set `BOOTSTRAP_ADMIN_EMAIL` and a unique password of at least 12 characters.
5. Set `APP_ORIGIN=https://bikasheng.com.np`. Keep `ALLOW_SELF_REGISTRATION=false` for the pilot. Configure SMTP only if password-reset emails and report emails should be sent.
6. Optional browser push: from the API directory, generate VAPID keys with `npx web-push generate-vapid-keys`. Put the public key in `VAPID_PUBLIC_KEY`, the private key in `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT` to a monitored `mailto:` address. Keep these keys stable; do not publish the private key. Leave them blank to keep push disabled.
7. Leave `CAMERA_VPN_CIDRS` blank unless a site-to-site VPN is configured. When it is, add only the camera subnets routed through the VPN as comma-separated IPv4 CIDRs.
8. Restrict `.env` permissions: `chmod 600 .env`.
9. Validate Compose without printing the expanded environment: `docker compose config --quiet`.
10. Build and start the stack: `docker compose up -d --build`.
11. Check service status: `docker compose ps`. Check API health at `https://bikasheng.com.np/api/health` after DNS and certificate setup complete.
12. Sign in with the bootstrap administrator account, then create named user accounts with the least access needed. Assign each farmer/researcher account only to sites they should receive alerts for.

Caddy obtains and renews certificates automatically for the configured public hostname. It needs public DNS to resolve to this VPS and inbound ports 80 and 443 to reach Caddy. If first startup occurs before DNS propagation, the app may start but HTTPS issuance will need to retry after DNS is corrected.

## Updates

Back up PostgreSQL and the media volume first. Then update the checkout and run:

```sh
docker compose up -d --build
docker compose ps
```

The API runs the additive SQL schema migration on startup. Keep an off-VPS backup and test restoring both database and media before treating backups as reliable. Do not run destructive volume cleanup commands against production.

## Pilot security and operations

- Keep `.env` out of Git and limit VPS access. Do not put API secrets or camera credentials in `VITE_*` variables.
- PostgreSQL and API traffic is private to the Compose networks; Caddy is the public web entry point. MediaMTX control is on a private Docker network and requires a separate random service password.
- Browser signaling uses `https://bikasheng.com.np/media/`; WebRTC video media uses UDP 8189. If client networks block UDP, playback may require a separately configured TURN service.
- Each camera has independent route settings, so farm routers may use different DDNS names, mapped ports, or VPN LAN addresses. Public port forwarding should allowlist VPS source `169.58.25.131` where supported. Never expose camera admin interfaces or open camera ports to all internet hosts.
- Camera setup supports RTSP/RTSPS and HLS over HTTP/HTTPS. Use a dedicated read-only account. The server tests the route before saving; passwords are encrypted with `CAMERA_ENCRYPTION_KEY` and never returned to the browser.
- Cookie sessions are HttpOnly, Secure in production, same-site, and invalidated when a password is reset or account is disabled.
- Private images require an authenticated session. Keep backups encrypted and access-controlled because photos and precise farm coordinates can be sensitive.
- Set privacy masks, disable camera audio for the image-only pilot, define retention, and avoid collecting household/private-space footage.
- Research labels remain unverified until a reviewer confirms them. No AI model or actuator controller is enabled by this stack.
- If VAPID keys are configured, browser push is available only to signed-in users assigned to the observation site who opt in. A reviewer-confirmed monkey report queues a generic site alert without exact coordinates. SMS, WhatsApp, email notifications, and a general-purpose rule engine remain unconnected.
- Keep physical deterrents, high-voltage equipment, relays, sirens, lights, and RF devices disconnected from automatic rules during this pilot. Use human decisions and non-harmful field procedures.

## Camera setup boundary

The connection profile and live-stream relay are implemented, but farm router reachability, credentials, exact stream path, DNS, firewall rules, and browser playback must be tested after deployment. This connector does not subscribe to camera events, download snapshots automatically, detect monkeys, or send camera commands. Those require firmware-specific validation and separate supervised implementation. No physical deterrent or actuator is controlled by this app.
