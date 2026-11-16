#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

readonly repo_dir=/opt/nepal-wildlife
readonly compose_file=/opt/nepal-wildlife/docker-compose.vps.yml
readonly expected_repo=bikash-ananda/nepal-wild--life--management--system
readonly public_repo=https://github.com/bikash-ananda/Nepal-Wild--Life--Management--System.git
readonly required_base=1e38d7d5b5db04692e2a999b1aee3430ca51e2ec
readonly state_dir=/var/lib/wams-auto-deploy
readonly backup_root=/root/wams-backups/nepal-wildlife/auto-deploy
retry=0

log() {
  local message="$1"
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$message" >&2
  logger -t wams-auto-deploy -- "$message" 2>/dev/null || true
}

fail() {
  log "ERROR: $1"
  exit 1
}

if [[ "$(id -u)" -ne 0 ]]; then
  fail "Run this helper as root."
fi

if [[ "$#" -eq 1 && "$1" == "--retry" ]]; then
  retry=1
elif [[ "$#" -ne 0 ]]; then
  fail "Usage: wams-auto-deploy [--retry]"
fi

exec 9>/run/lock/wams-auto-deploy.lock
if ! flock -n 9; then
  log "Another WAMS deploy check is running; skipping this tick."
  exit 0
fi

if [[ ! -d "$repo_dir/.git" || ! -f "$compose_file" ]]; then
  fail "The expected WAMS checkout or VPS Compose file is missing."
fi

origin_url="$(git -C "$repo_dir" remote get-url origin)" || fail "Could not read the WAMS origin."
origin_path="$(printf '%s' "$origin_url" | sed -E 's#^(https://github\.com/|http://github\.com/|git@github\.com:|ssh://git@github\.com/)##; s#\.git$##; s#/$##')"
origin_path_lower="$(printf '%s' "$origin_path" | tr '[:upper:]' '[:lower:]')"
if [[ "$origin_path_lower" != "$expected_repo" ]]; then
  fail "Stopped: origin does not match the approved WAMS repository."
fi

branch="$(git -C "$repo_dir" branch --show-current)"
if [[ "$branch" != main ]]; then
  fail "Stopped: the WAMS checkout is not on main."
fi
if ! git -C "$repo_dir" diff-index --quiet HEAD --; then
  fail "Stopped: tracked WAMS files have local edits; review them before deploying."
fi

if ! git -C "$repo_dir" fetch --quiet --no-tags "$public_repo" main; then
  fail "Could not fetch the public WAMS main branch."
fi
target="$(git -C "$repo_dir" rev-parse --verify 'FETCH_HEAD^{commit}')" || fail "Could not resolve fetched WAMS main."
current="$(git -C "$repo_dir" rev-parse --verify HEAD)" || fail "Could not resolve the WAMS checkout."
if ! git -C "$repo_dir" merge-base --is-ancestor "$required_base" "$target"; then
  fail "Stopped: fetched main does not contain the approved WAMS baseline."
fi
if ! git -C "$repo_dir" merge-base --is-ancestor "$current" "$target"; then
  fail "Stopped: GitHub main is not a fast-forward from this WAMS checkout."
fi

install -d -o root -g root -m 700 "$state_dir"
last_success="$(cat "$state_dir/last-success" 2>/dev/null || true)"
last_attempt="$(cat "$state_dir/last-attempt" 2>/dev/null || true)"

if [[ "$retry" -eq 1 ]]; then
  rm -f "$state_dir/last-attempt"
  last_attempt=""
fi
if [[ "$last_success" == "$target" ]]; then
  log "WAMS main $target is already deployed."
  exit 0
fi
if [[ "$last_attempt" == "$target" ]]; then
  log "WAMS main $target previously failed; inspect the journal and run 'wams-auto-deploy --retry' after fixing the cause."
  exit 0
fi

if ! docker compose -f "$compose_file" config --quiet; then
  fail "The WAMS VPS Compose configuration is invalid."
fi
services="$(docker compose -f "$compose_file" config --services)" || fail "Could not list WAMS Compose services."
for service in db api web; do
  if ! grep -Fxq "$service" <<<"$services"; then
    fail "The WAMS Compose file is missing the required $service service."
  fi
done
if ! docker compose -f "$compose_file" ps --status running --services db | grep -Fxq db; then
  fail "The WAMS database is not running; no source or container changes were made."
fi
if ! docker compose -f "$compose_file" ps --status running --services api | grep -Fxq api; then
  fail "The WAMS API is not running; no source or container changes were made."
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
short_target="$(printf '%.12s' "$target")"
backup_dir="$backup_root/$stamp-$short_target"
install -d -o root -g root -m 700 /root/wams-backups /root/wams-backups/nepal-wildlife "$backup_root" "$backup_dir"

log "Saving WAMS database and media backups to $backup_dir."
if ! docker compose -f "$compose_file" exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$backup_dir/postgres.sql"; then
  fail "WAMS database backup failed; deployment stopped."
fi
if ! docker compose -f "$compose_file" exec -T api sh -lc 'test -d /data/media && tar -czf - -C /data/media .' > "$backup_dir/media.tar.gz"; then
  fail "WAMS media backup failed; deployment stopped."
fi
if [[ ! -s "$backup_dir/postgres.sql" || ! -s "$backup_dir/media.tar.gz" ]] || ! tar -tzf "$backup_dir/media.tar.gz" >/dev/null; then
  fail "WAMS backup validation failed; deployment stopped."
fi
chmod 600 "$backup_dir/postgres.sql" "$backup_dir/media.tar.gz"

printf '%s\n' "$target" > "$state_dir/last-attempt.tmp"
chmod 600 "$state_dir/last-attempt.tmp"
mv -f "$state_dir/last-attempt.tmp" "$state_dir/last-attempt"

if [[ "$current" != "$target" ]]; then
  if ! git -C "$repo_dir" merge --ff-only "$target"; then
    fail "WAMS fast-forward stopped; backups are preserved at $backup_dir."
  fi
fi

log "Building and updating only the WAMS api and web services."
if ! docker compose -f "$compose_file" up -d --build --no-deps api web; then
  fail "WAMS api/web update failed; backups are preserved at $backup_dir. No automatic rollback was attempted."
fi

healthy=0
for attempt in {1..60}; do
  if docker compose -f "$compose_file" ps --status running --services web | grep -Fxq web &&
     docker compose -f "$compose_file" exec -T api node -e 'fetch("http://127.0.0.1:3000/api/health",{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" -ne 1 ]]; then
  fail "WAMS API/web health check failed; backups are preserved at $backup_dir. No automatic rollback was attempted."
fi

printf '%s\n' "$target" > "$state_dir/last-success.tmp"
chmod 600 "$state_dir/last-success.tmp"
mv -f "$state_dir/last-success.tmp" "$state_dir/last-success"
rm -f "$state_dir/last-attempt"
log "WAMS deployment succeeded at $target. Backups are preserved at $backup_dir."
