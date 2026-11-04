#!/usr/bin/env bash
# Starts one dh-fwd tunnel per camera and bridges it onto the private camera_control network.
#
# Config file lines:  serial|device_user|device_password|tunnel_port|bridge_port|profile
#   tunnel_port  loopback port inside this container (dh-fwd always binds 127.0.0.1)
#   bridge_port  port the API connects to (must be inside CAMERA_P2P_PORT_RANGE)
#   profile      dmss (default) or smartpss: the app the camera was registered with
# Only the camera's HTTP port 80 is forwarded. Never forward RTSP, 37777 or admin ports from here.
set -u
CONF="${P2P_CONF:-/run/p2p/cameras.conf}"
[ -r "$CONF" ] || { echo "Missing $CONF" >&2; exit 78; }

fail() { echo "Invalid line in $CONF: $1" >&2; kill $(jobs -p) 2>/dev/null; exit 78; }
count=0
while IFS='|' read -r serial user pass tport bport profile || [ -n "${serial:-}" ]; do
  case "${serial:-}" in ''|\#*) continue ;; esac
  profile="${profile:-dmss}"
  [[ "$serial" =~ ^[A-Za-z0-9]{6,32}$ ]] || fail "serial"
  [[ "$tport" =~ ^[0-9]{4,5}$ && "$bport" =~ ^[0-9]{4,5}$ ]] || fail "ports"
  [ "$tport" -ge 1024 ] && [ "$bport" -ge 1024 ] && [ "$tport" -ne "$bport" ] || fail "ports"
  [[ "$profile" == "dmss" || "$profile" == "smartpss" ]] || fail "profile"
  [ -n "$user" ] && [ -n "$pass" ] || fail "credentials"

  dh-fwd "$serial" -p "${tport}:80" -t 1 -c "${user}:${pass}" --app "$profile" -rc </dev/null &
  socat "TCP-LISTEN:${bport},fork,reuseaddr" "TCP:127.0.0.1:${tport}" &
  count=$((count + 1))
done < "$CONF"

[ "$count" -gt 0 ] || { echo "No cameras configured in $CONF" >&2; exit 78; }
echo "dh-fwd bridge running for $count camera(s)"
wait -n
echo "A tunnel process exited; restarting container" >&2
kill $(jobs -p) 2>/dev/null
exit 1
