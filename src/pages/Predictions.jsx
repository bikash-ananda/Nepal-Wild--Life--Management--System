import React, { useState, useEffect } from "react";
import { Brain, TrendingUp, Clock, Navigation, AlertCircle } from "lucide-react";
import { api } from "@/api/apiClient";
import PageHeader from "@/components/PageHeader";
import RiskMeter from "@/components/RiskMeter";
import EmptyState from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const animalLabels = {
  monkey: { label: "Monkey", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  wild_boar: { label: "Wild Boar", color: "bg-amber-50 text-amber-700 border-amber-200" },
  elephant: { label: "Elephant", color: "bg-blue-50 text-blue-700 border-blue-200" },
  leopard: { label: "Leopard", color: "bg-purple-50 text-purple-700 border-purple-200" },
  bear: { label: "Bear", color: "bg-orange-50 text-orange-700 border-orange-200" },
  animal: { label: "Animal", color: "bg-slate-50 text-slate-700 border-slate-200" },
  human: { label: "Human", color: "bg-red-50 text-red-700 border-red-200" },
  livestock: { label: "Livestock", color: "bg-teal-50 text-teal-700 border-teal-200" },
};

const statusConfig = {
  active: { label: "Active", color: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500 animate-pulse" },
  fulfilled: { label: "Fulfilled", color: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  expired: { label: "Expired", color: "bg-slate-50 text-slate-400 border-slate-200", dot: "bg-slate-300" },
  cancelled: { label: "Cancelled", color: "bg-slate-50 text-slate-400 border-slate-200", dot: "bg-slate-300" },
};

export default function Predictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  const load = async () => {
    const p = await api.entities.Prediction.list("-predicted_at", 50);
    setPredictions(p); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? predictions : predictions.filter(p => p.status === filter);
  const active = predictions.filter(p => p.status === "active");
  const avgRisk = active.length > 0 ? Math.round(active.reduce((s, p) => s + (p.risk_score || 0), 0) / active.length) : 0;
  const highRisk = active.filter(p => p.risk_score >= 75).length;

  return (
    <div>
      <PageHeader title="Predictions" description="Forecasts from configured and evaluated models only" icon={Brain} />

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No validated Ward 21 forecasting model is connected yet. This page will show model outputs only; it will not create simulated predictions or recommend physical deterrents.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-[10px] uppercase text-slate-400 font-medium">Active Predictions</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{active.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-[10px] uppercase text-slate-400 font-medium">High Risk (≥75)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{highRisk}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-[10px] uppercase text-slate-400 font-medium">Avg Risk Score</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{avgRisk}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-[10px] uppercase text-slate-400 font-medium">Total Predictions</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{predictions.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200"><EmptyState icon={Brain} title="No model predictions" description="Predictions will appear here after a model is trained and evaluated on approved local research data." /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => {
            const animal = animalLabels[p.animal_type] || animalLabels.animal;
            const status = statusConfig[p.status] || statusConfig.active;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${animal.color}`}>{animal.label}</span>
                    {p.animal_count > 1 && <span className="text-xs text-slate-500">×{p.animal_count}</span>}
                    <span className="text-xs text-slate-400">· {p.site_name}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
                  </div>
                </div>

                {/* AI summary line */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-700">
                  <span className="font-medium">{animal.label}{p.animal_count > 1 ? ` troop of ${p.animal_count}` : ""}</span> has a{" "}
                  <span className="font-bold text-slate-800">{Math.round(p.probability * 100)}%</span> probability of entering the{" "}
                  <span className="font-medium">{p.direction}</span> area within{" "}
                  <span className="font-bold text-slate-800">{p.estimated_arrival_minutes} minutes</span>.
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500"><Navigation className="w-3.5 h-3.5" /> {p.direction}</div>
                  <div className="flex items-center gap-1.5 text-slate-500"><TrendingUp className="w-3.5 h-3.5" /> {p.speed_kmh} km/h</div>
                  <div className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3.5 h-3.5" /> {p.estimated_arrival_minutes}m</div>
                </div>

                {p.route_description && <p className="text-xs text-slate-400 mb-3">Route: {p.route_description}</p>}

                <div className="space-y-2 mb-3">
                  <RiskMeter score={p.risk_score} label="Risk Score" />
                  <RiskMeter score={p.crop_damage_probability * 100} label="Crop Damage Probability" />
                </div>

                {p.recommended_action && (
                  <div className="flex items-start gap-2 bg-emerald-50 rounded-lg p-2.5 text-xs text-emerald-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{p.recommended_action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
