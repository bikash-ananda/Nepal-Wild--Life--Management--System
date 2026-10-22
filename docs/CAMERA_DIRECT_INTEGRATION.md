# Direct camera integration

The app uses direct camera protocols and does not use a camera-vendor cloud SDK:

1. RTSP/RTSPS feeds enter MediaMTX. The browser receives a short-lived, site-authorized WHEP/WebRTC stream through the app's `/media/` route.
2. The API uses HTTP Digest authentication for Dahua CGI event, snapshot, PTZ, siren, and light requests.
3. Camera events are stored as `CameraEvent` records. JPEGs stay in the private media volume and are removed after `CAMERA_SNAPSHOT_RETENTION_DAYS` (default 30). Camera-event ingestion is limited to one saved event per camera every 30 seconds.
4. Authenticated WebSockets send events and connection state to authorized camera viewers. The legacy SSE endpoint remains available for compatible clients. PTZ and manual deterrence actions use authenticated, role-checked REST requests in the other direction.

## Network requirements

Camera setup is per device, so cameras can have different models, stream paths, and farm routers. A camera's local address is not reachable from the Contabo VPS merely because the camera and a field PC share Wi-Fi. For CGI controls and event listening, the server needs a real private route to the camera, normally a site-to-site WireGuard VPN. Add only the routed camera subnet to `CAMERA_VPN_CIDRS`.

The Docker `camera_control` network is an internal Docker network; it does not create a VPN or route packets to a farm router. The host or a dedicated VPN gateway must provide the route and firewall/NAT rules so the API container can reach the camera. Do not forward camera HTTP port 80 or its admin UI to the public internet. RTSP public port mapping is supported by the stream setup, but controls and event listening remain disabled unless the profile uses a VPN route.

## Configure a camera

1. Reserve the camera's farm-side IP address and set up a route from the VPS before entering it in the app.
2. Create a dedicated camera user with only the required viewing and control permissions. Enter the normal camera account password, never the reset/safety code.
3. In Camera setup, enter the network route, RTSP path, credentials, and transport. Run **Test this camera from the VPS** before applying the profile.
4. Enable only the needed features. Event listening saves private snapshots and records motion/person/vehicle signals for human review. These camera signals do not establish that a monkey is present.
5. Receive-only audio is opt-in and starts muted. Manual PTZ and siren/light controls are restricted to administrators and technicians. Siren/light are never activated by AI or an event rule; siren has a 10-second server safety-off.

## Firmware compatibility

The CGI paths are a best-effort Dahua adapter. The P3I-PV product specifications confirm pan/tilt, human/vehicle detection, audio, speaker, and sound/light deterrence features, but that does not establish that every CGI endpoint or event code is enabled in every firmware build. After the server has a route to the camera, test RTSP, snapshot, event stream, PTZ, and each manual device command separately. A rejected CGI command should be treated as unsupported until the camera's firmware/API settings are confirmed.

The built-in event labels remain `camera_person`, `camera_vehicle`, and `motion`; the app does not relabel them as monkey detections. The configured general-animal model also requires a human reviewer and is not a validated monkey classifier. Voice talk-back to the camera is not implemented; WebRTC audio here is receive-only.
