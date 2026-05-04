import { supabase } from "../supabaseClient.js";

const DAILY_REPORTS_TABLE = "daily_reports";

function cleanText(value) {
  return String(value || "").trim();
}

function nullableText(value) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function applyFilters(query, filters = {}) {
  let next = query;
  if (filters.id) next = next.eq("id", filters.id);
  if (filters.user_id) next = next.eq("user_id", cleanText(filters.user_id));
  if (filters.username) next = next.ilike("username", cleanText(filters.username));
  if (filters.role) next = next.eq("role", cleanText(filters.role));
  if (filters.module) next = next.eq("module", cleanText(filters.module));
  if (filters.department) next = next.eq("department", cleanText(filters.department));
  if (filters.site) next = next.eq("site", cleanText(filters.site));
  if (filters.status) next = next.eq("status", cleanText(filters.status));
  return next;
}

export function buildDailyReportPayload(payload = {}) {
  return {
    id: payload.id || undefined,
    report_date: cleanText(payload.report_date),
    user_id: nullableText(payload.user_id),
    username: nullableText(payload.username)?.toLowerCase() || null,
    full_name: nullableText(payload.full_name),
    role: nullableText(payload.role),
    module: cleanText(payload.module),
    department: nullableText(payload.department),
    site: nullableText(payload.site),
    data: payload.data && typeof payload.data === "object" ? payload.data : {},
    status: cleanText(payload.status) || "draft",
    updated_at: new Date().toISOString(),
  };
}

export async function saveDailyReport(payload) {
  const row = buildDailyReportPayload(payload);
  const { data, error } = await supabase
    .from(DAILY_REPORTS_TABLE)
    .upsert(row, { onConflict: "report_date,username,module,department,site" })
    .select("*")
    .single();
  console.log("SAVE DAILY REPORT RESULT", data ?? null, error ?? null, {
    report_date: row.report_date,
    username: row.username,
    module: row.module,
    department: row.department,
    site: row.site,
  });
  if (error) throw error;

  const { data: verifiedRow, error: verifyError } = await supabase
    .from(DAILY_REPORTS_TABLE)
    .select("*")
    .eq("report_date", row.report_date)
    .eq("username", row.username)
    .eq("module", row.module)
    .eq("department", row.department)
    .eq("site", row.site)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("VERIFY DAILY REPORT RESULT", verifiedRow ?? null, verifyError ?? null, {
    report_date: row.report_date,
    username: row.username,
    module: row.module,
    department: row.department,
    site: row.site,
  });

  if (verifyError || !verifiedRow) {
    throw verifyError || new Error("Daily report was not inserted into Supabase");
  }

  return verifiedRow;
}

export async function getDailyReportByDate(reportDate, filters = {}) {
  let query = supabase.from(DAILY_REPORTS_TABLE).select("*").eq("report_date", cleanText(reportDate));
  query = applyFilters(query, filters);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getDailyReportsByRange(startDate, endDate, filters = {}) {
  let query = supabase.from(DAILY_REPORTS_TABLE).select("*").order("report_date", { ascending: false }).order("updated_at", { ascending: false });
  if (cleanText(startDate)) query = query.gte("report_date", cleanText(startDate));
  if (cleanText(endDate)) query = query.lte("report_date", cleanText(endDate));
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateDailyReport(id, payload) {
  const row = buildDailyReportPayload(payload);
  const { data, error } = await supabase
    .from(DAILY_REPORTS_TABLE)
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
