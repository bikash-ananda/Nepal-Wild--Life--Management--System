
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CircleCheck,
  Copy,
  KeyRound,
  MapPin,
  Radio,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Terminal,
  WifiOff,
} from "lucide-react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import CameraSetupWizard from "@/components/cameras/CameraSetupWizard";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_RTSP_SOURCE =
  "rtsp://192.168.100.51:554/cam/realmonitor?channel=1&subtype=1";

export default function CameraDetail() {
  const { id } = useParams();

  const [camera, setCamera] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const [rtmpCredentials, setRtmpCredentials] = useState(null);
  const [generatingRtmp, setGeneratingRtmp] = useState(false);
  const [rtspSource, setRtspSource] = useState(DEFAULT_RTSP_SOURCE);

  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["admin", "technician"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);

    const [cameraResult, connectionResult, statusResult] =
      await Promise.allSettled([
        api.entities.Camera.get(id),
        canManage ? api.cameras.getConnection(id) : Promise.resolve(null),
        api.cameras.status(),
      ]);

    setCamera(
      cameraResult.status === "fulfilled" ? cameraResult.value : null
    );

    setConnection(
      connectionResult.status === "fulfilled"
        ? connectionResult.value
        : null
    );

    setStatus(
      statusResult.status === "fulfilled"
        ? statusResult.value.find((row) => row.camera_id === id) || null
        : null
    );

    setLoading(false);
  }, [id, canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const ready =
    (connection?.configured && connection.state === "configured") ||
    (status?.configured && status.state === "configured");

  const connectionState = connection?.state || status?.state;

  const ffmpegCommand = useMemo(() => {
    if (!rtmpCredentials?.publish_url) return "";

    return `ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -rw_timeout 15000000 -i "${rtspSource.trim()}" -map 0:v:0 -map 0:a? -c:v copy -c:a aac -f flv "${rtmpCredentials.publish_url}"`;
  }, [rtmpCredentials, rtspSource]);

  const retryApply = async () => {
    setRetrying(true);

    try {
      await api.cameras.apply(id);
      await load();
    } catch (error) {
      toast({
        title: "Could not apply camera route",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
    }
  };

  const generateRtmpCredentials = async () => {
    const confirmed = window.confirm(
      "Generate RTMP publishing credentials for this camera?\n\n" +
        "If credentials were generated previously, this will replace them and invalidate the old password. " +
        "The new password is displayed only once."
    );

    if (!confirmed) return;

    setGeneratingRtmp(true);
    setRtmpCredentials(null);

    try {
      const result = await api.cameras.rtmpCredentials(id);

      if (!result?.publish_url || !result?.password) {
        throw new Error("The server did not return valid RTMP credentials.");
      }

      setRtmpCredentials(result);

      toast({
        title: "RTMP credentials generated",
        description: "Copy and save the publishing details before leaving this page.",
      });

      await load();
    } catch (error) {
      toast({
        title: "Could not generate RTMP credentials",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingRtmp(false);
    }
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);

      toast({
        title: "Copied",
        description: `${label} copied to clipboard.`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access is unavailable. Select and copy the text manually.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <p className="py-20 text-center text-sm text-slate-500">
        Loading camera details…
      </p>
    );
  }

  if (!camera) {
    return (
      <p className="py-20 text-center text-sm text-slate-500">
        Camera not found.{" "}
        <Link to="/cameras" className="text-emerald-700">
          Back to cameras
        </Link>
      </p>
    );
  }

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        to="/cameras"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All cameras
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Camera className="mt-1 h-6 w-6 text-emerald-700" />

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {camera.name}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {camera.brand || "Camera"} {camera.model || ""} ·{" "}
              {camera.camera_id || camera.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ready && (
            <Button asChild variant="outline">
              <Link to={`/cameras/${camera.id}/live`}>
                <Radio className="mr-2 h-4 w-4" />
                Open live view
              </Link>
            </Button>
          )}

          {canManage && connectionState === "apply_failed" && (
            <Button
              variant="outline"
              onClick={retryApply}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : "Retry server apply"}
            </Button>
          )}

          {canManage && (
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {ready ? "Edit camera route" : "Set up camera route"}
            </Button>
          )}
        </div>
      </header>

      <section
        className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
          ready
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : connectionState === "apply_failed"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        {ready ? (
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
        ) : connectionState === "apply_failed" ? (
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        )}

        <div>
          <p className="font-medium">
            {ready
              ? "Camera route is configured"
              : connectionState === "apply_failed"
                ? "Camera needs attention"
                : "Camera route is not configured"}
          </p>

          <p className="mt-1 text-xs opacity-80">
            {ready
              ? "Live access is restricted to signed-in users with permission for this research site."
              : connection?.last_error ||
                "Add its stream route to make this camera available through the server."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Detail
          label="Research site"
          value={camera.site_name || "Not assigned"}
        />

        <Detail
          label="Ward"
          value={camera.ward ? `Pokhara ${camera.ward}` : "Not recorded"}
        />

        <Detail
          label="Connection state"
          value={
            ready
              ? connection?.online || status?.online
                ? "Live now"
                : "Configured · waiting for a viewer"
              : "Setup required"
          }
        />

        {connection?.configured && (
          <Detail
            label="Router / route"
            value={connection.network_label || "Not named"}
          />
        )}

        {connection?.configured && (
          <Detail
            label="Stream type"
            value={`${connection.protocol.toUpperCase()} · port ${connection.port}`}
          />
        )}

        {connection?.configured && (
          <Detail
            label="Camera address"
            value={`${connection.host}${connection.stream_path}`}
          />
        )}

        {connection?.configured && (
          <Detail
            label="Transport"
            value={connection.rtsp_transport?.toUpperCase() || "TCP"}
          />
        )}

        {connection?.configured && (
          <Detail
            label="Last connection test"
            value={
              connection.last_test_status === "passed"
                ? formatDate(connection.last_test_at)
                : "Not passed"
            }
          />
        )}

        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            Installation location
          </div>

          <p className="text-sm text-slate-700">
            {camera.latitude != null && camera.longitude != null
              ? `${Number(camera.latitude).toFixed(6)}, ${Number(camera.longitude).toFixed(6)}`
              : "No GPS position recorded"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {camera.installation_description || "No installation note"}
          </p>
        </div>
      </section>

      {canManage && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  RTMP live publishing
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Publish this camera's local RTSP stream to the VPS using FFmpeg.
              </p>
            </div>

            <Button
              onClick={generateRtmpCredentials}
              disabled={generatingRtmp}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {generatingRtmp ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}

              {generatingRtmp
                ? "Generating…"
                : "Generate RTMP credentials"}
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Important:</strong> The RTMP password is displayed only
            once. Copy and save the credentials before refreshing or leaving
            this page. Generating credentials again invalidates the previous
            password.
          </div>

          {rtmpCredentials && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  RTMP publishing URL
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={rtmpCredentials.publish_url}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyText(rtmpCredentials.publish_url, "Publishing URL")
                    }
                    aria-label="Copy RTMP publishing URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Detail
                  label="Publishing username"
                  value={rtmpCredentials.username}
                />

                <Detail
                  label="Stream path"
                  value={rtmpCredentials.path}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  One-time publishing password
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={rtmpCredentials.password}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyText(rtmpCredentials.password, "Password")
                    }
                    aria-label="Copy RTMP password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Terminal className="h-4 w-4" />
                  FFmpeg publishing command
                </h3>

                <label className="mb-1 block text-xs text-slate-500">
                  Local camera RTSP source
                </label>

                <input
                  value={rtspSource}
                  onChange={(event) => setRtspSource(event.target.value)}
                  placeholder="rtsp://camera-ip:554/..."
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <p className="mb-2 text-xs text-slate-500">
                  Run this command in PowerShell on a Windows PC that can
                  access the camera's local network.
                </p>

                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs leading-6 text-emerald-300">
                  {ffmpegCommand}
                </pre>

                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() =>
                    copyText(ffmpegCommand, "FFmpeg command")
                  }
                  disabled={!rtspSource.trim()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy FFmpeg command
                </Button>
              </div>

              {rtmpCredentials.note && (
                <p className="text-xs text-slate-500">
                  {rtmpCredentials.note}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">
              How publishing works
            </p>

            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5">
              <li>Generate the camera's RTMP credentials above.</li>
              <li>Copy the FFmpeg command.</li>
              <li>Run it on a PC connected to the camera's local network.</li>
              <li>Keep FFmpeg running to maintain the live stream.</li>
              <li>Open the camera's live view to check the incoming stream.</li>
            </ol>

            <p className="mt-3 text-xs text-amber-800">
              Standard RTMP on port 1935 is not encrypted. Use it only over a
              trusted network or VPN. Do not share the publishing URL or
              password publicly.
            </p>
          </div>
        </section>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Camera credentials are not displayed. Use a read-only camera account
        and keep camera administration ports private.
      </p>

      {canManage && (
        <CameraSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          sites={[
            {
              id: camera.site_id,
              name: camera.site_name,
              ward: camera.ward,
            },
          ]}
          camera={camera}
          onCreated={load}
        />
      )}
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="break-all text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Passed";
  return new Date(value).toLocaleString();
}
