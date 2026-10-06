import React, { useState } from "react";
import { Video, MapPin, Clock, Camera, Brain, ChevronDown, ChevronUp, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfidenceTierBadge, { getConfidenceTier } from "./ConfidenceTierBadge";
import BoundingBoxEditor from "./BoundingBoxEditor";
import PrivateImage from "@/components/PrivateImage";
import ExplainableAIPanel from "./ExplainableAIPanel";
import MultiStageVerification from "./MultiStageVerification";

const verificationOptions = [
  "Monkey", "Wild Boar", "Elephant", "Leopard", "Bear",
  "Human", "Livestock", "Dog", "Bird", "Unknown Animal",
  "False Detection", "Other"
];

export default function VerificationCard({ sample, onVerify, index }) {
  const [boxes, setBoxes] = useState(sample.bounding_boxes || []);
  const [showExplainable, setShowExplainable] = useState(false);
  const [showBBox, setShowBBox] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  if (!sample) return null;
  const conf = Math.round((sample.ai_confidence || 0) * 100);
  const tier = getConfidenceTier(sample.ai_confidence);

  const handleVerify = (label) => {
    onVerify(sample, label, boxes);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className={cn("inline-flex items-center gap-1.5 text-sm font-semibold mb-1", tier.color === "red" ? "text-red-600" : tier.color === "amber" ? "text-amber-600" : "text-emerald-600")}>
          <span className={cn("w-2 h-2 rounded-full animate-pulse", tier.color === "red" ? "bg-red-500" : tier.color === "amber" ? "bg-amber-500" : "bg-emerald-500")} />
          {tier.desc}
        </div>
        <div className="text-lg font-bold text-slate-800">Please identify this object.</div>
        <div className="mt-1"><ConfidenceTierBadge confidence={sample.ai_confidence} /></div>
      </div>

      {/* Image / Video */}
      <div className="relative rounded-xl overflow-hidden mb-3 bg-slate-100">
        {sample.video_url ? (
          <video src={sample.video_url} controls className="w-full h-64 object-cover" poster={sample.image_url} />
        ) : (
          <PrivateImage fileUri={sample.image_url} alt="Detection" className="w-full h-64 object-cover" />
        )}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
          AI: <span className="font-semibold">{sample.ai_label}</span> · {conf}%
        </div>
        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
          <Camera className="w-3 h-3" /> {sample.camera_name || sample.camera_id || "Unknown"}
        </div>
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm">
          {sample.site_name || "Unknown Site"}
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1"><Camera className="w-3 h-3" /> Camera ID</div>
          <div className="font-medium text-slate-700 truncate">{sample.camera_id || "CAM-001"}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS</div>
          <div className="font-medium text-slate-700 truncate">{sample.latitude ? `${sample.latitude.toFixed(4)}, ${sample.longitude?.toFixed(4)}` : "N/A"}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Date/Time</div>
          <div className="font-medium text-slate-700 truncate">{new Date(sample.captured_at || sample.created_date || Date.now()).toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1"><Brain className="w-3 h-3" /> AI Confidence</div>
          <div className="font-medium text-slate-700">{conf}%</div>
        </div>
      </div>

      {/* Bounding Box Toggle */}
      <button
        onClick={() => setShowBBox(!showBBox)}
        className="w-full flex items-center justify-between bg-slate-50 rounded-lg p-2.5 mb-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        <span className="flex items-center gap-1.5"><PenTool className="w-3.5 h-3.5 text-emerald-500" /> {showBBox ? "Hide" : "Draw"} Bounding Box</span>
        {showBBox ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showBBox && (
        <div className="mb-3">
          <BoundingBoxEditor imageUrl={sample.image_url} initialBoxes={boxes} onChange={setBoxes} />
        </div>
      )}

      {/* Multi-Stage Verification */}
      <div className="mb-3">
        <MultiStageVerification sample={sample} confidenceScore={sample.ai_confidence} />
      </div>

      {/* Explainable AI Toggle */}
      <button
        onClick={() => setShowExplainable(!showExplainable)}
        className="w-full flex items-center justify-between bg-purple-50 rounded-lg p-2.5 mb-3 text-xs font-medium text-purple-600 hover:bg-purple-100"
      >
        <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> {showExplainable ? "Hide" : "Show"} Explainable AI Details</span>
        {showExplainable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showExplainable && <div className="mb-3"><ExplainableAIPanel sample={sample} /></div>}

      {/* Verification Options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {verificationOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => handleVerify(opt)}
            className={cn(
              "py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95",
              opt === "False Detection"
                ? "border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600"
                : opt === "Other"
                ? "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-500"
                : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700"
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Custom label input for "Other" */}
      <div className="mt-2">
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Or type a custom label..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400"
        />
        {customLabel && (
          <button
            onClick={() => handleVerify(customLabel)}
            className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            Confirm: {customLabel}
          </button>
        )}
      </div>
    </div>
  );
}