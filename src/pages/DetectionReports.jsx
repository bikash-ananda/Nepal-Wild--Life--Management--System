import React, { useState, useEffect, useCallback } from "react";
import { Mail, FileSpreadsheet, Send, Calendar, TrendingUp, Target, Shield, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { generateDetectionReportCSV, getReportSummary } from "@/lib/reportGenerator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function DetectionReports() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastDownloadUrl, setLastDownloadUrl] = useState("");
  const [previewPeriod, setPreviewPeriod] = useState("weekly");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.DetectionEvent.list("-detected_at", 500),
      base44.auth.me().catch(() => null),
    ]).then(([e, user]) => {
      setEvents(e);
      if (user?.email) setUserEmail(user.email);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const summary = useCallback(() => getReportSummary(events), [events]);

  const generatePreviewData = () => {
    const s = summary();
    const periods = {
      weekly: { data: s.weekly, bucketType: "daily", bucketLabel: "Day" },
      monthly: { data: s.monthly, bucketType: "weekly", bucketLabel: "Week" },
      yearly: { data: s.yearly, bucketType: "monthly", bucketLabel: "Month" },
    };
    return periods[previewPeriod];
  };

  const buildChartFromEvents = (periodKey) => {
    const now = new Date();
    let startDate, bucketType, formatFn;

    if (periodKey === "weekly") {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0);
      bucketType = "daily";
      formatFn = (d) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
    } else if (periodKey === "monthly") {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0, 0, 0, 0);
      bucketType = "weekly";
      formatFn = (d) => `Wk of ${d.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
    } else {
      startDate = new Date(now); startDate.setFullYear(startDate.getFullYear() - 1); startDate.setHours(0, 0, 0, 0);
      bucketType = "monthly";
      formatFn = (d) => d.toLocaleDateString("en", { month: "short", year: "2-digit" });
    }

    const buckets = [];
    const cursor = new Date(startDate);
    while (cursor <= now && buckets.length < 60) {
      let bucketEnd = new Date(cursor);
      if (bucketType === "daily") { bucketEnd.setHours(23, 59, 59, 999); }
      else if (bucketType === "weekly") { bucketEnd.setDate(bucketEnd.getDate() + 6); bucketEnd.setHours(23, 59, 59, 999); }
      else { bucketEnd.setMonth(bucketEnd.getMonth() + 1, 0); bucketEnd.setHours(23, 59, 59, 999); }
      if (bucketEnd > now) bucketEnd = new Date(now);

      const bucketEvents = events.filter((e) => {
        const d = new Date(e.detected_at || e.created_date);
        return d >= cursor && d <= bucketEnd;
      });

      buckets.push({
        label: formatFn(cursor),
        Monkey: bucketEvents.filter((e) => e.detection_type === "monkey").length,
        Other: bucketEvents.filter((e) => e.detection_type !== "monkey").length,
        Total: bucketEvents.length,
      });

      if (bucketType === "daily") { cursor.setDate(cursor.getDate() + 1); cursor.setHours(0, 0, 0, 0); }
      else if (bucketType === "weekly") { cursor.setDate(cursor.getDate() + 7); cursor.setHours(0, 0, 0, 0); }
      else { cursor.setMonth(cursor.getMonth() + 1, 1); cursor.setHours(0, 0, 0, 0); }
    }
    return buckets;
  };

  const handleSendReport = async () => {
    if (!userEmail) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setSending(true);
    setSent(false);
    try {
      const csv = generateDetectionReportCSV(events);
      const fileName = `wildlife-detection-report-${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const file = new File([blob], fileName, { type: "text/csv" });

      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;
      setLastDownloadUrl(fileUrl);

      const s = summary();
      const emailBody = `
WILDLIFE DETECTION TRENDS REPORT
Generated: ${new Date().toLocaleString()}

PERIOD SUMMARY
=============
Weekly (${s.weekly.periodLabel}):  ${s.weekly.total} detections | ${s.weekly.confirmed} confirmed | ${s.weekly.deterrent} deterrents | ${s.weekly.avgConfidence}% avg confidence
Monthly (${s.monthly.periodLabel}): ${s.monthly.total} detections | ${s.monthly.confirmed} confirmed | ${s.monthly.deterrent} deterrents | ${s.monthly.avgConfidence}% avg confidence
Yearly (${s.yearly.periodLabel}):  ${s.yearly.total} detections | ${s.yearly.confirmed} confirmed | ${s.yearly.deterrent} deterrents | ${s.yearly.avgConfidence}% avg confidence

SPECIES BREAKDOWN (Last 12 Months)
=================================
${Object.entries(s.yearly.byType).filter(([, v]) => v > 0).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

DOWNLOAD FULL SPREADSHEET
=========================
The complete report with weekly, monthly, and yearly trend breakdowns, species analysis, site analysis, and detailed detection log is available at:

${fileUrl}

The file is in CSV format and opens directly in Excel, Google Sheets, or Apple Numbers.

---
Wildlife MS Admin Portal | Agentic AI Wildlife Protection Platform
`.trim();

      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `Wildlife Detection Trends Report - ${new Date().toLocaleDateString()}`,
        body: emailBody,
      });

      setSent(true);
      toast({ title: "Report sent!", description: `Spreadsheet emailed to ${userEmail}` });
    } catch (err) {
      toast({ title: "Failed to send report", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDownloadCSV = () => {
    const csv = generateDetectionReportCSV(events);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wildlife-detection-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  const s = summary();
  const chartData = buildChartFromEvents(previewPeriod);
  const periodLabels = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

  return (
    <div>
      <PageHeader
        title="Detection Trend Reports"
        description="Generate weekly, monthly & yearly wildlife detection summaries — emailed as a spreadsheet"
        icon={FileSpreadsheet}
        actions={
          <Button variant="outline" onClick={handleDownloadCSV} disabled={events.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Download CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {["weekly", "monthly", "yearly"].map((period) => {
          const data = s[period];
          const Icon = period === "weekly" ? Calendar : period === "monthly" ? TrendingUp : Target;
          return (
            <div key={period} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 capitalize">{period} Summary</div>
                  <div className="text-xs text-slate-400">{data.periodLabel}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-2">{data.total}</div>
              <div className="text-xs text-slate-500 mb-3">Total Detections</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-700">{data.confirmed}</div>
                  <div className="text-slate-400">Confirmed</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-700">{data.deterrent}</div>
                  <div className="text-slate-400">Deterrent</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-700">{data.avgConfidence}%</div>
                  <div className="text-slate-400">Avg Conf</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Trend Preview</h3>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {Object.entries(periodLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreviewPeriod(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  previewPeriod === key ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 || events.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-10">No detection data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Monkey" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Other" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Email Report Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Email Spreadsheet Report</h3>
            <p className="text-sm text-slate-500">Sends a CSV file with all three summaries, species & site breakdowns, and a detailed log</p>
          </div>
        </div>

        {sent && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-sm text-emerald-700">
              Report sent to <strong>{userEmail}</strong>. Check your inbox for the download link.
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Recipient Email</label>
            <Input
              type="email"
              value={userEmail}
              onChange={(e) => { setUserEmail(e.target.value); setSent(false); }}
              placeholder="your.email@example.com"
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSendReport}
              disabled={sending || !userEmail || events.length === 0}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-1.5" /> Generate & Email Report</>
              )}
            </Button>
          </div>
        </div>

        {events.length === 0 && (
          <div className="flex items-center gap-2 mt-4 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4" />
            No detection events found. Deploy cameras and collect data first.
          </div>
        )}

        {lastDownloadUrl && sent && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <a href={lastDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline truncate">
              {lastDownloadUrl}
            </a>
          </div>
        )}

        {/* Report Contents */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-3">SPREADSHEET CONTENTS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Weekly summary (day-by-day, 7 days)</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Monthly summary (week-by-week, 30 days)</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Yearly summary (month-by-month, 12 months)</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Species breakdown with confidence stats</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Site breakdown with per-species counts</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Full detailed detection log</div>
          </div>
        </div>
      </div>
    </div>
  );
}