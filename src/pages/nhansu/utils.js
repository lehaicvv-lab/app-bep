import { DEFAULT_DEPARTMENTS } from "./constants.js";

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

/** @param {string} dateStr YYYY-MM-DD */
export function parseIsoDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {Date} d */
export function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** inclusive [start, end] as YYYY-MM-DD */
export function eachDateInRange(startStr, endStr) {
  const start = parseIsoDate(startStr);
  const end = parseIsoDate(endStr);
  if (!start || !end || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function weekRangeContaining(dateStr) {
  const d = parseIsoDate(dateStr) || new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d);
  mon.setDate(diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toIsoDate(mon), end: toIsoDate(sun) };
}

export function monthRange(yearMonth) {
  const m = String(yearMonth || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return { start: todayIsoDate(), end: todayIsoDate() };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const start = `${y}-${String(mo).padStart(2, "0")}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${String(mo).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

/** "HH:mm" or "" -> minutes from midnight */
export function timeToMinutes(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function minutesBetween(checkIn, checkOut) {
  const a = timeToMinutes(checkIn);
  const b = timeToMinutes(checkOut);
  if (a == null || b == null || b <= a) return 0;
  return b - a;
}

/** Điểm đánh giá 1–5 */
export function evalWeightedScore(performance, compliance, attitude) {
  const p = Math.min(5, Math.max(0, Number(performance) || 0));
  const c = Math.min(5, Math.max(0, Number(compliance) || 0));
  const a = Math.min(5, Math.max(0, Number(attitude) || 0));
  return p * 0.4 + c * 0.3 + a * 0.3;
}

export function evalLabel(score) {
  if (score >= 4) return { key: "good", label: "Tốt" };
  if (score >= 3) return { key: "watch", label: "Theo dõi" };
  return { key: "weak", label: "Yếu" };
}

/** Tạo payload điểm danh trống cho một ngày */
export function emptyAttendancePayload(date, shift = "Ca ngày", departmentCatalog = DEFAULT_DEPARTMENTS) {
  return {
    date,
    shift,
    departments: departmentCatalog.map((d) => ({
      id: d.id,
      name: d.name,
      rows: [],
    })),
  };
}

export function ensureAttendanceShape(raw, departmentCatalog = DEFAULT_DEPARTMENTS, options = {}) {
  if (!raw || typeof raw !== "object") return null;
  const includeUnknownDepartments = Boolean(options.includeUnknownDepartments);
  const date = raw.date || todayIsoDate();
  const shift = raw.shift || "Ca ngày";
  const deptMap = new Map((raw.departments || []).map((d) => [d.id, d]));
  const departments = departmentCatalog.map((def) => {
    const existing = deptMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      rows: Array.isArray(existing?.rows)
        ? existing.rows.map((r) => ({
            id: r.id || uid(),
            fullName: r.fullName ?? "",
            jobTitle: r.jobTitle ?? "",
            status: r.status ?? "present",
            checkIn: r.checkIn ?? "",
            checkOut: r.checkOut ?? "",
            note: r.note ?? "",
          }))
        : [],
    };
  });
  if (includeUnknownDepartments) {
    const knownIds = new Set(departmentCatalog.map((d) => d.id));
    for (const d of raw.departments || []) {
      if (!d || knownIds.has(d.id)) continue;
      const rows = Array.isArray(d.rows)
        ? d.rows.map((r) => ({
            id: r.id || uid(),
            fullName: r.fullName ?? "",
            jobTitle: r.jobTitle ?? "",
            status: r.status ?? "present",
            checkIn: r.checkIn ?? "",
            checkOut: r.checkOut ?? "",
            note: r.note ?? "",
          }))
        : [];
      departments.push({ id: d.id || uid(), name: d.name || "Bộ phận cũ", rows });
    }
  }
  return { date, shift, departments };
}
