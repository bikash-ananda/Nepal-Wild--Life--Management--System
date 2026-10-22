import React, { useState, useEffect, useMemo } from "react";
import { Scale, Check, MapPin, Activity, Camera, Battery, Signal } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line
} from "recharts";

const siteColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
const speciesKeys = ["monkey", "animal", "human", "vehicle", "wild_boar", "elephant", "leopard", "bear"];
const speciesColors = {
  monkey: "#10b981", animal: "#3b82f6", human: "#f59e0b", vehicle: "#8b5cf6",
  wild_boar: "#8b5cf6", elephant: "#6366f1", leopard: "#f97316", bear: "#78350f",
};

function computeHealthScore(sensors, cameras) {
  const allDevices = [
    ...sensors.map((s) => ({ status: s.status })),
    ...cameras.map((c) => ({ status: c.online_status })),
  ];
  if (allDevices.length === 0) return 0;
  const onlineRatio = allDevices.filter((d) => d.status === "online").length / allDevices.length;
  const sensorsWithBattery = sensors.filter((s) => s.battery_level != null);
  const avgBattery = sensorsWithBattery.length > 0
    ? sensorsWithBattery.reduce((sum, s) => sum + s.battery_level, 0) / sensorsWithBattery.length / 100
    : 1;
  const sensorsWithSignal = sensors.filter((s) => s.signal_strength != null);
  const avgSignal = sensorsWithSignal.length > 0
    ? sensorsWithSignal.reduce((sum, s) => sum + s.signal_strength, 0) / sensorsWithSignal.length / 100
    : 1;
  return Math.round(onlineRatio * 40 + avgBattery * 30 + avgSignal * 30);
}

function healthColor(score) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50";
  if (score >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export default function SiteComparison() {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    Promise.all([
      api.entities.Site.list("-created_date", 200),
      api.entities.DetectionEvent.list("-detected_at", 500),
      api.entities.Sensor.list("-created_date", 200),
      api.entities.Camera.list("-created_date", 200),
    ]).then(([siteList, eventList, sensorList, cameraList]) => {
      setSites(siteList);
      setEvents(eventList);
      setSensors(sensorList);
      setCameras(cameraList);
      // Auto-select first 3 sites for immediate comparison
      setSelectedIds(siteList.slice(0, 3).map((s) => s.id));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSite = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const comparisonData = useMemo(() => {
    return selectedIds.map((id) => {
      const site = sites.find((s) => s.id === id);
      const siteEvents = events.filter((e) => e.site_id === id);
      const siteSensors = sensors.filter((s) => s.site_id === id);
      const siteCameras = cameras.filter((c) => c.site_id === id);

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekEvents = siteEvents.filter((e) => new Date(e.detected_at || e.created_date) >= weekStart);

      // Detections by type
      const byType = {};
      weekEvents.forEach((e) => {
        byType[e.detection_type] = (byType[e.detection_type] || 0) + 1;
      });

      // Daily counts for last 7 days
      const dailyCounts = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + (6 - i));
        dailyCounts[d.toISOString().slice(0, 10)] = 0;
      }
      weekEvents.forEach((e) => {
        const key = new Date(e.detected_at || e.created_date).toISOString().slice(0, 10);
        if (key in dailyCounts) dailyCounts[key]++;
      });

      // Sensor stats
      const onlineSensors = siteSensors.filter((s) => s.status === "online").length;
      const sensorsWithBattery = siteSensors.filter((s) => s.battery_level != null);
      const avgBattery = sensorsWithBattery.length > 0
        ? Math.round(sensorsWithBattery.reduce((sum, s) => sum + s.battery_level, 0) / sensorsWithBattery.length)
        : null;
      const sensorsWithSignal = siteSensors.filter((s) => s.signal_strength != null);
      const avgSignal = sensorsWithSignal.length > 0
        ? Math.round(sensorsWithSignal.reduce((sum, s) => sum + s.signal_strength, 0) / sensorsWithSignal.length)
        : null;

      // Sensor types
      const typeMap = {};
      siteSensors.forEach((s) => {
        typeMap[s.sensor_type] = (typeMap[s.sensor_type] || 0) + 1;
      });

      const onlineCameras = siteCameras.filter((c) => c.online_status === "online").length;
      const score = computeHealthScore(siteSensors, siteCameras);

      return {
        site,
        totalDetections: weekEvents.length,
        detectionRate: (weekEvents.length / 7).toFixed(1),
        byType,
        dailyCounts,
        sensorStats: {
          total: siteSensors.length,
          online: onlineSensors,
          avgBattery,
          avgSignal,
          types: typeMap,
        },
        cameraStats: {
          total: siteCameras.length,
          online: onlineCameras,
        },
        healthScore: score,
      };
    });
  }, [selectedIds, sites, events, sensors, cameras]);

  // Chart data: detection rate by species
  const barChartData = comparisonData.map((c) => ({
    site: c.site?.name?.slice(0, 12) || "—",
    ...Object.fromEntries(speciesKeys.map((k) => [k, c.byType[k] || 0])),
  }));

  // Chart data: daily trend (multi-line, one per site)
  const trendData = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const point = { date: d.toLocaleDateString("en", { weekday: "short", day: "numeric" }) };
      comparisonData.forEach((c) => {
        point[c.site?.name?.slice(0, 12) || "—"] = c.dailyCounts[key] || 0;
      });
      data.push(point);
    }
    return data;
  }, [comparisonData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Site Comparison"
        description="Compare detection rates and sensor health across multiple sites side-by-side"
        icon={Scale}
      />

      {/* Site Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Select Sites to Compare</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(sites.map((s) => s.id))}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Clear
            </button>
          </div>
        </div>
        {sites.length === 0 ? (
          <EmptyState icon={MapPin} title="No sites available" description="Register sites to enable comparison." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {sites.map((site) => {
              const selected = selectedIds.includes(site.id);
              return (
                <button
                  key={site.id}
                  onClick={() => toggleSite(site.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
                    selected
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center border",
                    selected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                  )}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {site.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.length === 0 ? (
        <EmptyState icon={Scale} title="Select at least one site" description="Choose sites above to see side-by-side comparison." />
      ) : (
        <>
          {/* Comparison Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Comparison Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Metric</th>
                    {comparisonData.map((c, i) => (
                      <th key={c.site?.id} className="text-left px-5 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: siteColors[i % siteColors.length] }} />
                          {c.site?.name || "—"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Detections (7 days)</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3 font-semibold text-slate-800">{c.totalDetections}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Detection Rate / day</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3 text-slate-700">{c.detectionRate}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Sensors Online</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3">
                        <span className={cn(
                          "font-medium",
                          c.sensorStats.total > 0 && c.sensorStats.online === c.sensorStats.total
                            ? "text-emerald-600"
                            : c.sensorStats.online < c.sensorStats.total
                            ? "text-amber-600"
                            : "text-slate-400"
                        )}>
                          {c.sensorStats.online}/{c.sensorStats.total}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Cameras Online</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3">
                        <span className={cn(
                          "font-medium",
                          c.cameraStats.total > 0 && c.cameraStats.online === c.cameraStats.total
                            ? "text-emerald-600"
                            : c.cameraStats.online < c.cameraStats.total
                            ? "text-amber-600"
                            : "text-slate-400"
                        )}>
                          {c.cameraStats.online}/{c.cameraStats.total}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Avg Battery</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3 text-slate-700">
                        {c.sensorStats.avgBattery != null ? `${c.sensorStats.avgBattery}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Avg Signal</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3 text-slate-700">
                        {c.sensorStats.avgSignal != null ? `${c.sensorStats.avgSignal}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-600">Health Score</td>
                    {comparisonData.map((c) => (
                      <td key={c.site?.id} className="px-5 py-3">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold", healthColor(c.healthScore))}>
                          {c.healthScore}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Detection Rate by Species</h3>
              {barChartData.length === 0 || comparisonData.every((c) => c.totalDetections === 0) ? (
                <EmptyState icon={Activity} title="No detections in selected sites" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="site" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {speciesKeys.filter((k) => comparisonData.some((c) => c.byType[k] > 0)).map((k) => (
                      <Bar key={k} dataKey={k} stackId="a" fill={speciesColors[k]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Daily Detection Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {comparisonData.map((c, i) => (
                    <Line
                      key={c.site?.id}
                      type="monotone"
                      dataKey={c.site?.name?.slice(0, 12) || "—"}
                      stroke={siteColors[i % siteColors.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sensor Health Cards Side-by-Side */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Sensor Health by Site</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {comparisonData.map((c, i) => (
                <div key={c.site?.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: siteColors[i % siteColors.length] }} />
                      <h4 className="font-semibold text-slate-800 text-sm truncate">{c.site?.name}</h4>
                    </div>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", healthColor(c.healthScore))}>
                      {c.healthScore}
                    </span>
                  </div>

                  {/* Sensor Status Dots */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Sensors</span>
                      <span>{c.sensorStats.online}/{c.sensorStats.total} online</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: c.sensorStats.total || 0 }).map((_, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            idx < c.sensorStats.online ? "bg-emerald-500" : "bg-slate-300"
                          )}
                        />
                      ))}
                      {c.sensorStats.total === 0 && <span className="text-xs text-slate-400">No sensors</span>}
                    </div>
                  </div>

                  {/* Battery */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</span>
                      <span className="font-medium text-slate-700">{c.sensorStats.avgBattery != null ? `${c.sensorStats.avgBattery}%` : "—"}</span>
                    </div>
                    {c.sensorStats.avgBattery != null && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            c.sensorStats.avgBattery > 50 ? "bg-emerald-500" : c.sensorStats.avgBattery > 20 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${c.sensorStats.avgBattery}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Signal */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1"><Signal className="w-3 h-3" /> Signal</span>
                      <span className="font-medium text-slate-700">{c.sensorStats.avgSignal != null ? `${c.sensorStats.avgSignal}%` : "—"}</span>
                    </div>
                    {c.sensorStats.avgSignal != null && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            c.sensorStats.avgSignal > 60 ? "bg-emerald-500" : c.sensorStats.avgSignal > 30 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${c.sensorStats.avgSignal}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Camera Status */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Cameras</span>
                    <span className="font-medium text-slate-700">{c.cameraStats.online}/{c.cameraStats.total} online</span>
                  </div>

                  {/* Sensor Types */}
                  {Object.keys(c.sensorStats.types).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-400 mb-1.5">Sensor Types</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(c.sensorStats.types).map(([type, count]) => (
                          <span key={type} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                            {type.replace(/_/g, " ")} · {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}