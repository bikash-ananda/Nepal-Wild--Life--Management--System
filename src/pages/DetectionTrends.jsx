import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Filter, Loader2, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const SPECIES_OPTIONS = [
  { value: "all", label: "All Species" },
  { value: "monkey", label: "Monkey" },
  { value: "animal", label: "Animal" },
  { value: "human", label: "Human" },
  { value: "vehicle", label: "Vehicle" },
  { value: "wild_boar", label: "Wild Boar" },
  { value: "elephant", label: "Elephant" },
  { value: "leopard", label: "Leopard" },
  { value: "bear", label: "Bear" },
  { value: "livestock", label: "Livestock" },
];

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
];

const speciesColors = {
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

const selectClass = "px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400";

export default function DetectionTrends() {
  const [detections, setDetections] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [range, setRange] = useState(14);

  useEffect(() => {
    Promise.all([
      base44.entities.DetectionEvent.list("-detected_at", 500),
      base44.entities.Site.list("-created_date", 200),
    ]).then(([d, s]) => {
      setDetections(d);
      setSites(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startDate = new Date(todayStart);
    startDate.setDate(startDate.getDate() - (range - 1));

    const days = [];
    for (let i = 0; i < range; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d,
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      });
    }

    const filtered = detections.filter((e) => {
      if (speciesFilter !== "all" && e.detection_type !== speciesFilter) return false;
      if (siteFilter !== "all" && e.site_id !== siteFilter) return false;
      const dt = new Date(e.detected_at || e.created_date);
      return dt >= startDate && dt <= new Date(todayStart.getTime() + 86400000);
    });

    // When "all species" selected, show a line per species that has data; otherwise single line
    const seriesKeys = speciesFilter === "all"
      ? [...new Set(filtered.map((e) => e.detection_type))].sort()
      : [speciesFilter];

    const byDay = days.map((day) => {
      const row = { label: day.label };
      seriesKeys.forEach((sp) => {
        row[sp] = filtered.filter((e) => {
          const dt = new Date(e.detected_at || e.created_date);
          return dt.toISOString().slice(0, 10) === day.key && e.detection_type === sp;
        }).length;
      });
      return row;
    });

    return { data: byDay, seriesKeys };
  }, [detections, speciesFilter, siteFilter, range]);

  const totalDetections = useMemo(() => {
    return chartData.data.reduce((sum, d) => sum + chartData.seriesKeys.reduce((s, k) => s + (d[k] || 0), 0), 0);
  }, [chartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Detection Trends"
        description="Daily wildlife detection events filtered by species and site location"
        icon={TrendingUp}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters:</span>
        </div>
        <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className={selectClass}>
          {SPECIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className={selectClass}>
          <option value="all">All Sites</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={range} onChange={(e) => setRange(Number(e.target.value))} className={selectClass}>
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Detections</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{totalDetections}</div>
          <div className="text-xs text-slate-400 mt-0.5">in selected period</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Daily Average</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{range > 0 ? (totalDetections / range).toFixed(1) : 0}</div>
          <div className="text-xs text-slate-400 mt-0.5">per day</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Species Shown</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{chartData.seriesKeys.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">{speciesFilter === "all" ? "all detected" : "filtered"}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Daily Detection Events</h3>
        {totalDetections === 0 ? (
          <EmptyState
            icon={Target}
            title="No detections match your filters"
            description="Try changing the species, site, or date range to see detection trends."
          />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(value, name) => [value, name.replace(/_/g, " ")]}
              />
              <Legend formatter={(value) => value.replace(/_/g, " ")} wrapperStyle={{ fontSize: 12 }} />
              {chartData.seriesKeys.map((sp) => (
                <Line
                  key={sp}
                  type="monotone"
                  dataKey={sp}
                  stroke={speciesColors[sp] || "#94a3b8"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={sp}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}