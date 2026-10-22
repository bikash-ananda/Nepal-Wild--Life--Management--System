import React, { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera, Target, AlertTriangle, TrendingUp, Zap, Cpu,
  Brain, ChevronRight, AlertOctagon, Users, Leaf
} from "lucide-react";
import { api } from "@/api/apiClient";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import SeverityBadge from "@/components/SeverityBadge";
import EmptyState from "@/components/EmptyState";
import LiveMapPreview from "@/components/LiveMapPreview";
import ObservationIncidentMap from "@/components/ObservationIncidentMap";
import LocationSelector from "@/components/LocationSelector";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion/MotionKit";
const WildlifeHero3D = lazy(() => import("@/components/3d/WildlifeHero3D"));

const detectionTypeColors = {
  monkey: "#10b981",
  animal: "#3b82f6",
  human: "#f59e0b",
  vehicle: "#8b5cf6",
  wild_boar: "#8b5cf6",
  elephant: "#6366f1",
  leopard: "#f97316",
  bear: "#78350f",
  livestock: "#84cc16",
};

const speciesEmoji = {
  monkey: "🐒",
  animal: "🐾",
  human: "🧍",
  vehicle: "🚗",
  wild_boar: "🐗",
  elephant: "🐘",
  leopard: "🐆",
  bear: "🐻",
  livestock: "🐄",
};

function getEventSeverity(e) {
  if (e.deterrent_triggered && (e.confidence || 0) > 0.85) return "critical";
  if ((e.confidence || 0) > 0.8) return "high";
  if ((e.confidence || 0) > 0.6) return "warning";
  return "info";
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState("kaski");
  const [stats, setStats] = useState({
    activeAlerts: 0, todayDetections: 0, farmsMonitored: 0,
    devicesOnline: 0, devicesTotal: 0, activeReactions: 0,
    aiConfidence: 0, teamMembers: 0, cameras: 0, activeDeterrents: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [observations, setObservations] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => {
    Promise.all([
      api.entities.Camera.list("-created_date", 200),
      api.entities.Sensor.list("-created_date", 200),
      api.entities.EdgeDevice.list("-created_date", 200),
      api.entities.Device.list("-created_date", 200),
      api.entities.DetectionEvent.list("-detected_at", 100),
      api.entities.Alert.filter({ acknowledged: false }, "-triggered_at", 50),
      api.entities.Site.list("-created_date", 200),
      api.entities.AIModel.filter({ status: "active" }),
      api.entities.TeamMember.list("-created_date", 200),
      api.entities.WildlifeObservation.list("-observed_at", 80),
      api.entities.HwcCase.list("-occurred_at", 80),
    ]).then(([cameras, sensors, edgeDevices, devices, events, alerts, siteList, aiModels, teamMembers, obsList, hwcList]) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayDetections = events.filter((e) => new Date(e.detected_at || e.created_date) >= todayStart).length;

      const allDevices = [
        ...cameras.map((c) => ({ status: c.online_status === "online" ? "online" : "offline", category: c.ai_detection ? "camera" : "cctv" })),
        ...sensors.map((s) => ({ status: s.status === "online" ? "online" : "offline", category: "sensor" })),
        ...edgeDevices.map((e) => ({ status: e.online_status === "online" ? "online" : "offline", category: "gateway" })),
        ...devices.map((d) => ({ status: d.status === "online" && d.enabled ? "online" : "offline", category: d.category })),
      ];
      const devicesOnline = allDevices.filter((d) => d.status === "online").length;
      const devicesTotal = allDevices.length;

      const alertSiteIds = new Set(alerts.map((a) => a.site_id).filter(Boolean));
      const farmsAtRisk = alertSiteIds.size;

      const activeReactions = events.filter(
        (e) => e.deterrent_triggered && new Date(e.detected_at || e.created_date) >= yesterday
      ).length;

      const activeModel = aiModels.find((m) => m.status === "active") || aiModels[0];
      const aiConfidence = activeModel?.accuracy || 0;

      const activeCameras = cameras.filter((c) => c.online_status === "online").length;
      const activeDeterrents = devices.filter((d) => d.category === "deterrent" && d.status === "online" && d.enabled).length;

      const dayMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + (6 - i));
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = {
          date: d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
          detections: 0,
          confirmed: 0,
        };
      }
      events.forEach((e) => {
        const dt = new Date(e.detected_at || e.created_date);
        const key = dt.toISOString().slice(0, 10);
        if (dayMap[key]) {
          dayMap[key].detections++;
          if (e.status === "confirmed") dayMap[key].confirmed++;
        }
      });
      setChartData(Object.values(dayMap));

      const typeCount = {};
      events.forEach((e) => {
        typeCount[e.detection_type] = (typeCount[e.detection_type] || 0) + 1;
      });
      setTypeBreakdown(Object.entries(typeCount).map(([name, value]) => ({ name, value })));

      setStats({
        activeAlerts: alerts.length,
        todayDetections,
        farmsMonitored: siteList.length,
        farmsAtRisk,
        devicesOnline,
        devicesTotal,
        activeReactions,
        aiConfidence,
        teamMembers: teamMembers.length,
        cameras: activeCameras,
        activeDeterrents,
      });
      setRecentEvents(events.slice(0, 8));
      setObservations(obsList);
      setActiveIncidents(hwcList.filter((h) => h.status !== "resolved" && h.status !== "closed"));
      setCriticalAlerts(alerts.filter((a) => a.severity === "critical" || a.severity === "high").slice(0, 5));
      setSites(siteList);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <FadeIn className="mb-6">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
          <div className="absolute inset-0 opacity-70">
            <Suspense fallback={null}>
              <WildlifeHero3D />
            </Suspense>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 lg:p-8">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 backdrop-blur flex items-center justify-center flex-shrink-0 border border-emerald-400/30">
                <Target className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Wildlife Management Platform</h1>
                <p className="text-sm text-emerald-100/80 mt-0.5">Real-time situational awareness across your monitoring network</p>
              </div>
            </div>
            <LocationSelector value={location} onChange={setLocation} />
          </div>
        </div>
      </FadeIn>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Critical Alerts — Immediate Action Required</h3>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <Link
                key={alert.id}
                to="/notifications"
                className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-red-100 hover:border-red-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SeverityBadge severity={alert.severity} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{alert.title}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {alert.site_name || "Unknown site"} · {alert.message}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">
                    {alert.triggered_at
                      ? new Date(alert.triggered_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards — Row 1 */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StaggerItem><Link to="/detections"><StatCard icon={Target} label="Wildlife Detected" value={stats.todayDetections} tone="emerald" sublabel="today" /></Link></StaggerItem>
        <StaggerItem><Link to="/notifications"><StatCard icon={AlertTriangle} label="Active Alerts" value={stats.activeAlerts} tone={stats.activeAlerts > 0 ? "red" : "default"} sublabel="unacknowledged" /></Link></StaggerItem>
        <StaggerItem><Link to="/sites"><StatCard icon={Leaf} label="Farms Monitored" value={stats.farmsMonitored} tone="blue" sublabel={stats.farmsAtRisk > 0 ? `${stats.farmsAtRisk} at risk` : "all clear"} /></Link></StaggerItem>
        <StaggerItem><Link to="/devices"><StatCard icon={Cpu} label="Devices Online" value={`${stats.devicesOnline}/${stats.devicesTotal}`} tone="emerald" sublabel="connected" /></Link></StaggerItem>
      </StaggerContainer>

      {/* KPI Cards — Row 2 */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" stagger={0.05}>
        <StaggerItem><Link to="/cameras"><StatCard icon={Camera} label="Active Cameras" value={stats.cameras} tone="amber" sublabel="online cameras" /></Link></StaggerItem>
        <StaggerItem><Link to="/deterrents"><StatCard icon={Zap} label="Active Deterrents" value={stats.activeDeterrents} tone="blue" sublabel="response devices" /></Link></StaggerItem>
        <StaggerItem><Link to="/ai-models"><StatCard icon={Brain} label="AI Confidence" value={`${stats.aiConfidence}%`} tone="emerald" sublabel="active model" /></Link></StaggerItem>
        <StaggerItem><Link to="/team"><StatCard icon={Users} label="Field Team" value={stats.teamMembers} tone="default" sublabel="active members" /></Link></StaggerItem>
      </StaggerContainer>

      {/* Live Map + Detection Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <LiveMapPreview sites={sites} detections={recentEvents} alerts={criticalAlerts} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Detection Activity</h3>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="detections" stroke="#10b981" strokeWidth={2} fill="url(#detGrad)" name="Detections" />
              <Area type="monotone" dataKey="confirmed" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} name="Confirmed" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detection Types</h4>
            {typeBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {typeBreakdown.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: detectionTypeColors[item.name] || "#94a3b8" }} />
                      <span className="capitalize text-slate-600">{item.name.replace(/_/g, " ")}</span>
                    </div>
                    <span className="font-medium text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field Activity Map — Observations & HWC Incidents */}
      <div className="mb-6">
        <ObservationIncidentMap sites={sites} observations={observations} incidents={activeIncidents} />
      </div>

      {/* Wildlife Event Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Recent Wildlife Events</h3>
          <Link to="/detections" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200">
            <EmptyState icon={Target} title="No wildlife events yet" description="Wildlife detections from connected cameras and sensors will appear here." action={<Link to="/device-setup" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Add Device</Link>} />
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" stagger={0.06}>
            {recentEvents.map((e) => {
              const sev = getEventSeverity(e);
              const sevBorder = { critical: "border-red-300", high: "border-orange-300", warning: "border-amber-200", info: "border-slate-200" }[sev];
              return (
                <StaggerItem key={e.id}>
                <div className={`bg-white rounded-2xl border-2 ${sevBorder} p-4 hover:shadow-lg transition-all`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{speciesEmoji[e.detection_type] || "🐾"}</span>
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">{e.detection_type?.replace(/_/g, " ")}</div>
                        <div className="text-xs text-slate-400">{e.site_name || "Unknown farm"}</div>
                      </div>
                    </div>
                    <SeverityBadge severity={sev} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                      <div className="text-slate-400">Confidence</div>
                      <div className="font-semibold text-slate-700">{((e.confidence || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                      <div className="text-slate-400">Detected</div>
                      <div className="font-semibold text-slate-700">{timeAgo(e.detected_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    {e.deterrent_triggered && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">
                        <Zap className="w-3 h-3" /> Deterrent Triggered
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <StatusBadge status={e.status} />
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/detections" className="flex-1 text-center px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors">
                      View Event
                    </Link>
                    <Link to="/sites" className="flex-1 text-center px-2 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors">
                      View Farm
                    </Link>
                  </div>
                </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </div>
  );
}
