# Pokhara 21 farm IoT pilot

## Scope

The first deployment target is one WLMS farm/site in Pokhara Metropolitan City Ward 21. A site may own one or many ESP32 controllers. Each controller has a unique controller ID and a separate high-entropy device credential. A controller is assigned to exactly one site in the initial pilot.

Existing WLMS accounts and `app_users.site_ids` are reused. The new `farmer` role is site-scoped and can submit field reports and use the farmer device dashboard. Administrators assign a farmer to the correct site through Accounts & Site Access.

## Current software foundation

- `iot_controllers`: controller registry, site assignment, hashed device token, firmware/capability report and last-seen timestamp.
- `iot_commands`: short-lived command queue with requesting user, site, expiry, delivery and acknowledgement status.
- Admin/technician provisions a controller. The device token is returned once; only its SHA-256 hash is stored.
- A controller authenticates with `Authorization: Bearer <device-token>`.
- Controller heartbeat: `POST /api/iot/device/heartbeat`.
- Controller polls commands: `GET /api/iot/device/commands`.
- Controller acknowledges a command: `POST /api/iot/device/commands/:commandId/ack`.
- A site-authorized farmer queues a command: `POST /api/iot/controllers/:controllerId/commands`.

## Command allowlist and safety boundary

Only two manual command types are implemented in the API foundation:

- `siren`: a supervised pulse of 1–10 seconds.
- `light`: `on` or `off`.

Commands expire after 30 seconds, are delivered at most once, are rate-limited, and are scoped to the controller's assigned site. The dashboard treats a command as queued until the controller acknowledges it. A missing acknowledgement is not evidence that a physical device operated.

**Electric fence / high voltage is explicitly excluded.** No fence command, voltage parameter, relay pin, energizer interface, or automatic deterrent action is exposed by these APIs. Do not connect a high-voltage circuit to this command queue. Any future fence integration requires independent equipment identification, qualified electrical inspection, applicable standard verification, physical emergency isolation, and a separately reviewed safety design.

## Firmware protocol still required

The current ESP32 firmware must be adapted and bench-tested to:
1. store the one-time token in protected device configuration;
2. use HTTPS/TLS certificate validation;
3. send heartbeat at a controlled interval and report only supported capabilities;
4. poll the command endpoint and validate the command ID, allowlisted command and expiry;
5. execute only the approved low-risk speaker/light action with local limits;
6. send acknowledgement with a bounded result code;
7. default to no action when offline, malformed, expired or unauthenticated;
8. provide a local physical stop / disable path and avoid automatic actuation on reconnect.

No live ESP32 command execution is claimed until the exact firmware, speaker/light wiring, network path and physical response are tested on the Ward 21 installation.

## Network plan

Wi-Fi is preferred where stable. If unavailable, use a 4G/SIM router or another outbound Internet link. Controllers initiate outbound TLS connections to WLMS; do not expose ESP32 web servers or device ports directly to the public Internet. If the Internet is unavailable, remote commands cannot be delivered; the local controller must remain in a safe, non-surprising state.

## Pilot acceptance

- A farmer assigned to Site A sees only controllers assigned to Site A.
- A farmer assigned to Site A receives 403 when attempting a Site B controller command.
- A controller token cannot be retrieved from the API after provisioning; only its hash is stored.
- Missing, disabled or incorrect device credentials are rejected.
- Offline controllers cannot accept new commands.
- Commands expire after 30 seconds and cannot be replayed after acknowledgement.
- Siren duration is capped at 10 seconds; unsupported commands, including electric fence, are rejected.
- Device heartbeat, firmware version, capabilities and last-seen time are visible.
- No command is represented as successful until a controller acknowledgement is received.
- Test the complete path on the actual Ward 21 farm before enabling farmer accounts for physical controls.
