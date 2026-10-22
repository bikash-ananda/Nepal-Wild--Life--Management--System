import React, { useState, useEffect } from "react";
import { FileBarChart, Download, TrendingUp, Target, Camera, Activity } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export default function Reports() {
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("weekly");

  useEffect(() => {
    Promise.all([
      api.entities.DetectionEvent.list("-detected_at", 500),
      api.entities.Camera.list(),
      api.entities.Sensor.list(),
    ]).then(([e, c, s]) => {
      setEvents(e); setCameras(c); setSensors(s); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Filter by period
  const now = new Date();
  const periodDays = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);
  const periodEvents = events.filter(e => new Date(e.detected_at || e.created_date) >= periodStart);

  // By site
  const bySite = {};
  periodEvents.forEach(e => { bySite[e.site_name || "Unknown"] = (bySite[e.site_name || "Unknown"] || 0) + 1; });
  const siteData = Object.entries(bySite).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // By type
  const byType = {};
  periodEvents.forEach(e => { byType[e.detection_type] = (byType[e.detection_type] || 0) + 1; });
  const typeData = Object.entries(byType).map(([name, count]) => ({ name, count }));

  // Daily trend within period
  const dayMap = {};
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = { date: d.toLocaleDateString("en", { month: "short", day: "numeric" }), detections: 0 };
  }
  periodEvents.forEach(e => {
    const key = new Date(e.detected_at || e.created_date).toISOString().slice(0, 10);
    if (dayMap[key]) dayMap[key].detections++;
  });
  const trendData = Object.values(dayMap);

  const deterrentCount = periodEvents.filter(e => e.deterrent_triggered).length;
  const confirmedCount = periodEvents.filter(e => e.status === "confirmed").length;
  const avgConfidence = periodEvents.length > 0
    ? (periodEvents.reduce((sum, e) => sum + (e.confidence || 0), 0) / periodEvents.length * 100).toFixed(0)
    : 0;

  const exportCSV = () => {
    const headers = ["Site", "Camera", "Type", "Count", "Confidence", "Deterrent", "Status", "Detected At"];
    const rows = periodEvents.map(e => [
      e.site_name || "", e.camera_name || "", e.detection_type || "", e.object_count || 1,
      ((e.confidence || 0) * 100).toFixed(0) + "%", e.deterrent_triggered ? "Yes" : "No",
      e.status || "", e.detected_at ? new Date(e.detected_at).toISOString() : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${period}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Historical detection analytics and exportable reports"
        icon={FileBarChart}
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Last 24 hours</SelectItem>
                <SelectItem value="weekly">Last 7 days</SelectItem>
                <SelectItem value="monthly">Last 30 days</SelectItem>
                <SelectItem value="yearly">Last 365 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={periodEvents.length === 0}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Target} label="Total Detections" value={periodEvents.length} tone="emerald" />
        <StatCard icon={TrendingUp} label="Confirmed" value={confirmedCount} tone="blue" />
        <StatCard icon={Activity} label="Deterrent Triggers" value={deterrentCount} tone="amber" />
        <StatCard icon={Camera} label="Avg Confidence" value={`${avgConfidence}%`} tone="default" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Detection Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="detections" stroke="#10b981" strokeWidth={2} fill="url(#trendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Detections by Site (Top 10)</h3>
          {siteData.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-10">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={siteData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Detections by Type</h3>
          {typeData.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-10">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}