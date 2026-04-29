/**
 * Master data dùng chung: khu vực, bếp/site, bộ phận, ca.
 * Khu vực & bếp/site giữ khóa localStorage cũ (asset_*) để tương thích backup/Thiết bị.
 */

import { DEFAULT_DEPARTMENTS } from "../pages/nhansu/constants.js";

export const MASTER_DATA_CHANGE = "sco-master-data-changed";

export const STORAGE_KEYS = {
  regions: "asset_regions",
  locations: "asset_locations",
  departments: "sco_master_departments",
  shifts: "sco_master_shifts",
};

const LEGACY_DEPT_KEY = "nhansu_v1_attendance_departments";

const DEFAULT_SHIFTS = [
  { id: "ca-ngay", name: "Ca ngày", sortOrder: 0 },
  { id: "ca-dem", name: "Ca đêm", sortOrder: 1 },
  { id: "ca-gay", name: "Ca gãy", sortOrder: 2 },
  { id: "ca1", name: "Ca 1", sortOrder: 3 },
  { id: "ca2", name: "Ca 2", sortOrder: 4 },
  { id: "ca3", name: "Ca 3", sortOrder: 5 },
];

function bump() {
  try {
    window.dispatchEvent(new CustomEvent(MASTER_DATA_CHANGE));
  } catch {
    /* ignore */
  }
}

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

function readArray(key, fallback = []) {
  const parsed = readJson(key, null);
  return Array.isArray(parsed) ? parsed : fallback;
}

function writeArray(key, rows) {
  writeJson(key, rows);
}

function normalizeDeptName(name, fallback = "Bộ phận") {
  const t = String(name || "").trim();
  return t || fallback;
}

function migrateLegacyDepartmentsOnce() {
  const cur = readJson(STORAGE_KEYS.departments, null);
  if (Array.isArray(cur) && cur.length > 0) return;
  const legacy = readJson(LEGACY_DEPT_KEY, null);
  if (!Array.isArray(legacy) || legacy.length === 0) return;
  const seen = new Set();
  const out = [];
  for (const d of legacy) {
    if (!d || !d.id || seen.has(d.id)) continue;
    seen.add(d.id);
    out.push({ id: d.id, name: normalizeDeptName(d.name, "Bộ phận") });
  }
  if (out.length) writeJson(STORAGE_KEYS.departments, out);
}

export function loadRegions() {
  return readArray(STORAGE_KEYS.regions, []);
}

export function saveRegions(rows) {
  writeArray(STORAGE_KEYS.regions, rows);
  bump();
}

export function loadLocations() {
  return readArray(STORAGE_KEYS.locations, []);
}

export function saveLocations(rows) {
  writeArray(STORAGE_KEYS.locations, rows);
  bump();
}

export function loadDepartments() {
  migrateLegacyDepartmentsOnce();
  const raw = readJson(STORAGE_KEYS.departments, null);
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_DEPARTMENTS.map((d) => ({ id: d.id, name: d.name }));
  }
  const seen = new Set();
  const out = [];
  for (const d of raw) {
    if (!d || !d.id || seen.has(d.id)) continue;
    seen.add(d.id);
    out.push({ id: d.id, name: normalizeDeptName(d.name, "Bộ phận") });
  }
  return out.length > 0 ? out : DEFAULT_DEPARTMENTS.map((d) => ({ id: d.id, name: d.name }));
}

export function saveDepartments(list) {
  const seen = new Set();
  const cleaned = [];
  for (const d of Array.isArray(list) ? list : []) {
    if (!d || !d.id || seen.has(d.id)) continue;
    seen.add(d.id);
    cleaned.push({ id: d.id, name: normalizeDeptName(d.name, "Bộ phận") });
  }
  const payload =
    cleaned.length === 0 ? DEFAULT_DEPARTMENTS.map((x) => ({ id: x.id, name: x.name })) : cleaned;
  writeJson(STORAGE_KEYS.departments, payload);
  bump();
}

function normalizeShifts(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const s of raw) {
    if (!s || !s.id || !s.name) continue;
    out.push({
      id: String(s.id).trim(),
      name: String(s.name).trim() || String(s.id),
      sortOrder: Number(s.sortOrder) || 0,
    });
  }
  return out.length ? out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)) : null;
}

export function loadShifts() {
  const normalized = normalizeShifts(readJson(STORAGE_KEYS.shifts, null));
  if (normalized) return normalized;
  return DEFAULT_SHIFTS.map((x) => ({ ...x }));
}

export function saveShifts(list) {
  const normalized = normalizeShifts(list);
  const payload = normalized && normalized.length ? normalized : DEFAULT_SHIFTS.map((x) => ({ ...x }));
  writeJson(STORAGE_KEYS.shifts, payload);
  bump();
}

export function getShiftNames() {
  return loadShifts().map((s) => s.name);
}

export function getShiftLabelById(id) {
  const s = loadShifts().find((x) => x.id === id);
  return s?.name || "—";
}

/** Gợi ý chuỗi khu vực — bếp/site cho báo cáo (header.site). */
export function buildSiteSelectOptions() {
  const regions = loadRegions().filter((r) => !r.isDeleted);
  const locations = loadLocations().filter((l) => !l.isDeleted);
  const opts = [];
  for (const r of regions) {
    const locs = locations.filter((l) => l.regionId === r.id);
    if (locs.length === 0) opts.push({ value: r.name, label: `${r.name} (chưa gán bếp/site)` });
    else {
      for (const l of locs) {
        const value = `${r.name} — ${l.name}`;
        opts.push({ value, label: value });
      }
    }
  }
  const knownRegionIds = new Set(regions.map((x) => x.id));
  for (const l of locations) {
    if (!l.regionId || knownRegionIds.has(l.regionId)) continue;
    opts.push({ value: l.name, label: `${l.name} (khu vực chưa khớp)` });
  }
  return opts;
}
