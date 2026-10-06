import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const gatewayUrl = (secrets.get("MEDIA_GATEWAY_URL") || "").replace(/\/$/, "");
    const gatewayKey = secrets.get("MEDIA_GATEWAY_API_KEY");
    const authHeaders = gatewayKey ? { Authorization: `Bearer ${gatewayKey}` } : {};

    // ---- TEST CONNECTION ----
    if (action === 'testConnection') {
      const { rtsp_url, ip_address, username, password, main_stream_url, sub_stream_url } = body;
      const steps = [];

      // 1. Gateway availability
      if (!gatewayUrl) {
        return Response.json({
          success: false,
          step: 'gateway',
          message: 'WebRTC media gateway is not configured. Set MEDIA_GATEWAY_URL in environment variables before connecting cameras.'
        });
      }
      try {
        const g = await fetch(`${gatewayUrl}/v3/version`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
        if (!g.ok) throw new Error('gateway responded HTTP ' + g.status);
        steps.push({ step: 'gateway', status: 'ok', message: 'WebRTC media gateway reachable.' });
      } catch (e) {
        return Response.json({
          success: false,
          step: 'gateway',
          message: `Cannot reach media gateway at ${gatewayUrl}. ${e.message}`
        });
      }

      // 2. Network / host resolution
      const primaryUrl = main_stream_url || rtsp_url;
      let host = ip_address;
      if (!host && primaryUrl) {
        try { host = new URL(primaryUrl).hostname; } catch { host = null; }
      }
      if (!host) {
        return Response.json({ success: false, step: 'network', message: 'No IP address or RTSP URL provided.' });
      }
      steps.push({ step: 'network', status: 'ok', message: `Camera host: ${host}` });

      // 3. RTSP stream probe via gateway
      if (!primaryUrl) {
        return Response.json({ success: false, step: 'rtsp', message: 'RTSP URL is required.' });
      }
      // Build authenticated RTSP URL if credentials supplied separately
      let probeUrl = primaryUrl;
      if (username && password && !primaryUrl.includes('@')) {
        try {
          const u = new URL(primaryUrl);
          u.username = username;
          u.password = password;
          probeUrl = u.toString();
        } catch { /* keep original */ }
      }
      try {
        const probe = await fetch(`${gatewayUrl}/v3/rtsp/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ url: probeUrl }),
          signal: AbortSignal.timeout(9000)
        });
        if (probe.status === 401) {
          return Response.json({
            success: false,
            step: 'auth',
            message: 'Camera reachable but RTSP authentication failed. Check the username and password.'
          });
        }
        if (probe.status === 404 || probe.status === 400) {
          return Response.json({
            success: false,
            step: 'stream',
            message: 'Camera connected but stream is unavailable. Verify the RTSP path and stream format.'
          });
        }
        if (!probe.ok) {
          return Response.json({
            success: false,
            step: 'stream',
            message: `Stream probe failed (HTTP ${probe.status}).`
          });
        }
        steps.push({ step: 'rtsp', status: 'ok', message: 'RTSP stream available and authenticated.' });
        steps.push({ step: 'format', status: 'ok', message: 'Stream format accepted by gateway.' });
      } catch (e) {
        return Response.json({
          success: false,
          step: 'rtsp',
          message: `RTSP probe error: ${e.message}`
        });
      }

      return Response.json({ success: true, message: 'Camera connected successfully.', steps });
    }

    // ---- GET STREAM TOKEN (WebRTC WHEP session) ----
    if (action === 'getStreamToken') {
      const { camera_id, stream_type = 'main' } = body;
      if (!gatewayUrl) {
        return Response.json({ error: 'Media gateway not configured. Set MEDIA_GATEWAY_URL.' }, { status: 503 });
      }
      const cameras = await base44.entities.Camera.filter({ camera_id });
      const camera = cameras[0];
      if (!camera) return Response.json({ error: 'Camera not found' }, { status: 404 });

      const streamPath = `cam_${camera_id}_${stream_type}`;
      const sourceUrl = stream_type === 'sub'
        ? (camera.sub_stream_url || camera.rtsp_url)
        : (camera.main_stream_url || camera.rtsp_url);
      if (!sourceUrl) {
        return Response.json({ error: 'No RTSP source configured for this camera.' }, { status: 400 });
      }

      // Register the RTSP source as a MediaMTX path (idempotent)
      try {
        await fetch(`${gatewayUrl}/v3/config/paths/add/${streamPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ source: sourceUrl, sourceProtocol: 'tcp' }),
          signal: AbortSignal.timeout(5000)
        });
      } catch { /* path may already exist */ }

      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await base44.entities.StreamSession.create({
        camera_id: camera.id,
        camera_name: camera.name,
        session_token: token,
        stream_type,
        stream_path: streamPath,
        whep_endpoint: `${gatewayUrl}/${streamPath}`,
        ice_servers: [{ urls: 'stun:stun.l.google.com:19302' }],
        status: 'active',
        expires_at: expires
      });

      return Response.json({
        session_token: token,
        stream_path: streamPath,
        whep_endpoint: `${gatewayUrl}/${streamPath}`,
        ice_servers: [{ urls: 'stun:stun.l.google.com:19302' }],
        expires_at: expires
      });
    }

    // ---- HEARTBEAT (stream health update) ----
    if (action === 'heartbeat') {
      const { camera_id, stream_status, latency_ms, fps, resolution } = body;
      const cameras = await base44.entities.Camera.filter({ camera_id });
      const camera = cameras[0];
      if (!camera) return Response.json({ error: 'Camera not found' }, { status: 404 });
      await base44.entities.Camera.update(camera.id, {
        stream_status,
        latency_ms,
        fps,
        resolution,
        last_frame_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        online_status: stream_status === 'online' ? 'online' : 'degraded'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}