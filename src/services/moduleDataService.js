import { supabase } from "../supabaseClient.js";
import { getCurrentUser } from "../utils/accountAuth.js";

const MODULE_DATA_TABLE = "module_data";

function cleanText(value) {
  return String(value || "").trim();
}

function nullableText(value) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function normalizeDate(value) {
  return cleanText(value) || new Date().toISOString().slice(0, 10);
}

function buildBaseRow(module, payload = {}) {
  const currentUser = getCurrentUser();
  return {
    id: payload.id || undefined,
    module: cleanText(module),
    record_date: normalizeDate(payload.record_date || payload.date),
    user_id: nullableText(payload.user_id || currentUser?.id),
    username: nullableText(payload.username || currentUser?.username)?.toLowerCase() || null,
    full_name: nullableText(payload.full_name || currentUser?.fullName || currentUser?.full_name),
    role: nullableText(payload.role || currentUser?.role),
    site: nullableText(payload.site),
    department: nullableText(payload.department),
    area: nullableText(payload.area || currentUser?.area),
    data: payload.data && typeof payload.data === "object" ? payload.data : {},
    status: cleanText(payload.status) || "draft",
    updated_at: new Date().toISOString(),
  };
}

function applyFilters(query, filters = {}) {
  let next = query;
  if (filters.user_id) next = next.eq("user_id", cleanText(filters.user_id));
  if (filters.username) next = next.ilike("username", cleanText(filters.username));
  if (filters.full_name) next = next.ilike("full_name", cleanText(filters.full_name));
  if (filters.role) next = next.eq("role", cleanText(filters.role));
  if (filters.site) next = next.eq("site", cleanText(filters.site));
  if (filters.department) next = next.eq("department", cleanText(filters.department));
  if (filters.area) next = next.eq("area", cleanText(filters.area));
  if (filters.status) next = next.eq("status", cleanText(filters.status));
  return next;
}

export async function saveModuleData(payload) {
  const row = buildBaseRow(payload.module, payload);
  const { data, error } = await supabase
    .from(MODULE_DATA_TABLE)
    .upsert(row, {
      onConflict: "module,record_date,username,site,department,area",
    })
    .select("*")
    .single();
  console.log("SAVE MODULE DATA RESULT", data ?? null, error ?? null, {
    module: row.module,
    record_date: row.record_date,
    username: row.username,
    site: row.site,
    department: row.department,
    area: row.area,
  });
  if (error) throw error;

  const { data: verifiedRow, error: verifyError } = await supabase
    .from(MODULE_DATA_TABLE)
    .select("*")
    .eq("module", row.module)
    .eq("record_date", row.record_date)
    .eq("username", row.username)
    .eq("site", row.site)
    .eq("department", row.department)
    .eq("area", row.area)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("VERIFY MODULE DATA RESULT", verifiedRow ?? null, verifyError ?? null, {
    module: row.module,
    record_date: row.record_date,
    username: row.username,
    site: row.site,
    department: row.department,
    area: row.area,
  });

  if (verifyError || !verifiedRow) {
    throw verifyError || new Error("Module data was not inserted into Supabase");
  }

  return verifiedRow;
}

export async function getModuleDataByDate(module, date, filters = {}) {
  let query = supabase
    .from(MODULE_DATA_TABLE)
    .select("*")
    .eq("module", cleanText(module))
    .eq("record_date", normalizeDate(date));
  query = applyFilters(query, filters);
  const { data, error } = await query.order("updated_at", { ascending: false }).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getModuleDataByRange(module, startDate, endDate, filters = {}) {
  let query = supabase
    .from(MODULE_DATA_TABLE)
    .select("*")
    .eq("module", cleanText(module))
    .gte("record_date", normalizeDate(startDate))
    .lte("record_date", normalizeDate(endDate))
    .order("record_date", { ascending: false })
    .order("updated_at", { ascending: false });
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function deleteModuleData(id) {
  const { error } = await supabase.from(MODULE_DATA_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function migrateLocalStorageToSupabase(module, records = []) {
  if (!Array.isArray(records) || !records.length) return [];
  const results = [];
  for (const item of records) {
    try {
      const saved = await saveModuleData({ module, ...item });
      results.push(saved);
    } catch (error) {
      console.error(`[moduleDataService] migrateLocalStorageToSupabase failed for ${module}:`, error);
    }
  }
  return results;
}
