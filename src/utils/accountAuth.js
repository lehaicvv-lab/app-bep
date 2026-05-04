import { supabase } from "../supabaseClient.js";

export const CURRENT_USER_KEY = "sky_current_user";
export const LEGACY_USER_KEY = "user";
const USERS_TABLE = "users";

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

const MODULE_KEYS = [
  "dashboard",
  "baocao",
  "summary",
  "management",
  "service",
  "accounting",
  "warehouse",
  "bep",
  "doixe",
  "thietbi",
  "antoan",
  "nhansu",
  "bieumau",
  "danhmuc",
  "taikhoan",
];

const MANAGER_OPERATION_MODULES = [
  "dashboard",
  "baocao",
  "summary",
  "management",
  "service",
  "accounting",
  "warehouse",
  "bep",
  "doixe",
  "thietbi",
  "antoan",
  "nhansu",
  "bieumau",
  "danhmuc",
];

const DEFAULT_STAFF_MODULES = ["dashboard", "baocao", "summary"];

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

function normalizeModules(modules, role = "", permissions = null) {
  if (role === "admin") return [...MODULE_KEYS];
  if (role === "manager") {
    if (Array.isArray(modules) && modules.length) {
      return Array.from(
        new Set([...MANAGER_OPERATION_MODULES, ...modules.map((item) => String(item || "").trim().toLowerCase())])
      );
    }
    return [...MANAGER_OPERATION_MODULES];
  }
  if (Array.isArray(modules) && modules.length) {
    return Array.from(
      new Set(
        modules
          .map((item) => String(item || "").trim().toLowerCase())
          .filter((item) => MODULE_KEYS.includes(item) || item in PERMISSION_KEY_MAP)
      )
    );
  }
  if (permissions) {
    return permissionsToModules(permissions, role);
  }
  return [...DEFAULT_STAFF_MODULES];
}

export function normalizePermissions(input, role = "", modulesOverride = null) {
  if (role === "admin") return clonePermissions(FULL_ACCESS);

  if (Array.isArray(modulesOverride)) {
    const next = emptyPermissions();
    next.actions.view = true;
    next.actions.create = true;
    next.actions.edit = true;
    next.actions.print = true;
    modulesOverride.forEach((item) => {
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

  if (Array.isArray(input)) {
    return normalizePermissions(null, role, input);
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

export function permissionsToModules(permissions, role = "staff") {
  if (role === "admin") return [...MODULE_KEYS];
  const normalized = normalizePermissions(permissions, role);
  const modules = [];
  Object.entries(normalized.pages || {}).forEach(([key, value]) => {
    if (!value) return;
    modules.push(key === "baocaongay" ? "baocao" : key);
  });
  Object.entries(normalized.reportTabs || {}).forEach(([key, value]) => {
    if (value) modules.push(key);
  });
  return Array.from(new Set(modules.filter(Boolean)));
}

function readStoredCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function mapSupabaseUser(row) {
  if (!row) return null;
  const modules = normalizeModules(row.modules, row.role, row.permissions);
  const permissions = normalizePermissions(row.permissions, row.role, modules);
  return {
    ...row,
    modules,
    permissions,
    fullName: row.full_name || row.fullName || "",
    area: row.area || "",
    active: row.active !== false,
  };
}

export function getCurrentUser() {
  return mapSupabaseUser(readStoredCurrentUser());
}

export function isLoggedIn() {
  return Boolean(getCurrentUser());
}

export function getCurrentUserPermissions() {
  return getCurrentUser()?.permissions || emptyPermissions();
}

export async function login(username, password) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();

  console.log("INPUT:", cleanUsername, cleanPassword);

  const { data, error } = await supabase.rpc("login_user", {
    username_input: cleanUsername,
    password_input: cleanPassword,
  });

  console.log("RPC RESULT:", data, error ?? null);

  const rpcOk =
    data === true ||
    (Array.isArray(data) && data.length > 0) ||
    (data && typeof data === "object" && !Array.isArray(data));

  if (error || !rpcOk) {
    return false;
  }

  let userData = Array.isArray(data) ? data[0] : data;
  let userError = null;

  if (!userData || typeof userData !== "object" || !("username" in userData)) {
    const result = await supabase
      .from(USERS_TABLE)
      .select("*")
      .ilike("username", cleanUsername)
      .single();
    userData = result.data;
    userError = result.error;
  }

  console.log("USER DATA:", userData ?? null, userError ?? null);

  if (userError || !userData) {
    return false;
  }

  if (userData.active === false) {
    console.log("USER DATA:", { ...userData, loginBlocked: "inactive-user" });
    return false;
  }

  const mappedUser = mapSupabaseUser(userData);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mappedUser));
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(mappedUser));
  return true;
}

export async function authenticateCredentials(username, password) {
  const ok = await login(username, password);
  return {
    ok,
    user: ok ? getCurrentUser() : null,
    message: ok ? "" : "Sai tài khoản hoặc mật khẩu",
  };
}

export function markSessionForUser(user) {
  const mappedUser = mapSupabaseUser(user);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mappedUser));
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(mappedUser));
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function clearAuthSession() {
  logout();
}

export function isAuthSessionValid() {
  const current = getCurrentUser();
  return Boolean(current && current.active);
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event("app-bep-auth-changed"));
}

export async function fetchUsersProfile() {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupabaseUser);
}

export async function createUserProfile(payload) {
  const cleanUsername = String(payload.username || "").trim().toLowerCase();
  const cleanPassword = String(payload.password || "").trim();
  if (!cleanPassword) {
    throw new Error("Mật khẩu không được để trống.");
  }

  const { data, error } = await supabase.rpc("create_user", {
    username_input: cleanUsername,
    password_input: cleanPassword,
  });

  console.log("CREATE USER RESULT", data ?? null, error ?? null);
  if (error) throw error;

  const { data: updatedRow, error: updateError } = await supabase
    .from(USERS_TABLE)
    .update({
      full_name: String(payload.full_name || "").trim(),
      role: String(payload.role || "staff"),
      area: String(payload.area || "").trim(),
      modules: Array.isArray(payload.modules) ? payload.modules : [],
      active: payload.active !== false,
    })
    .eq("username", cleanUsername)
    .select("*")
    .single();

  console.log("UPDATE USER RESULT", updatedRow ?? null, updateError ?? null);
  if (updateError || !updatedRow) throw updateError || new Error("Không tạo được tài khoản.");

  return mapSupabaseUser(updatedRow);
}

export async function updateUserProfile(id, payload) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapSupabaseUser(data);
}

export async function deleteUserProfile(id) {
  const { error } = await supabase.from(USERS_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export function permissionsToSupabasePayload(permissions, role = "staff") {
  return permissionsToModules(permissions, role);
}

export function hashPassword(value) {
  return String(value || "");
}
