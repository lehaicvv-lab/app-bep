import { STORAGE_PREFIX } from "./constants.js";
import { loadDepartments, loadShifts, saveDepartments } from "../../systemCatalog/masterData.js";
import { emptyAttendancePayload, ensureAttendanceShape, uid } from "./utils.js";
import { getModuleDataByDate, getModuleDataByRange, saveModuleData } from "../../services/moduleDataService.js";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fireAndForget(promise, label) {
  promise.catch((error) => {
    console.error(`[nhansu.storage] ${label} failed:`, error);
  });
}

export function attendanceKey(date) {
  return `${STORAGE_PREFIX}attendance_${date}`;
}

export function departmentCatalogKey() {
  return `${STORAGE_PREFIX}attendance_departments`;
}

export function evalStaffKey(period, ref) {
  return `${STORAGE_PREFIX}eval_staff_${period}_${ref}`;
}

export function evalMgmtKey(yearMonth) {
  return `${STORAGE_PREFIX}eval_mgmt_${yearMonth}`;
}

export function loadAttendance(date) {
  const catalog = loadDepartmentCatalog();
  const shiftNames = loadShifts().map((s) => s.name);
  const defaultShift = shiftNames[0] || "Ca ngày";
  const key = attendanceKey(date);
  const raw = readJson(key, null);
  if (!raw) return emptyAttendancePayload(date, defaultShift, catalog);
  const fixed = ensureAttendanceShape({ ...raw, date }, catalog, { includeUnknownDepartments: false });
  if (shiftNames.length && fixed.shift && !shiftNames.includes(fixed.shift)) {
    return { ...fixed, shift: defaultShift };
  }
  return fixed;
}

export function saveAttendance(payload) {
  const key = attendanceKey(payload.date);
  writeJson(key, payload);
  fireAndForget(
    saveModuleData({
      module: "nhansu_attendance",
      record_date: payload.date,
      site: payload.shift || "",
      department: "attendance",
      data: payload,
      status: "done",
    }),
    "save attendance"
  );
}

export function loadDepartmentCatalog() {
  return loadDepartments();
}

export function saveDepartmentCatalog(list) {
  saveDepartments(list);
}

export function loadEvalStaff(period, ref) {
  const data = readJson(evalStaffKey(period, ref), { items: [] });
  return {
    period,
    ref,
    items: Array.isArray(data.items)
      ? data.items.map((x) => ({
          id: x.id || uid(),
          fullName: x.fullName ?? "",
          deptId: x.deptId ?? "",
          soChe: Number(x.soChe ?? x.performance) || 0,
          chiaSuat: Number(x.chiaSuat ?? x.compliance) || 0,
          fiveS: Number(x.fiveS ?? x.attitude) || 0,
          thaiDo: Number(x.thaiDo ?? x.attitude) || 0,
          reportLevel: x.reportLevel ?? "none",
          reportCount: Number(x.reportCount) || 0,
          performance: Number(x.performance) || 0,
          compliance: Number(x.compliance) || 0,
          attitude: Number(x.attitude) || 0,
          note: x.note ?? "",
        }))
      : [],
  };
}

export function saveEvalStaff(payload) {
  writeJson(evalStaffKey(payload.period, payload.ref), payload);
  fireAndForget(
    saveModuleData({
      module: "nhansu_eval_staff",
      record_date: payload.period === "month" ? `${String(payload.ref).replace("month-", "")}-01` : new Date().toISOString().slice(0, 10),
      site: payload.ref || "",
      department: payload.period || "week",
      data: payload,
      status: "done",
    }),
    "save eval staff"
  );
}

export function loadEvalMgmt(yearMonth) {
  const data = readJson(evalMgmtKey(yearMonth), { month: yearMonth, items: [] });
  return {
    month: yearMonth,
    items: Array.isArray(data.items)
      ? data.items.map((x) => ({
          id: x.id || uid(),
          fullName: x.fullName ?? "",
          deptId: x.deptId ?? "",
          jobTitle: x.jobTitle ?? "",
          attendance: Number(x.attendance ?? x.performance) || 0,
          workMgmt: Number(x.workMgmt ?? x.performance) || 0,
          qualityControl: Number(x.qualityControl ?? x.compliance) || 0,
          incidentHandling: Number(x.incidentHandling ?? x.performance) || 0,
          peopleMgmt: Number(x.peopleMgmt ?? x.compliance) || 0,
          reporting: Number(x.reporting ?? x.compliance) || 0,
          attitude: Number(x.attitude) || 0,
          hasVsattpViolation: Boolean(x.hasVsattpViolation),
          hasSeriousIncident: Boolean(x.hasSeriousIncident),
          hasCustomerComplaint: Boolean(x.hasCustomerComplaint),
          performance: Number(x.performance) || 0,
          compliance: Number(x.compliance) || 0,
          note: x.note ?? "",
        }))
      : [],
  };
}

export function saveEvalMgmt(payload) {
  writeJson(evalMgmtKey(payload.month), payload);
  fireAndForget(
    saveModuleData({
      module: "nhansu_eval_mgmt",
      record_date: `${payload.month}-01`,
      site: payload.month || "",
      department: "management",
      data: payload,
      status: "done",
    }),
    "save eval mgmt"
  );
}

/** Liệt kê các ngày có file điểm danh trong localStorage */
export function listAttendanceDates() {
  const prefix = `${STORAGE_PREFIX}attendance_`;
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const d = k.slice(prefix.length);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out.push(d);
  }
  return out.sort();
}

export async function hydrateAttendanceFromSupabase(date) {
  const row = await getModuleDataByDate("nhansu_attendance", date, {
    department: "attendance",
  });
  if (row?.data) {
    writeJson(attendanceKey(date), row.data);
    return row.data;
  }
  return null;
}

export async function hydrateEvalStaffFromSupabase(period, ref) {
  const rows = await getModuleDataByRange("nhansu_eval_staff", "2000-01-01", "2100-12-31", {
    site: ref,
    department: period,
  });
  const row = rows[0];
  if (row?.data) {
    writeJson(evalStaffKey(period, ref), row.data);
    return row.data;
  }
  return null;
}

export async function hydrateEvalMgmtFromSupabase(month) {
  const rows = await getModuleDataByRange("nhansu_eval_mgmt", "2000-01-01", "2100-12-31", {
    site: month,
    department: "management",
  });
  const row = rows[0];
  if (row?.data) {
    writeJson(evalMgmtKey(month), row.data);
    return row.data;
  }
  return null;
}
