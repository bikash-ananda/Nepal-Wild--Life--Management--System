const authorizedOfficeRoles = new Set(["field_officer", "government_officer"]);

export function prepareOfficeAlerts(entity, report, reporter, recipients) {
  if (!["Incident", "HwcCase"].includes(entity) || !report.site_id) return [];
  const id = String(report.id || "");
  const href = entity === "Incident" ? `/incidents/${encodeURIComponent(id)}` : `/hwc/${encodeURIComponent(id)}`;
  return recipients
    .filter((recipient) => authorizedOfficeRoles.has(recipient.role)
      && String(recipient.id) !== String(reporter.id)
      && (recipient.site_ids || []).map(String).includes(String(report.site_id)))
    .map((recipient) => ({
      recipient_user_id: String(recipient.id),
      site_id: String(report.site_id),
      title: entity === "Incident" ? "New wildlife incident report" : "New human–wildlife conflict report",
      message: "A new report needs review. Open the site record in WAMS.",
      entity,
      record_id: id,
      url: href,
      severity: String(report.severity || report.urgency || "medium"),
      acknowledged: false,
      status: "submitted",
      triggered_at: new Date().toISOString(),
      is_demo: false,
    }));
}

export async function routeReportToOfficers(pool, entity, report, reporter, createAlert) {
  const siteId = String(report?.site_id || "");
  if (!siteId || !["Incident", "HwcCase"].includes(entity)) return { routed: 0, reason: "site_not_selected" };
  const result = await pool.query(
    `SELECT id, role, site_ids FROM app_users
     WHERE status = 'active' AND role = ANY($2::text[]) AND $1 = ANY(site_ids)`,
    [siteId, [...authorizedOfficeRoles]]
  );
  if (typeof createAlert !== "function") throw new TypeError("An alert creator is required.");
  const alerts = prepareOfficeAlerts(entity, report, reporter, result.rows);
  let routed = 0;
  for (const alert of alerts) {
    await createAlert(pool, "Alert", alert, reporter.id);
    routed += 1;
  }
  return { routed, reason: routed ? "site_officers_notified_in_app" : "no_assigned_officer" };
}
