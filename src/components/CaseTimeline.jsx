import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";

const STATUS_FLOW = {
  incident: ["reported", "verified", "assigned", "in_progress", "resolved", "closed"],
  hwc: ["reported", "verified", "assigned", "in_progress", "resolved", "closed"],
  rescue: ["reported", "verified", "assigned", "in_progress", "resolved", "closed"],
  observation: ["reported", "verified", "rejected"],
};

export default function CaseTimeline({ caseType, caseId, currentStatus, onStatusChange }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.entities.ResponseAction.filter({ case_type: caseType, case_id: caseId }, "timestamp")
      .then(setActions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [caseId]);

  const addAction = async (actionType, description, statusChange) => {
    setSubmitting(true);
    try {
      const me = await api.auth.me().catch(() => null);
      await api.entities.ResponseAction.create({
        case_type: caseType,
        case_id: caseId,
        action_type: actionType,
        action_description: description,
        performed_by: me?.id || "",
        performed_by_name: me?.full_name || me?.email || "System",
        status_change: statusChange || "",
        notes: note,
        timestamp: new Date().toISOString(),
      });
      if (statusChange && onStatusChange) onStatusChange(statusChange);
      setNote("");
      setNewStatus("");
      load();
      toast({ title: "Action recorded", variant: "success" });
    } catch {
      toast({ title: "Failed to record action", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const flow = STATUS_FLOW[caseType] || STATUS_FLOW.incident;
  const nextStatuses = flow.filter((s) => s !== currentStatus);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Case Timeline</h3>

      {/* Status update + comment */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Change status…" />
          </SelectTrigger>
          <SelectContent>
            {nextStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 h-9" />
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={submitting || (!newStatus && !note)}
          onClick={() => {
            if (newStatus) addAction("comment", `Status → ${newStatus.replace(/_/g, " ")}`, newStatus);
            else addAction("comment", note);
          }}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" /> Add
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading timeline…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-slate-400">No actions recorded yet.</p>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200" />
          {[...actions].reverse().map((a) => (
            <div key={a.id} className="relative mb-4 last:mb-0">
              <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              <div className="text-xs text-slate-400">
                {new Date(a.timestamp).toLocaleString()} · {a.performed_by_name || "System"}
              </div>
              <div className="text-sm text-slate-700 font-medium">
                {a.status_change ? `Status → ${a.status_change.replace(/_/g, " ")}` : a.action_description || a.action_type}
              </div>
              {a.notes && <div className="text-xs text-slate-500 mt-0.5">{a.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}