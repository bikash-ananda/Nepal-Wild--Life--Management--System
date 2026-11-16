---
name: wams-development
description: "Make focused, backward-compatible changes to the WAMS React/Vite and Fastify/PostgreSQL application. Use for feature work or fixes in this repository."
---

# WAMS Development

Use the smallest relevant slice of the repository and documentation for each task; do not reread the full codebase by default.

- Keep browser requests behind `src/api/apiClient.js`; keep secrets and provider credentials on the server.
- Preserve the self-hosted React/Vite, Fastify, PostgreSQL, and cookie-auth architecture. Check existing role and site authorization before changing data routes.
- The pilot is focused on human–monkey crop conflict in Pokhara Ward 21. Treat model labels as unverified until a human reviewer confirms them, and never trigger physical deterrents automatically.
- Keep GPS capture user-initiated. Minimize exact location and personal data in notifications. Do not send report contents to an external AI or messaging provider until its destination, payload scope, and credentials are explicitly configured.
- Do not claim a notification or AI action was delivered unless a configured provider returns a recorded result. Site-based in-app alerts go only to active assigned officers and should not include report text or coordinates.
- Preserve unrelated working-tree changes. Avoid destructive database changes; document rollback before proposing a migration.
- After a meaningful change, run only relevant checks: frontend `npm test` and `npm run lint`; backend `npm test` from `server/`; run the production build when frontend code changes. Record unavailable services or environment limits accurately.
- Consult `docs/IMPLEMENTATION_STATUS.md` for the current verified boundaries; consult `docs/PHASED_ROADMAP.md` only when planning or changing pilot workflow scope.
