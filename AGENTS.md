# Project instructions

## Product context

- This is the Nepal Wildlife Management System.
- First study: human–monkey crop-raiding in Pokhara Metropolitan City, Ward 21.
- First deployment target: Contabo VPS at `169.58.25.131`, domain `bikasheng.com.np`.
- Personal mobile cameras, GPS, and offline sync are supported. Camera streaming uses an optional, separate connection profile per camera; event-triggered evidence collection is a later phase.

## Architecture

- `src/` is the React/Vite frontend. `src/api/apiClient.js` is its same-origin REST boundary.
- `server/` contains the Fastify API, PostgreSQL schema, authentication, records, and private media uploads.
- `docker-compose.yml`, `Caddyfile`, and the Dockerfiles define VPS deployment. Keep PostgreSQL, API, and MediaMTX control ports private; publish application HTTPS and the configured WebRTC UDP media port only.
- Keep frontend requests on the API adapter. Never add hosted-backend SDKs or provider secrets to the browser.
- Use environment variables for secrets. Never commit `.env`, passwords, tokens, camera credentials, or RTSP URLs containing credentials.

## Research and safety

- Keep the first pilot focused on Ward 21 observations, crop-raiding context, farmer-reported impact, review, and response timelines.
- Use `is_demo: false` for real study records. Do not mix demo and research data in reports.
- Treat AI labels as unverified until a human reviewer confirms them. No trained monkey classifier is available yet.
- Do not activate physical deterrents automatically during the research pilot. No high-voltage, relay, siren, light, RF, or other actuator control belongs in the pilot workflow.
- Minimize collection of people and private spaces. Disable audio for the image-only study and define retention/access before field deployment.
- Preserve capture time, coordinates/accuracy, media checksum, idempotency ID, and upload/review status.
- Do not claim that SMS, push notifications, phone calls, or AI predictions were delivered or executed unless the corresponding provider/worker is configured and its result is recorded.
