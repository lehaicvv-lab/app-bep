import { supabase } from "../services/supabase.js";

export const ACCOUNT_STORAGE_KEY = "app_bep_accounts_v2";
export const CURRENT_USER_KEY = "currentUser";

const FULL_ACCESS = {
  pages: {
    dashboard: true,
    baocaongay: true,
    doixe: true,
    thietbi: true,
    antoan: true,
    nhansu: true,
    bieumau: true,
    taikhoan: true,
    danhmuc: true,
  },
  reportTabs: {
    summary: true,
    management: true,
    service: true,
    accounting: true,
    warehouse: true,
    bep: true,
  },
  actions: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    print: true,
  },
};

const PERMISSION_KEY_MAP = {
  dashboard: { section: "pages", key: "dashboard" },
  baocao: { section: "pages", key: "baocaongay" },
  baocaongay: { section: "pages", key: "baocaongay" },
  report: { section: "pages", key: "baocaongay" },
  ketoan: { section: "reportTabs", key: "accounting" },
  accounting: { section: "reportTabs", key: "accounting" },
  khosanxuat: { section: "reportTabs", key: "warehouse" },
  warehouse: { section: "reportTabs", key: "warehouse" },
  bep: { section: "reportTabs", key: "bep" },
  quanly: { section: "reportTabs", key: "management" },
  management: { section: "reportTabs", key: "management" },
  giamsat: { section: "reportTabs", key: "service" },
  service: { section: "reportTabs", key: "service" },
  nhansu: { section: "pages", key: "nhansu" },
  thietbi: { section: "pages", key: "thietbi" },
  antoan: { section: "pages", key: "antoan" },
  doixe: { section: "pages", key: "doixe" },
  bieumau: { section: "pages", key: "bieumau" },
  taikhoan: { section: "pages", key: "taikhoan" },
  danhmuc: { section: "pages", key: "danhmuc" },
};

function clonePermissions(source = FULL_ACCESS) {
  return {
    pages: { ...source.pages },
    reportTabs: { ...source.reportTabs },
    actions: { ...source.actions },
  };
}

function emptyPermissions() {
  const base = clonePermissions(FULL_ACCESS);
  Object.keys(base.pages).forEach((key) => {
    base.pages[key] = false;
  });
  Object.keys(base.reportTabs).forEach((key) => {
    base.reportTabs[key] = false;
  });
  Object.keys(base.actions).forEach((key) => {
    base.actions[key] = false;
  });
  return base;
}

function readStoredCurrentUser() {
  try {
    const raw = sessionStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizePermissions(input, role = "") {
  if (role === "admin") return clonePermissions(FULL_ACCESS);

  if (Array.isArray(input)) {
    const next = emptyPermissions();
    next.actions.view = true;
    next.actions.create = true;
    next.actions.edit = true;
    next.actions.print = true;
    input.forEach((item) => {
      const token = String(item || "").trim().toLowerCase();
      const mapped = PERMISSION_KEY_MAP[token];
      if (!mapped) return;
      next[mapped.section][mapped.key] = true;
    });
    if (
      next.reportTabs.management ||
      next.reportTabs.service ||
      next.reportTabs.accounting ||
      next.reportTabs.warehouse ||
      next.reportTabs.bep ||
      next.reportTabs.summary
    ) {
      next.pages.baocaongay = true;
      next.reportTabs.summary = true;
    }
    return next;
  }

  if (input && typeof input === "object") {
    const base = emptyPermissions();
    const pages = input.pages && typeof input.pages === "object" ? input.pages : {};
    const reportTabs = input.reportTabs && typeof input.reportTabs === "object" ? input.reportTabs : {};
    const actions = input.actions && typeof input.actions === "object" ? input.actions : {};
    Object.keys(base.pages).forEach((key) => {
      if (key in pages) base.pages[key] = Boolean(pages[key]);
    });
    Object.keys(base.reportTabs).forEach((key) => {
      if (key in reportTabs) base.reportTabs[key] = Boolean(reportTabs[key]);
    });
    Object.keys(base.actions).forEach((key) => {
      if (key in actions) base.actions[key] = Boolean(actions[key]);
    });
    return base;
  }

  return emptyPermissions();
}

export function mapSupabaseUser(row) {
  if (!row) return null;
  const permissions = normalizePermissions(row.permissions, row.role);
  return {
    ...row,
    permissions,
    fullName: row.full_name || row.fullName || "",
    active: row.active !== false,
  };
}

export function getCurrentUser() {
  return mapSupabaseUser(readStoredCurrentUser());
}

export function getCurrentUserPermissions() {
  return getCurrentUser()?.permissions || emptyPermissions();
}

export async function authenticateCredentials(username, password) {
  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .eq("active", true)
    .single();

  if (error || !data) {
    return { ok: false, message: "Sai tài khoản hoặc mật khẩu" };
  }

  return { ok: true, user: mapSupabaseUser(data) };
}

export function markSessionForUser(user) {
  const normalized = mapSupabaseUser(user);
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized));
}

export function clearAuthSession() {
  sessionStorage.removeItem(CURRENT_USER_KEY);
}

export function isAuthSessionValid() {
  const current = getCurrentUser();
  return !!(current && current.active);
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event("app-bep-auth-changed"));
}

export async function fetchUsersProfile() {
  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupabaseUser);
}

export async function createUserProfile(payload) {
  const { data, error } = await supabase.from("users_profile").insert(payload).select("*").single();
  if (error) throw error;
  return mapSupabaseUser(data);
}

export async function updateUserProfile(id, payload) {
  const { data, error } = await supabase
    .from("users_profile")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapSupabaseUser(data);
}

export async function deleteUserProfile(id) {
  const { error } = await supabase.from("users_profile").delete().eq("id", id);
  if (error) throw error;
}

export function permissionsToSupabasePayload(permissions) {
  return permissions;
}

export function seedAdminIfNoAccounts() {
  // Không còn seed localStorage; dữ liệu tài khoản đã chuyển sang Supabase.
}

export function hashPassword(value) {
  return String(value || "");
}
