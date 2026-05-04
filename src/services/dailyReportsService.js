import { supabase } from "../supabaseClient.js";
import { saveModuleData } from "./moduleDataService.js";

const DAILY_REPORTS_TABLE = "daily_reports";
const MODULE_DATA_TABLE = "module_data";
const REPORT_MODULES = ["management", "service", "accounting", "warehouse", "bep"];

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

function isMissingTableError(error) {
  return error?.code === "PGRST205";
}

function normalizeModule(value) {
  const cleaned = cleanText(value);
  return cleaned || "management";
}

function toModuleDataPayload(payload = {}) {
  const row = buildDailyReportPayload(payload);
  return {
    id: row.id,
    module: normalizeModule(row.module),
    record_date: row.report_date,
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    site: row.site,
    department: row.department,
    data: row.data,
    status: row.status,
    updated_at: row.updated_at,
  };
}

function fromModuleDataRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    report_date: row.record_date,
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    module: row.module,
    department: row.department,
    site: row.site,
    data: row.data,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getDailyReportByDateFromModuleData(reportDate, filters = {}) {
  let query = supabase.from(MODULE_DATA_TABLE).select("*").eq("record_date", cleanText(reportDate));
  if (filters.id) query = query.eq("id", filters.id);
  if (filters.user_id) query = query.eq("user_id", cleanText(filters.user_id));
  if (filters.username) query = query.ilike("username", cleanText(filters.username));
  if (filters.role) query = query.eq("role", cleanText(filters.role));
  if (filters.module) query = query.eq("module", normalizeModule(filters.module));
  else query = query.in("module", REPORT_MODULES);
  if (filters.department) query = query.eq("department", cleanText(filters.department));
  if (filters.site) query = query.eq("site", cleanText(filters.site));
  if (filters.status) query = query.eq("status", cleanText(filters.status));
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return fromModuleDataRow(data);
}

async function getDailyReportsByRangeFromModuleData(startDate, endDate, filters = {}) {
  let query = supabase.from(MODULE_DATA_TABLE).select("*").order("record_date", { ascending: false }).order("updated_at", { ascending: false });
  if (cleanText(startDate)) query = query.gte("record_date", cleanText(startDate));
  if (cleanText(endDate)) query = query.lte("record_date", cleanText(endDate));
  if (filters.user_id) query = query.eq("user_id", cleanText(filters.user_id));
  if (filters.username) query = query.ilike("username", cleanText(filters.username));
  if (filters.role) query = query.eq("role", cleanText(filters.role));
  if (filters.module) query = query.eq("module", normalizeModule(filters.module));
  else query = query.in("module", REPORT_MODULES);
  if (filters.department) query = query.eq("department", cleanText(filters.department));
  if (filters.site) query = query.eq("site", cleanText(filters.site));
  if (filters.status) query = query.eq("status", cleanText(filters.status));
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data.map(fromModuleDataRow) : [];
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
  const fallbackRow = await saveModuleData(toModuleDataPayload(row));
  const mappedFallback = fromModuleDataRow(fallbackRow);
  console.log("SAVE DAILY REPORT RESULT", mappedFallback ?? null, null, {
    report_date: row.report_date,
    username: row.username,
    module: row.module,
    department: row.department,
    site: row.site,
    backend: MODULE_DATA_TABLE,
  });
  console.log("VERIFY DAILY REPORT RESULT", mappedFallback ?? null, null, {
    report_date: row.report_date,
    username: row.username,
    module: row.module,
    department: row.department,
    site: row.site,
    backend: MODULE_DATA_TABLE,
  });
  try {
    const { error } = await supabase
      .from(DAILY_REPORTS_TABLE)
      .upsert(row, { onConflict: "report_date,username,module,department,site" });
    if (error && !isMissingTableError(error)) {
      console.warn("[dailyReportsService] optional sync to daily_reports failed:", error);
    }
  } catch (error) {
    console.warn("[dailyReportsService] optional sync to daily_reports crashed:", error);
  }
  return mappedFallback;
}

export async function getDailyReportByDate(reportDate, filters = {}) {
  return getDailyReportByDateFromModuleData(reportDate, filters);
}

export async function getDailyReportsByRange(startDate, endDate, filters = {}) {
  return getDailyReportsByRangeFromModuleData(startDate, endDate, filters);
}

export async function updateDailyReport(id, payload) {
  const row = buildDailyReportPayload(payload);
  const fallbackRow = await saveModuleData({ ...toModuleDataPayload(row), id });
  try {
    const { error } = await supabase.from(DAILY_REPORTS_TABLE).update(row).eq("id", id);
    if (error && !isMissingTableError(error)) {
      console.warn("[dailyReportsService] optional update sync to daily_reports failed:", error);
    }
  } catch (error) {
    console.warn("[dailyReportsService] optional update sync to daily_reports crashed:", error);
  }
  return fromModuleDataRow(fallbackRow);
}
