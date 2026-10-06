import React from "react";
import { Upload, RotateCcw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColors = {
  active: "bg-emerald-50 text-emerald-600 border-emerald-200",
  training: "bg-blue-50 text-blue-600 border-blue-200",
  validated: "bg-purple-50 text-purple-600 border-purple-200",
  deprecated: "bg-slate-50 text-slate-400 border-slate-200",
  rollback: "bg-amber-50 text-amber-600 border-amber-200",
};

export default function ModelVersionCard({ model, onDeploy, onRollback, isActive }) {
  const status = statusColors[model.status] || statusColors.active;
  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all ${isActive ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center"><Cpu className="w-4 h-4 text-slate-500" /></div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">{model.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">v{model.version}</div>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${status}`}>{model.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div><span className="text-slate-400">Accuracy:</span> <span className="font-medium text-slate-700">{model.accuracy}%</span></div>
        <div><span className="text-slate-400">False Pos:</span> <span className="font-medium text-slate-700">{model.false_positive_rate}%</span></div>
        <div><span className="text-slate-400">Samples:</span> <span className="font-medium text-slate-700">{model.training_samples?.toLocaleString()}</span></div>
        <div><span className="text-slate-400">Devices:</span> <span className="font-medium text-slate-700">{model.deployed_devices}</span></div>
      </div>
      {(model.supported_classes || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(model.supported_classes || []).map((c, i) => <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">{c}</span>)}
        </div>
      )}
      {model.changelog && <div className="text-xs text-slate-500 mb-3 line-clamp-2">{model.changelog}</div>}
      <div className="flex gap-2 pt-2 border-t border-slate-50">
        {!isActive && model.status === "validated" && (
          <Button size="sm" onClick={() => onDeploy(model)} className="bg-emerald-600 hover:bg-emerald-700"><Upload className="w-3 h-3 mr-1" /> Deploy</Button>
        )}
        {isActive && model.previous_version && (
          <Button size="sm" variant="outline" onClick={() => onRollback(model)}><RotateCcw className="w-3 h-3 mr-1" /> Rollback to v{model.previous_version}</Button>
        )}
      </div>
    </div>
  );
}