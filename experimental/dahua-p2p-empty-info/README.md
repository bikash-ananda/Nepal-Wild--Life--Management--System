# Experimental Dahua P2P empty-Info compatibility test

This is an isolated experiment for the DH-P31-PV firmware that returns a successful /info/device/<serial> response with an empty Info element.

## Finding

The upstream dh-fwd code currently fails closed when the DMSS Type-1 profile cannot decode a RandSalt from the Info blob. The Python dh-p2p reference implementation documents a valid firmware variant where an empty Info element means the device has no RandSalt: derive the Type-1 key with an empty salt and omit the RandSalt element from the authentication XML.

The patch here makes only that distinction:
- Empty but present Info element: continue with empty salt.
- Missing Info element or missing response: still fail closed.
- Non-empty but invalid encrypted Info: still fail closed.
- Non-empty RandSalt: preserve existing behaviour.

## Build

Build from this directory on the VPS or another Docker host:

    docker build -t wildlife-dh-fwd:empty-info-test .

The Docker build runs the upstream Go test suite plus the added empty-Info tests.

## Isolated runtime

Use the existing secret env file on the VPS; do not print it or put its values in shell history. The test container must be separate from wildlife-dh-tunnel and must not be added to production Compose.

Create it on the existing Wildlife edge network and attach it to the internal camera-control network with an unused IP. Do not reuse the production tunnel's IP. The container exposes only TCP 8554 on the Docker network; it does not publish a host port.

Required environment variable names:
- CAMERA_P2P_SERIAL
- CAMERA_P2P_USERNAME
- CAMERA_P2P_PASSWORD

The container uses the DMSS profile and forces the UDP relay data path. It bridges the RTSP port to TCP 8554 for MediaMTX to consume. It does not expose camera HTTP 80 or Dahua private port 37777.

## Acceptance test

A successful process start is not success. Confirm all of the following:

1. The test container remains running without a restart loop.
2. Logs show P2P authentication and relay setup completed.
3. TCP port 8554 is reachable from the Wildlife API/MediaMTX Docker network.
4. An RTSP-over-TCP client completes DESCRIBE, SETUP and PLAY.
5. RTSP interleaved RTP packets arrive and the byte counter increases.
6. MediaMTX reports the test path as ready.
7. An authorized Wildlife browser session can view the stream.

Use a short, time-limited test and remove only the test container afterwards. Do not restart or modify the production tunnel, MediaMTX, Caddy, PostgreSQL, or other projects during this experiment.

## Important limitation

This bridge uses the Dahua P2P cloud and is reverse-engineered third-party software. It is experimental, not an official Dahua API or a production support commitment. The RTSP bridge has to be verified on this exact camera, account/cloud profile, firmware and farm network. The P2P relay path may be unavailable for some devices or accounts.

The bridge is not yet wired into the Wildlife API or dashboard. That integration must be a separate additive change after the RTSP data-plane acceptance test succeeds.
