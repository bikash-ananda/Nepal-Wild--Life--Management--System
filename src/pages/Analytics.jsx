import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3, Download, Loader2, Filter, RefreshCw, AlertTriangle,
  Camera, UserCheck, Clock, PawPrint, MapPin, TrendingUp, Database, Brain, ShieldCheck,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const SOURCE_META = {
  camera_inference: { label: "AI-Classified", color: "#6366f1", icon: Brain },
  officer: { label: "Officer-Reported", color: "#10b981", icon: ShieldCheck },
  public: { label: "Public-Reported", color: "#f59e0b", icon: PawPrint },
};

const VERIFIED_META = {
  verified: { label: "Human-Verified", color: "#10b981" },
  pending: { label: "Pending Review", color: "#f59e0b" },
};

const selectClass =
  "px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400";

function bucketUnitFor(range) {
  if (range === "all") return "month";
  const days = Number(range);
  if (days <= 30) return "day";
  return "week";
}

function rowLabel(row, field) {
  if (field && row[field] != null) return row[field];
  const keys = Object.keys(row).filter(
    (k) => k !== "count" && !k.startsWith("sum_") && !k.startsWith("avg_") && !k.startsWith("min_") && !k.startsWith("max_")
  );
  return row[keys[0]];
}

function formatDateBucket(value, unit) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  if (unit === "month") return d.toLocaleDateString("en", { month: "short", year: "2-digit" });
  if (unit === "week") return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options
  const [provinces, setProvinces] = useState([]);
  const [speciesOptions, setSpeciesOptions] = useState([]);

  // Active filters
  const [range, setRange] = useState("30");
  const [regionFilter, setRegionFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");

  // Results
  const [sourceRows, setSourceRows] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [timeRows, setTimeRows] = useState([]);
  const [speciesRows, setSpeciesRows] = useState([]);
  const [regionRows, setRegionRows] = useState([]);
  const [totalObs, setTotalObs] = useState(0);

  const bucketUnit = bucketUnitFor(range);

  // Build the base query from active filters
  const buildQuery = useCallback(() => {
    const query = {};
    if (range !== "all") {
      const start = new Date();
      start.setDate(start.getDate() - Number(range));
      start.setHours(0, 0, 0, 0);
      query.observed_at = { $gte: start.toISOString() };
    }
    if (regionFilter !== "all") query.province = regionFilter;
    if (speciesFilter !== "all") query.species_name = speciesFilter;
    return query;
  }, [range, regionFilter, speciesFilter]);

  // Load filter option values once
  useEffect(() => {
    (async () => {
      try {
        const [{ items: provs }, { items: specs }] = await Promise.all([
          api.entities.WildlifeObservation.filter({}, { distinct: "province", limit: 100 }),
          api.entities.WildlifeObservation.filter({}, { distinct: "species_name", limit: 100 }),
        ]);
        setProvinces(provs.filter(Boolean).sort());
        setSpeciesOptions(specs.filter(Boolean).sort());
      } catch (e) {
        // non-fatal: dropdowns just stay empty
      }
    })();
  }, []);

  // Load analytics data
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = buildQuery();
    try {
      const [srcAgg, vCount, pCount, tAgg, spAgg, regAgg, total] = await Promise.all([
        api.entities.WildlifeObservation.aggregate({ query, groupBy: "source" }),
        api.entities.WildlifeObservation.count({ ...query, verified: true }),
        api.entities.WildlifeObservation.count({ ...query, verified: false }),
        api.entities.WildlifeObservation.aggregate({
          query,
          dateBucket: { field: "observed_at", unit: bucketUnit },
        }),
        api.entities.WildlifeObservation.aggregate({
          query,
          groupBy: "species_name",
          sort: "-count",
          limit: 12,
        }),
        api.entities.WildlifeObservation.aggregate({
          query,
          groupBy: "province",
          sort: "-count",
          limit: 20,
        }),
        api.entities.WildlifeObservation.count(query),
      ]);

      setSourceRows(srcAgg.rows || []);
      setVerifiedCount(vCount || 0);
      setPendingCount(pCount || 0);
      setTimeRows(tAgg.rows || []);
      setSpeciesRows(spAgg.rows || []);
      setRegionRows(regAgg.rows || []);
      setTotalObs(total || 0);
    } catch (e) {
      setError(e?.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, bucketUnit]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived data
  const sourceBreakdown = useMemo(() => {
    const map = {};
    sourceRows.forEach((r) => {
      const key = rowLabel(r, "source");
      if (key) map[key] = r.count;
    });
    return Object.entries(SOURCE_META).map(([key, meta]) => ({
      name: meta.label,
      value: map[key] || 0,
      color: meta.color,
    })).filter((d) => d.value > 0);
  }, [sourceRows]);

  const aiClassifiedCount = useMemo(
    () => sourceBreakdown.find((d) => d.name === SOURCE_META.camera_inference.label)?.value || 0,
    [sourceBreakdown]
  );

  const verificationBreakdown = useMemo(
    () => [
      { name: VERIFIED_META.verified.label, value: verifiedCount, color: VERIFIED_META.verified.color },
      { name: VERIFIED_META.pending.label, value: pendingCount, color: VERIFIED_META.pending.color },
    ].filter((d) => d.value > 0),
    [verifiedCount, pendingCount]
  );

  const timeChartData = useMemo(
    () =>
      timeRows.map((r) => ({
        label: formatDateBucket(rowLabel(r, "observed_at"), bucketUnit),
        observations: r.count,
      })),
    [timeRows, bucketUnit]
  );

  const speciesChartData = useMemo(
    () =>
      speciesRows
        .map((r) => ({ name: rowLabel(r, "species_name") || "Unknown", count: r.count }))
        .filter((d) => d.count > 0),
    [speciesRows]
  );

  const regionChartData = useMemo(
    () =>
      regionRows
        .map((r) => ({ name: rowLabel(r, "province") || "Unknown", count: r.count }))
        .filter((d) => d.count > 0),
    [regionRows]
  );

  const verificationRate = totalObs > 0 ? Math.round((verifiedCount / totalObs) * 100) : 0;
  const aiShare = totalObs > 0 ? Math.round((aiClassifiedCount / totalObs) * 100) : 0;

  const stats = [
    { label: "Total Observations", value: totalObs, sub: "in selected period", icon: Database, color: "text-slate-700", bg: "bg-slate-100" },
    { label: "AI-Classified", value: aiClassifiedCount, sub: `${aiShare}% of total`, icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Human-Verified", value: verifiedCount, sub: `${verificationRate}% verified`, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Review", value: pendingCount, sub: "awaiting verification", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ...stats.map((s) => [s.label, s.value]),
      ["", ""],
      ["Source", "Count"],
      ...sourceBreakdown.map((s) => [s.name, s.value]),
      ["", ""],
      ["Species", "Count"],
      ...speciesChartData.map((s) => [s.name, s.count]),
      ["", ""],
      ["Province", "Count"],
      ...regionChartData.map((r) => [r.name, r.count]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wildlife_analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtersActive = range !== "30" || regionFilter !== "all" || speciesFilter !== "all";

  return (
    <div>
      <PageHeader
        title="Wildlife Analytics"
        description="Real observation records by time period, region, and species — with AI-classified vs human-verified breakdowns"
        icon={BarChart3}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || !!error}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          <select value={range} onChange={(e) => setRange(e.target.value)} className={selectClass}>
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectClass}>
            <option value="all">All Regions</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className={selectClass}>
            <option value="all">All Species</option>
            {speciesOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {filtersActive && (
            <button
              onClick={() => { setRange("30"); setRegionFilter("all"); setSpeciesFilter("all"); }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-auto"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards with sample size */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
                      <Icon className={cn("w-4 h-4", s.color)} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{s.value.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
                </div>
              );
            })}
          </div>

          {totalObs === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No observations match your filters"
              description="Try widening the time range, region, or species to see analytics."
            />
          ) : (
            <>
              {/* Row 1: Observations over time + Source breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Observations Over Time
                    </div>
                    <span className="text-xs text-slate-400">N = {totalObs.toLocaleString()}</span>
                  </div>
                  {timeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={timeChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Line type="monotone" dataKey="observations" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Observations" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-16 text-center text-sm text-slate-400">No time data in this period</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-500" /> Observation Source
                    </div>
                    <span className="text-xs text-slate-400">N = {totalObs.toLocaleString()}</span>
                  </div>
                  {sourceBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                            {sourceBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {sourceBreakdown.map((d) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-slate-600">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                              {d.name}
                            </span>
                            <span className="font-semibold text-slate-800">{d.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-16 text-center text-sm text-slate-400">No source data</div>
                  )}
                </div>
              </div>

              {/* Row 2: Verification status + Top species */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verification Status
                    </div>
                    <span className="text-xs text-slate-400">N = {totalObs.toLocaleString()}</span>
                  </div>
                  {verificationBreakdown.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {verificationBreakdown.map((d) => {
                        const pct = totalObs > 0 ? Math.round((d.value / totalObs) * 100) : 0;
                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="flex items-center gap-2 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                {d.name}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {d.value.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                        {verificationRate}% of observations have been human-verified.
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-sm text-slate-400">No verification data</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-purple-500" /> Top Species
                    </div>
                    <span className="text-xs text-slate-400">{speciesChartData.length} shown</span>
                  </div>
                  {speciesChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={speciesChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Observations" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-16 text-center text-sm text-slate-400">No species data</div>
                  )}
                </div>
              </div>

              {/* Row 3: Regional distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" /> Observations by Region (Province)
                  </div>
                  <span className="text-xs text-slate-400">{regionChartData.length} provinces · N = {totalObs.toLocaleString()}</span>
                </div>
                {regionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(220, regionChartData.length * 36)}>
                    <BarChart data={regionChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Observations" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-16 text-center text-sm text-slate-400">No regional data</div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}