const SNAPSHOT_STORAGE_KEY = "__sco_backup_snapshots_v1";
const LAST_AUTO_SNAPSHOT_KEY = "__sco_backup_last_auto_snapshot_at";
const BACKUP_SCHEMA_VERSION = 1;
const MAX_SNAPSHOTS = 5;
const AUTO_SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000;

const EXACT_KEYS = new Set([
  "app_bep_accounts_v2",
  "company_forms_history",
  "asset_regions",
  "asset_locations",
  "sco_master_departments",
  "sco_master_shifts",
  "asset_tree_rows",
  "asset_monthly_inventory",
  "asset_ccdc_receipts",
  "asset_equipment_list",
  "asset_equipment_logs",
  "asset_transfer_history",
  "equipment_list",
  "equipment_maintenance_history",
  "sky_ops_doi_xe_nhat_ky_v5",
  "sky_ops_doi_xe_lich_tuan_v2",
  "sky_ops_weekly_vehicle_master_v1",
  "vehicle_week_issue_v1",
]);

const PREFIXES = [
  "asset_",
  "equipment_",
  "nhansu_v1_",
  "safety_report_v4",
  "sky-catering-ops-report:",
  "sky_ops_",
  "vehicle_inspection_",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isManagedAppKey(key) {
  if (!key) return false;
  if (key === SNAPSHOT_STORAGE_KEY || key === LAST_AUTO_SNAPSHOT_KEY) return false;
  if (EXACT_KEYS.has(key)) return true;
  return PREFIXES.some((prefix) => key.startsWith(prefix));
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

export function collectManagedEntries() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!isManagedAppKey(key)) continue;
    const value = localStorage.getItem(key);
    if (typeof value !== "string") continue;
    entries.push({ key, value });
  }
  entries.sort((a, b) => a.key.localeCompare(b.key));
  return entries;
}

export function createBackupPayload(label = "") {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    app: "Sky Catering Operations",
    createdAt: new Date().toISOString(),
    label: String(label || "").trim(),
    entryCount: 0,
    entries: [],
  };
}

export function exportBackupPayload(label = "") {
  const payload = createBackupPayload(label);
  const entries = collectManagedEntries();
  payload.entries = entries;
  payload.entryCount = entries.length;
  return payload;
}

export function downloadBackup(payload, filename = "") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = String(filename || `sco-backup-${stamp}.json`).replace(/[^\w.-]/g, "_");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}

export function parseBackupText(rawText) {
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("File backup không đúng định dạng JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("File backup không hợp lệ.");
  }
  if (!Array.isArray(parsed.entries)) {
    throw new Error("File backup thiếu danh sách dữ liệu.");
  }
  for (const item of parsed.entries) {
    if (!item || typeof item.key !== "string" || typeof item.value !== "string") {
      throw new Error("File backup chứa dòng dữ liệu không hợp lệ.");
    }
    if (!isManagedAppKey(item.key)) {
      throw new Error(`File backup chứa key ngoài phạm vi ứng dụng: ${item.key}`);
    }
  }
  return parsed;
}

function applyBackupPayload(payload) {
  const incomingEntries = Array.isArray(payload?.entries) ? payload.entries : [];
  const incomingMap = new Map(
    incomingEntries.filter((item) => isManagedAppKey(item?.key)).map((item) => [item.key, item.value])
  );

  const existingManaged = collectManagedEntries().map((item) => item.key);
  for (const key of existingManaged) {
    if (!incomingMap.has(key)) {
      localStorage.removeItem(key);
    }
  }
  for (const [key, value] of incomingMap.entries()) {
    localStorage.setItem(key, value);
  }
}

export function getSnapshotHistory() {
  const rows = readJson(SNAPSHOT_STORAGE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.filter((x) => x && x.id && x.backup && Array.isArray(x.backup.entries));
}

function saveSnapshotHistory(rows) {
  writeJson(SNAPSHOT_STORAGE_KEY, rows.slice(0, MAX_SNAPSHOTS));
}

export function createSnapshot(label = "Snapshot thủ công", source = "manual") {
  const backup = exportBackupPayload(label);
  const row = {
    id: uid(),
    createdAt: new Date().toISOString(),
    label: String(label || "").trim() || "Snapshot",
    source,
    entryCount: backup.entryCount,
    backup,
  };
  const next = [row, ...getSnapshotHistory()];
  saveSnapshotHistory(next);
  return row;
}

export function ensureAutoSnapshot() {
  const lastAt = Number(localStorage.getItem(LAST_AUTO_SNAPSHOT_KEY) || 0);
  const now = Date.now();
  if (lastAt && now - lastAt < AUTO_SNAPSHOT_INTERVAL_MS) return false;
  createSnapshot("Auto snapshot", "auto");
  localStorage.setItem(LAST_AUTO_SNAPSHOT_KEY, String(now));
  return true;
}

export function restoreFromBackupPayload(payload, reasonLabel = "Khôi phục từ backup") {
  createSnapshot(`Pre-restore · ${reasonLabel}`, "pre-restore");
  applyBackupPayload(payload);
  createSnapshot(`Post-restore · ${reasonLabel}`, "post-restore");
}

export function rollbackToSnapshot(snapshotId) {
  const target = getSnapshotHistory().find((x) => x.id === snapshotId);
  if (!target) {
    throw new Error("Không tìm thấy snapshot để rollback.");
  }
  createSnapshot(`Pre-rollback · ${target.label}`, "pre-rollback");
  applyBackupPayload(target.backup);
  createSnapshot(`Post-rollback · ${target.label}`, "post-rollback");
}
