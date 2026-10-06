/**
 * Generates a comprehensive multi-period wildlife detection trends CSV report.
 * Includes weekly, monthly, and yearly summaries with species/site breakdowns.
 */

const DETECTION_TYPES = ["monkey", "animal", "human", "vehicle", "wild_boar", "elephant", "leopard", "bear", "livestock"];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells) {
  return cells.map(csvEscape).join(",");
}

function getEventDate(e) {
  return new Date(e.detected_at || e.created_date);
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatMonthLabel(d) {
  return d.toLocaleDateString("en", { month: "short", year: "numeric" });
}

function dayName(d) {
  return d.toLocaleDateString("en", { weekday: "long" });
}

function typeCounts(events) {
  const counts = {};
  DETECTION_TYPES.forEach((t) => (counts[t] = 0));
  events.forEach((e) => {
    const t = e.detection_type || "animal";
    counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
}

function statusCounts(events) {
  return {
    new: events.filter((e) => (e.status || "new") === "new").length,
    confirmed: events.filter((e) => e.status === "confirmed").length,
    false_alarm: events.filter((e) => e.status === "false_alarm").length,
    resolved: events.filter((e) => e.status === "resolved").length,
  };
}

function avgConfidence(events) {
  if (events.length === 0) return 0;
  return (events.reduce((s, e) => s + (e.confidence || 0), 0) / events.length * 100).toFixed(1);
}

function buildTrendRows(events, startDate, endDate, bucketType) {
  const buckets = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    let bucketEnd = new Date(cursor);
    let label;

    if (bucketType === "daily") {
      bucketEnd.setHours(23, 59, 59, 999);
      label = formatDate(cursor);
    } else if (bucketType === "weekly") {
      bucketEnd.setDate(bucketEnd.getDate() + 6);
      bucketEnd.setHours(23, 59, 59, 999);
      label = `Week of ${formatDate(cursor)}`;
    } else if (bucketType === "monthly") {
      bucketEnd.setMonth(bucketEnd.getMonth() + 1, 0);
      bucketEnd.setHours(23, 59, 59, 999);
      label = formatMonthLabel(cursor);
    }

    if (bucketEnd > endDate) bucketEnd = new Date(endDate);

    const bucketEvents = events.filter((e) => {
      const d = getEventDate(e);
      return d >= cursor && d <= bucketEnd;
    });

    const tc = typeCounts(bucketEvents);
    const sc = statusCounts(bucketEvents);
    const deterrent = bucketEvents.filter((e) => e.deterrent_triggered).length;

    buckets.push([
      label,
      bucketType === "daily" ? dayName(cursor) : "",
      bucketEvents.length,
      tc.monkey, tc.animal, tc.human, tc.vehicle, tc.wild_boar, tc.elephant, tc.leopard, tc.bear, tc.livestock,
      sc.confirmed, sc.false_alarm, sc.resolved, sc.new,
      deterrent,
      avgConfidence(bucketEvents) + "%",
    ]);

    // Advance cursor
    if (bucketType === "daily") {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    } else if (bucketType === "weekly") {
      cursor.setDate(cursor.getDate() + 7);
      cursor.setHours(0, 0, 0, 0);
    } else if (bucketType === "monthly") {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
    }
  }

  return buckets;
}

function buildSpeciesBreakdown(events) {
  const byType = {};
  events.forEach((e) => {
    const t = e.detection_type || "animal";
    if (!byType[t]) byType[t] = [];
    byType[t].push(e);
  });

  const rows = Object.entries(byType).map(([type, evts]) => {
    const sc = statusCounts(evts);
    const sites = new Set(evts.map((e) => e.site_name).filter(Boolean));
    return [
      type,
      evts.length,
      sc.confirmed,
      sc.false_alarm,
      evts.filter((e) => e.deterrent_triggered).length,
      avgConfidence(evts) + "%",
      sites.size,
    ];
  });

  return rows.sort((a, b) => b[1] - a[1]);
}

function buildSiteBreakdown(events) {
  const bySite = {};
  events.forEach((e) => {
    const s = e.site_name || "Unknown";
    if (!bySite[s]) bySite[s] = [];
    bySite[s].push(e);
  });

  const rows = Object.entries(bySite).map(([site, evts]) => {
    const tc = typeCounts(evts);
    const sc = statusCounts(evts);
    return [
      site,
      evts.length,
      tc.monkey, tc.animal, tc.human, tc.vehicle, tc.wild_boar, tc.elephant, tc.leopard,
      sc.confirmed, sc.false_alarm,
      avgConfidence(evts) + "%",
    ];
  });

  return rows.sort((a, b) => b[1] - a[1]);
}

function buildDetailedLog(events) {
  return events.map((e) => [
    getEventDate(e).toISOString(),
    e.site_name || "",
    e.camera_name || "",
    e.detection_type || "",
    e.object_count || 1,
    ((e.confidence || 0) * 100).toFixed(0) + "%",
    e.status || "new",
    e.deterrent_triggered ? "Yes" : "No",
    e.weather || "",
    e.ai_model_version || "",
    e.action_taken || "none",
  ]);
}

export function generateDetectionReportCSV(events, reportDate = new Date()) {
  const now = reportDate;
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now); weekEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now); monthStart.setDate(monthStart.getDate() - 29); monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(weekEnd);
  const yearStart = new Date(now); yearStart.setFullYear(yearStart.getFullYear() - 1); yearStart.setHours(0, 0, 0, 0);
  const yearEnd = new Date(weekEnd);

  const weekEvents = events.filter((e) => { const d = getEventDate(e); return d >= weekStart && d <= weekEnd; });
  const monthEvents = events.filter((e) => { const d = getEventDate(e); return d >= monthStart && d <= monthEnd; });
  const yearEvents = events.filter((e) => { const d = getEventDate(e); return d >= yearStart && d <= yearEnd; });

  const lines = [];

  // Title
  lines.push(row(["WILDLIFE DETECTION TRENDS REPORT"]));
  lines.push(row(["Generated", now.toISOString()]));
  lines.push(row(["Weekly Period", `${formatDate(weekStart)} to ${formatDate(weekEnd)}`]));
  lines.push(row(["Monthly Period", `${formatDate(monthStart)} to ${formatDate(monthEnd)}`]));
  lines.push(row(["Yearly Period", `${formatDate(yearStart)} to ${formatDate(yearEnd)}`]));
  lines.push("");
  lines.push("");

  // Weekly Summary
  lines.push(row([`=== WEEKLY SUMMARY (Last 7 Days: ${formatDate(weekStart)} - ${formatDate(weekEnd)}) ===`]));
  lines.push(row(["Date", "Day", "Total", "Monkey", "Animal", "Human", "Vehicle", "Wild Boar", "Elephant", "Leopard", "Bear", "Livestock", "Confirmed", "False Alarm", "Resolved", "New", "Deterrent Triggered", "Avg Confidence"]));
  buildTrendRows(weekEvents, weekStart, weekEnd, "daily").forEach((r) => lines.push(row(r)));
  lines.push(row(["WEEKLY TOTAL", "", weekEvents.length, ...DETECTION_TYPES.map((t) => typeCounts(weekEvents)[t]), ...Object.values(statusCounts(weekEvents)), weekEvents.filter((e) => e.deterrent_triggered).length, avgConfidence(weekEvents) + "%"]));
  lines.push("");
  lines.push("");

  // Monthly Summary
  lines.push(row([`=== MONTHLY SUMMARY (Last 30 Days: ${formatDate(monthStart)} - ${formatDate(monthEnd)}) ===`]));
  lines.push(row(["Week", "", "Total", "Monkey", "Animal", "Human", "Vehicle", "Wild Boar", "Elephant", "Leopard", "Bear", "Livestock", "Confirmed", "False Alarm", "Resolved", "New", "Deterrent Triggered", "Avg Confidence"]));
  buildTrendRows(monthEvents, monthStart, monthEnd, "weekly").forEach((r) => lines.push(row(r)));
  lines.push(row(["MONTHLY TOTAL", "", monthEvents.length, ...DETECTION_TYPES.map((t) => typeCounts(monthEvents)[t]), ...Object.values(statusCounts(monthEvents)), monthEvents.filter((e) => e.deterrent_triggered).length, avgConfidence(monthEvents) + "%"]));
  lines.push("");
  lines.push("");

  // Yearly Summary
  lines.push(row([`=== YEARLY SUMMARY (Last 12 Months: ${formatDate(yearStart)} - ${formatDate(yearEnd)}) ===`]));
  lines.push(row(["Month", "", "Total", "Monkey", "Animal", "Human", "Vehicle", "Wild Boar", "Elephant", "Leopard", "Bear", "Livestock", "Confirmed", "False Alarm", "Resolved", "New", "Deterrent Triggered", "Avg Confidence"]));
  buildTrendRows(yearEvents, yearStart, yearEnd, "monthly").forEach((r) => lines.push(row(r)));
  lines.push(row(["YEARLY TOTAL", "", yearEvents.length, ...DETECTION_TYPES.map((t) => typeCounts(yearEvents)[t]), ...Object.values(statusCounts(yearEvents)), yearEvents.filter((e) => e.deterrent_triggered).length, avgConfidence(yearEvents) + "%"]));
  lines.push("");
  lines.push("");

  // Species Breakdown
  lines.push(row(["=== SPECIES BREAKDOWN (Last 12 Months) ==="]));
  lines.push(row(["Species", "Total Detections", "Confirmed", "False Alarm", "Deterrent Triggered", "Avg Confidence", "Sites Active"]));
  buildSpeciesBreakdown(yearEvents).forEach((r) => lines.push(row(r)));
  lines.push("");
  lines.push("");

  // Site Breakdown
  lines.push(row(["=== SITE BREAKDOWN (Last 12 Months) ==="]));
  lines.push(row(["Site", "Total", "Monkey", "Animal", "Human", "Vehicle", "Wild Boar", "Elephant", "Leopard", "Confirmed", "False Alarm", "Avg Confidence"]));
  buildSiteBreakdown(yearEvents).forEach((r) => lines.push(row(r)));
  lines.push("");
  lines.push("");

  // Detailed Log
  lines.push(row(["=== DETAILED DETECTION LOG (Last 12 Months) ==="]));
  lines.push(row(["Date/Time", "Site", "Camera", "Type", "Count", "Confidence", "Status", "Deterrent", "Weather", "AI Model", "Action Taken"]));
  buildDetailedLog(yearEvents).forEach((r) => lines.push(row(r)));

  return lines.join("\n");
}

export function getReportSummary(events, reportDate = new Date()) {
  const now = reportDate;
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now); weekEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now); monthStart.setDate(monthStart.getDate() - 29); monthStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(now); yearStart.setFullYear(yearStart.getFullYear() - 1); yearStart.setHours(0, 0, 0, 0);

  const weekEvents = events.filter((e) => getEventDate(e) >= weekStart && getEventDate(e) <= weekEnd);
  const monthEvents = events.filter((e) => getEventDate(e) >= monthStart && getEventDate(e) <= weekEnd);
  const yearEvents = events.filter((e) => getEventDate(e) >= yearStart && getEventDate(e) <= weekEnd);

  return {
    weekly: {
      total: weekEvents.length,
      confirmed: weekEvents.filter((e) => e.status === "confirmed").length,
      deterrent: weekEvents.filter((e) => e.deterrent_triggered).length,
      avgConfidence: avgConfidence(weekEvents),
      byType: typeCounts(weekEvents),
      periodLabel: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    },
    monthly: {
      total: monthEvents.length,
      confirmed: monthEvents.filter((e) => e.status === "confirmed").length,
      deterrent: monthEvents.filter((e) => e.deterrent_triggered).length,
      avgConfidence: avgConfidence(monthEvents),
      byType: typeCounts(monthEvents),
      periodLabel: `${formatDate(monthStart)} - ${formatDate(weekEnd)}`,
    },
    yearly: {
      total: yearEvents.length,
      confirmed: yearEvents.filter((e) => e.status === "confirmed").length,
      deterrent: yearEvents.filter((e) => e.deterrent_triggered).length,
      avgConfidence: avgConfidence(yearEvents),
      byType: typeCounts(yearEvents),
      periodLabel: `${formatDate(yearStart)} - ${formatDate(weekEnd)}`,
    },
  };
}