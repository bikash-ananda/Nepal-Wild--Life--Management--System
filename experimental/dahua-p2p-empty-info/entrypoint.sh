#!/bin/sh
set -eu

: "${CAMERA_P2P_SERIAL:?CAMERA_P2P_SERIAL is required}"
: "${CAMERA_P2P_USERNAME:?CAMERA_P2P_USERNAME is required}"
: "${CAMERA_P2P_PASSWORD:?CAMERA_P2P_PASSWORD is required}"

# dh-fwd remains loopback-only inside this container.
# Expose only the RTSP bridge on the isolated Docker camera network.
socat TCP-LISTEN:8554,bind=0.0.0.0,reuseaddr,fork TCP:127.0.0.1:11554 &

exec /usr/local/bin/dh-fwd "$CAMERA_P2P_SERIAL" \
  --port 11554:554 \
  --type 1 \
  --username "$CAMERA_P2P_USERNAME" \
  --password "$CAMERA_P2P_PASSWORD" \
  --app dmss \
  --relay \
  --reconnect
