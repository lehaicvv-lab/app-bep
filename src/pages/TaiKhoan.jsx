import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createSnapshot,
  downloadBackup,
  ensureAutoSnapshot,
  exportBackupPayload,
  getSnapshotHistory,
  parseBackupText,
  restoreFromBackupPayload,
  rollbackToSnapshot,
} from "../utils/appBackup.js";

const STORAGE_KEY = "app_bep_accounts_v2";
const CURRENT_USER_KEY = "app_bep_current_user_v1";

const PAGE_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "baocaongay", label: "Báo cáo ngày" },
  { key: "doixe", label: "Đội xe" },
  { key: "thietbi", label: "Thiết bị" },
  { key: "antoan", label: "An toàn" },
  { key: "nhansu", label: "Nhân sự" },
  { key: "bieumau", label: "Biểu mẫu" },
  { key: "danhmuc", label: "Danh mục hệ thống" },
  { key: "taikhoan", label: "Tài khoản" },
];

const REPORT_TAB_OPTIONS = [
  { key: "summary", label: "Tổng hợp ngày" },
  { key: "management", label: "Quản lý" },
  { key: "service", label: "Giám sát dịch vụ" },
  { key: "accounting", label: "Kế toán / Thu mua" },
  { key: "warehouse", label: "Kho / QC" },
  { key: "bep", label: "Bếp" },
];

const ACTION_OPTIONS = [
  { key: "view", label: "Xem" },
  { key: "create", label: "Tạo mới" },
  { key: "edit", label: "Chỉnh sửa" },
  { key: "delete", label: "Xóa" },
  { key: "print", label: "In / Xuất PDF" },
];

const EMPTY_PERMISSIONS = {
  pages: {
    dashboard: false,
    baocaongay: false,
    doixe: false,
    thietbi: false,
    antoan: false,
    nhansu: false,
    bieumau: false,
    danhmuc: false,
    taikhoan: false,
  },
  reportTabs: {
    summary: false,
    management: false,
    service: false,
    accounting: false,
    warehouse: false,
    bep: false,
  },
  actions: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    print: false,
  },
};

const ROLE_PRESETS = {
  admin: {
    pages: {
      dashboard: true,
      baocaongay: true,
      doixe: true,
      thietbi: true,
      antoan: true,
      nhansu: true,
      bieumau: true,
      danhmuc: true,
      taikhoan: true,
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
  },
  manager: {
    pages: {
      dashboard: true,
      baocaongay: true,
      doixe: true,
      thietbi: true,
      antoan: true,
      nhansu: true,
      bieumau: true,
      danhmuc: true,
      taikhoan: false,
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
      delete: false,
      print: true,
    },
  },
  staff: {
    pages: {
      dashboard: false,
      baocaongay: true,
      doixe: false,
      thietbi: false,
      antoan: false,
      nhansu: false,
      bieumau: false,
      danhmuc: false,
      taikhoan: false,
    },
    reportTabs: {
      summary: false,
      management: false,
      service: false,
      accounting: false,
      warehouse: false,
      bep: false,
    },
    actions: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      print: true,
    },
  },
};

const INITIAL_FORM = {
  fullName: "",
  username: "",
  password: "",
  role: "staff",
  area: "",
};

const DEFAULT_ACCOUNTS = [
  {
    id: 1,
    fullName: "QUOC HAI",
    username: "admin",
    password: "123456",
    role: "admin",
    area: "Toàn hệ thống",
    active: true,
    permissions: clonePermissions(ROLE_PRESETS.admin),
  },
  {
    id: 2,
    fullName: "Hào FR",
    username: "hao.fr",
    password: "123456",
    role: "staff",
    area: "Nhơn Trạch",
    active: true,
    permissions: {
      pages: {
        dashboard: false,
        report: true,
        safety: false,
        hr: false,
        account: false,
      },
      reportTabs: {
        summary: false,
        management: false,
        service: false,
        accounting: true,
        warehouse: false,
        bep: false,
      },
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        print: true,
      },
    },
  },
];

function clonePermissions(source) {
  return {
    pages: { ...source.pages },
    reportTabs: { ...source.reportTabs },
    actions: { ...source.actions },
  };
}

function normalizePermissions(inputPermissions = EMPTY_PERMISSIONS) {
  const legacyPageMap = {
    report: "baocaongay",
    safety: "antoan",
    hr: "nhansu",
    account: "taikhoan",
  };
  const next = clonePermissions(EMPTY_PERMISSIONS);
  const incomingPages = inputPermissions?.pages || {};
  Object.entries(incomingPages).forEach(([key, value]) => {
    const mapped = legacyPageMap[key] || key;
    if (mapped in next.pages) next.pages[mapped] = Boolean(value);
  });
  const incomingTabs = inputPermissions?.reportTabs || {};
  Object.keys(next.reportTabs).forEach((k) => {
    if (k in incomingTabs) next.reportTabs[k] = Boolean(incomingTabs[k]);
  });
  const incomingActions = inputPermissions?.actions || {};
  Object.keys(next.actions).forEach((k) => {
    if (k in incomingActions) next.actions[k] = Boolean(incomingActions[k]);
  });
  return next;
}

function hashPassword(value) {
  const raw = String(value || "");
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `h:${(hash >>> 0).toString(16)}`;
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ACCOUNTS.map((x) => ({
        ...x,
        password: hashPassword(x.password),
        permissions: normalizePermissions(x.permissions),
      }));
    }
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
    return rows.map((x) => ({
      ...x,
      password: String(x.password || "").startsWith("h:") ? x.password : hashPassword(x.password),
      permissions: normalizePermissions(x.permissions),
    }));
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Quản lý";
  return "Nhân viên";
}

function getInitials(name) {
  if (!name) return "NV";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getEnabledLabels(group, options) {
  return options.filter((item) => group[item.key]).map((item) => item.label);
}

function PermissionGroup({
  title,
  options,
  values,
  onToggle,
  green = false,
}) {
  const allChecked = options.every((item) => values[item.key]);
  const someChecked = options.some((item) => values[item.key]);

  return (
    <div style={styles.permissionCard}>
      <div style={styles.permissionHeader}>
        <div>
          <div style={styles.permissionTitle}>{title}</div>
          <div style={styles.permissionSub}>
            {allChecked
              ? "Đã chọn toàn bộ"
              : someChecked
              ? "Đã chọn một phần"
              : "Chưa chọn quyền nào"}
          </div>
        </div>

        <div style={styles.permissionTopActions}>
          <button
            type="button"
            style={green ? styles.topActionGreen : styles.topAction}
            onClick={() => {
              options.forEach((item) => {
                if (!values[item.key]) onToggle(item.key, true);
              });
            }}
          >
            Chọn tất cả
          </button>

          <button
            type="button"
            style={styles.topAction}
            onClick={() => {
              options.forEach((item) => {
                if (values[item.key]) onToggle(item.key, false);
              });
            }}
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      <div style={styles.permissionGrid}>
        {options.map((item) => (
          <label
            key={item.key}
            style={{
              ...styles.permissionItem,
              borderColor: values[item.key] ? "#86efac" : "#d1d5db",
              background: values[item.key] ? "#f0fdf4" : "#ffffff",
            }}
          >
            <input
              type="checkbox"
              checked={!!values[item.key]}
              onChange={(e) => onToggle(item.key, e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.permissionItemText}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TaiKhoan() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [permissionTargetId, setPermissionTargetId] = useState(null);
  const [snapshotRows, setSnapshotRows] = useState([]);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const backupInputRef = useRef(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setCurrentUsername(localStorage.getItem(CURRENT_USER_KEY) || "admin");
  }, []);

  useEffect(() => {
    try {
      ensureAutoSnapshot();
      setSnapshotRows(getSnapshotHistory());
    } catch {
      // Bỏ qua lỗi snapshot để không chặn màn hình tài khoản
    }
  }, []);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const permissionTarget = useMemo(
    () => accounts.find((item) => item.id === permissionTargetId) || null,
    [accounts, permissionTargetId]
  );

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((item) => item.active).length;
  const managerAccounts = accounts.filter((item) => item.role === "manager").length;
  const latestSnapshotAt = snapshotRows[0]?.createdAt || "";

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const clearNotice = () => {
    setNotice({ type: "", message: "" });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (notice.message) clearNotice();
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.username.trim() ||
      !form.password.trim() ||
      !form.area.trim()
    ) {
      showNotice("error", "Vui lòng nhập đầy đủ họ tên, tài khoản, mật khẩu và khu vực.");
      return;
    }

    const duplicated = accounts.some(
      (item) => item.username.toLowerCase() === form.username.trim().toLowerCase()
    );

    if (duplicated) {
      showNotice("warning", "Tài khoản đã tồn tại. Vui lòng dùng tên tài khoản khác.");
      return;
    }
    if (form.password.trim().length < 6) {
      showNotice("warning", "Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    const preset = ROLE_PRESETS[form.role] || ROLE_PRESETS.staff;

    const newAccount = {
      id: Date.now(),
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      password: hashPassword(form.password.trim()),
      role: form.role,
      area: form.area.trim(),
      active: true,
      permissions: clonePermissions(preset),
    };

    setAccounts((prev) => [newAccount, ...prev]);
    setForm(INITIAL_FORM);
    showNotice("success", `Đã tạo tài khoản "${newAccount.username}".`);
  };

  const handleResetForm = () => {
    setForm(INITIAL_FORM);
    showNotice("info", "Đã làm mới biểu mẫu.");
  };

  const handleToggleStatus = (id) => {
    const target = accounts.find((item) => item.id === id);
    if (!target) return;
    const activeAdmins = accounts.filter((x) => x.role === "admin" && x.active);
    if (target.role === "admin" && target.active && activeAdmins.length <= 1) {
      showNotice("error", "Không thể khóa admin đang hoạt động cuối cùng.");
      return;
    }

    setAccounts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );

    showNotice(
      target.active ? "warning" : "success",
      target.active
        ? `Đã khóa tài khoản "${target.username}".`
        : `Đã mở lại tài khoản "${target.username}".`
    );
  };

  const handleDelete = (id) => {
    const target = accounts.find((item) => item.id === id);
    if (!target) return;
    const activeAdmins = accounts.filter((x) => x.role === "admin" && x.active);
    if (target.role === "admin" && target.active && activeAdmins.length <= 1) {
      showNotice("error", "Không thể xóa admin đang hoạt động cuối cùng.");
      return;
    }

    const ok = window.confirm(`Xóa tài khoản "${target.username}"?`);
    if (!ok) return;

    setAccounts((prev) => prev.filter((item) => item.id !== id));
    if (permissionTargetId === id) setPermissionTargetId(null);
    showNotice("error", `Đã xóa tài khoản "${target.username}".`);
  };

  const applyRolePreset = (accountId, role) => {
    const preset = clonePermissions(ROLE_PRESETS[role] || ROLE_PRESETS.staff);

    setAccounts((prev) =>
      prev.map((item) =>
        item.id === accountId
          ? {
              ...item,
              role,
              permissions: preset,
            }
          : item
      )
    );

    showNotice("success", `Đã áp dụng quyền mặc định cho ${roleLabel(role)}.`);
  };

  const updatePermissionValue = (accountId, section, key, checked) => {
    setAccounts((prev) =>
      prev.map((item) =>
        item.id === accountId
          ? {
              ...item,
              permissions: {
                ...item.permissions,
                [section]: {
                  ...item.permissions[section],
                  [key]: checked,
                },
              },
            }
          : item
      )
    );
  };

  const handleSwitchCurrentUser = (username) => {
    setCurrentUsername(username);
    localStorage.setItem(CURRENT_USER_KEY, username);
    showNotice("info", `Đã chuyển tài khoản thao tác sang "${username}".`);
  };

  const refreshSnapshots = () => {
    setSnapshotRows(getSnapshotHistory());
  };

  const handleCreateSnapshotNow = () => {
    try {
      createSnapshot("Snapshot thủ công", "manual");
      refreshSnapshots();
      showNotice("success", "Đã tạo snapshot rollback an toàn.");
    } catch (error) {
      showNotice("error", error?.message || "Không thể tạo snapshot.");
    }
  };

  const handleExportBackup = () => {
    try {
      const payload = exportBackupPayload("Backup thủ công");
      downloadBackup(payload);
      showNotice("success", `Đã tải backup (${payload.entryCount} key dữ liệu).`);
    } catch (error) {
      showNotice("error", error?.message || "Không thể xuất backup.");
    }
  };

  const handleOpenRestorePicker = () => {
    if (backupInputRef.current) {
      backupInputRef.current.value = "";
      backupInputRef.current.click();
    }
  };

  const handleRestoreFromFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoreBusy(true);
    try {
      const text = await file.text();
      const payload = parseBackupText(text);
      const ok = window.confirm(
        `Khôi phục backup "${file.name}" (${payload.entries.length} key dữ liệu)?\nHệ thống sẽ tự tạo snapshot trước khi khôi phục.`
      );
      if (!ok) return;
      restoreFromBackupPayload(payload, file.name);
      setAccounts(loadAccounts());
      refreshSnapshots();
      showNotice("success", "Khôi phục dữ liệu thành công. Đã tự tạo snapshot trước/sau restore.");
    } catch (error) {
      showNotice("error", error?.message || "Khôi phục thất bại.");
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleRollback = (snapshotId, label) => {
    const ok = window.confirm(`Rollback về snapshot "${label}"?`);
    if (!ok) return;
    try {
      rollbackToSnapshot(snapshotId);
      setAccounts(loadAccounts());
      refreshSnapshots();
      showNotice("warning", "Đã rollback dữ liệu theo snapshot đã chọn.");
    } catch (error) {
      showNotice("error", error?.message || "Rollback thất bại.");
    }
  };

  return (
    <div className="ops-standard-page" style={styles.page}>
      <div style={styles.heroCard}>
        <div>
          <h1 style={styles.heroTitle}>Quản lý tài khoản & phân quyền nhân viên</h1>
          <p style={styles.heroDesc}>
            Tạo tài khoản, gán vai trò và thiết lập chính xác nhân viên được thấy mục nào,
            thao tác mục nào trong hệ thống.
          </p>
        </div>

        <div style={styles.summaryGroup}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Tổng tài khoản</div>
            <div style={styles.summaryValue}>{totalAccounts}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Đang hoạt động</div>
            <div style={{ ...styles.summaryValue, color: "#15803d" }}>{activeAccounts}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Quản lý</div>
            <div style={{ ...styles.summaryValue, color: "#166534" }}>{managerAccounts}</div>
          </div>
          <div style={{ ...styles.summaryCard, minWidth: 260 }}>
            <div style={styles.summaryLabel}>Tài khoản đang sử dụng</div>
            <select
              style={{ ...styles.input, height: 42 }}
              value={currentUsername}
              onChange={(e) => handleSwitchCurrentUser(e.target.value)}
            >
              {accounts
                .filter((x) => x.active)
                .map((x) => (
                  <option key={x.id} value={x.username}>
                    {x.username} ({roleLabel(x.role)})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {notice.message ? (
        <div style={getNoticeStyle(notice.type)}>
          <span>{notice.message}</span>
          <button type="button" onClick={clearNotice} style={styles.noticeCloseButton}>
            Đóng
          </button>
        </div>
      ) : null}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Tạo tài khoản mới</h2>
            <p style={styles.cardDesc}>
              Dùng biểu mẫu này để tạo user theo đúng cấu trúc: ID, Họ tên, Chức vụ,
              Khu vực, Quyền thao tác, Mật khẩu.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAccount}>
          <div style={styles.formGrid}>
            <div style={styles.formItem}>
              <label style={styles.label}>Họ tên</label>
              <input
                style={styles.input}
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="Nhập họ tên"
              />
            </div>

            <div style={styles.formItem}>
              <label style={styles.label}>Tài khoản</label>
              <input
                style={styles.input}
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="Nhập tài khoản"
              />
            </div>

            <div style={styles.formItem}>
              <label style={styles.label}>Mật khẩu</label>
              <input
                type="password"
                style={styles.input}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Nhập mật khẩu"
              />
            </div>

            <div style={styles.formItem}>
              <label style={styles.label}>Chức vụ</label>
              <select
                style={styles.input}
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
              >
                <option value="staff">Nhân viên</option>
                <option value="manager">Quản lý</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ ...styles.formItem, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Khu vực</label>
              <input
                style={styles.input}
                value={form.area}
                onChange={(e) => handleChange("area", e.target.value)}
                placeholder="Ví dụ: Củ Chi / Dầu Giây / Bình Dương"
              />
            </div>
          </div>

          <div style={styles.helperRow}>
            <div style={styles.helperChipGreen}>Admin: toàn quyền</div>
            <div style={styles.helperChipYellow}>Quản lý: thao tác theo phần được giao</div>
            <div style={styles.helperChipOrange}>Nhân viên: chỉ thấy mục được phân</div>
          </div>

          <div style={styles.actionRow}>
            <button type="submit" style={styles.primaryButton}>
              Tạo tài khoản
            </button>
            <button type="button" style={styles.secondaryButton} onClick={handleResetForm}>
              Làm mới
            </button>
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Danh sách tài khoản</h2>
            <p style={styles.cardDesc}>
              Mỗi tài khoản có thể mở phân quyền chi tiết để quyết định nhân viên được
              thấy gì, thao tác được gì.
            </p>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Họ tên</th>
                <th style={styles.th}>Chức vụ</th>
                <th style={styles.th}>Khu vực</th>
                <th style={styles.th}>Quyền thao tác</th>
                <th style={styles.th}>Mật khẩu</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {accounts.map((item) => {
                const pageLabels = getEnabledLabels(item.permissions.pages, PAGE_OPTIONS);
                const tabLabels = getEnabledLabels(item.permissions.reportTabs, REPORT_TAB_OPTIONS);

                return (
                  <tr key={item.id}>
                    <td style={styles.tdStrong}>{item.id}</td>

                    <td style={styles.td}>
                      <div style={styles.personCell}>
                        <div style={styles.avatarCircle}>{getInitials(item.fullName)}</div>
                        <div>
                          <div style={styles.personName}>{item.fullName}</div>
                          <div style={styles.personSub}>{item.username}</div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={getRoleBadgeStyle(item.role)}>{roleLabel(item.role)}</span>
                    </td>

                    <td style={styles.td}>{item.area}</td>

                    <td style={styles.td}>
                      <div style={styles.permissionPreview}>
                        <div>
                          <span style={styles.previewLabel}>Mục thấy:</span>{" "}
                          {pageLabels.length > 0 ? pageLabels.join(", ") : "Chưa cấp"}
                        </div>
                        <div>
                          <span style={styles.previewLabel}>Báo cáo ngày:</span>{" "}
                          {tabLabels.length > 0 ? tabLabels.join(", ") : "Chưa cấp"}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdMono}>******</td>

                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(item.active)}>
                        {item.active ? "Đang hoạt động" : "Đã khóa"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.tableButtonWrap}>
                        <button
                          type="button"
                          style={styles.permissionButton}
                          onClick={() => setPermissionTargetId(item.id)}
                        >
                          Phân quyền
                        </button>

                        <button
                          type="button"
                          style={styles.outlineButton}
                          onClick={() => handleToggleStatus(item.id)}
                        >
                          {item.active ? "Khóa" : "Mở"}
                        </button>

                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() => handleDelete(item.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Sao lưu dữ liệu hệ thống</h2>
            <p style={styles.cardDesc}>
              Backup/Restore cho toàn bộ Sky Catering Operations và rollback theo snapshot nếu thao tác sai.
            </p>
          </div>
        </div>
        <div style={styles.helperRow}>
          <div style={styles.helperChipGreen}>Snapshot gần nhất: {latestSnapshotAt ? new Date(latestSnapshotAt).toLocaleString("vi-VN") : "Chưa có"}</div>
          <div style={styles.helperChipYellow}>Số snapshot lưu trong máy: {snapshotRows.length}</div>
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.primaryButton} onClick={handleExportBackup}>
            Tải file backup (.json)
          </button>
          <button type="button" style={styles.secondaryButton} onClick={handleOpenRestorePicker} disabled={restoreBusy}>
            Khôi phục từ file backup
          </button>
          <button type="button" style={styles.secondaryButton} onClick={handleCreateSnapshotNow}>
            Tạo snapshot ngay
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleRestoreFromFile}
          />
        </div>
        <div style={styles.snapshotList}>
          {snapshotRows.length === 0 ? (
            <div style={styles.snapshotEmpty}>Chưa có snapshot.</div>
          ) : (
            snapshotRows.map((row) => (
              <div key={row.id} style={styles.snapshotItem}>
                <div style={styles.snapshotMeta}>
                  <strong>{row.label}</strong>
                  <span>{new Date(row.createdAt).toLocaleString("vi-VN")} · {row.entryCount || 0} key</span>
                </div>
                <button
                  type="button"
                  style={styles.outlineButton}
                  onClick={() => handleRollback(row.id, row.label)}
                >
                  Rollback snapshot này
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {permissionTarget ? (
        <div style={styles.overlay}>
          <div style={styles.permissionModal}>
            <div style={styles.permissionModalHeader}>
              <div>
                <h3 style={styles.permissionModalTitle}>
                  Phân quyền nhân viên · {permissionTarget.fullName}
                </h3>
                <p style={styles.permissionModalDesc}>
                  Thiết lập rõ tài khoản này được thấy mục nào và được thao tác ở đâu.
                </p>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setPermissionTargetId(null)}
              >
                Đóng
              </button>
            </div>

            <div style={styles.presetRow}>
              <button
                type="button"
                style={styles.presetGreenButton}
                onClick={() => applyRolePreset(permissionTarget.id, "staff")}
              >
                Áp dụng role Nhân viên
              </button>

              <button
                type="button"
                style={styles.presetYellowButton}
                onClick={() => applyRolePreset(permissionTarget.id, "manager")}
              >
                Áp dụng role Quản lý
              </button>

              <button
                type="button"
                style={styles.presetDarkButton}
                onClick={() => applyRolePreset(permissionTarget.id, "admin")}
              >
                Áp dụng role Admin
              </button>
            </div>

            <div style={styles.permissionSummaryBox}>
              <div style={styles.permissionSummaryItem}>
                <div style={styles.permissionSummaryLabel}>Nhân viên thấy mục</div>
                <div style={styles.permissionSummaryText}>
                  {getEnabledLabels(permissionTarget.permissions.pages, PAGE_OPTIONS).join(", ") || "Chưa cấp"}
                </div>
              </div>

              <div style={styles.permissionSummaryItem}>
                <div style={styles.permissionSummaryLabel}>Được thao tác báo cáo ngày</div>
                <div style={styles.permissionSummaryText}>
                  {getEnabledLabels(permissionTarget.permissions.reportTabs, REPORT_TAB_OPTIONS).join(", ") || "Chưa cấp"}
                </div>
              </div>

              <div style={styles.permissionSummaryItem}>
                <div style={styles.permissionSummaryLabel}>Thao tác được phép</div>
                <div style={styles.permissionSummaryText}>
                  {getEnabledLabels(permissionTarget.permissions.actions, ACTION_OPTIONS).join(", ") || "Chưa cấp"}
                </div>
              </div>
            </div>

            <div style={styles.permissionBody}>
              <PermissionGroup
                title="Quyền truy cập menu / trang"
                options={PAGE_OPTIONS}
                values={permissionTarget.permissions.pages}
                onToggle={(key, checked) =>
                  updatePermissionValue(permissionTarget.id, "pages", key, checked)
                }
                green
              />

              <PermissionGroup
                title="Quyền hiển thị trong Báo cáo ngày"
                options={REPORT_TAB_OPTIONS}
                values={permissionTarget.permissions.reportTabs}
                onToggle={(key, checked) =>
                  updatePermissionValue(permissionTarget.id, "reportTabs", key, checked)
                }
              />

              <PermissionGroup
                title="Quyền thao tác dữ liệu"
                options={ACTION_OPTIONS}
                values={permissionTarget.permissions.actions}
                onToggle={(key, checked) =>
                  updatePermissionValue(permissionTarget.id, "actions", key, checked)
                }
              />
            </div>

            <div style={styles.permissionFooter}>
              <div style={styles.footerHint}>
                Ví dụ: Hảo là <b>Kế toán / Thu mua</b> thì chỉ cần bật:
                <b> Báo cáo ngày</b> + tab <b>Kế toán / Thu mua</b>.
              </div>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  showNotice("success", `Đã lưu phân quyền cho "${permissionTarget.username}".`);
                  setPermissionTargetId(null);
                }}
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getNoticeStyle(type) {
  const base = {
    borderRadius: 16,
    padding: "14px 16px",
    border: "1px solid transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 14,
    fontWeight: 600,
  };

  if (type === "success") {
    return {
      ...base,
      background: "#dcfce7",
      border: "1px solid #bbf7d0",
      color: "#166534",
    };
  }

  if (type === "warning") {
    return {
      ...base,
      background: "#fef3c7",
      border: "1px solid #fde68a",
      color: "#92400e",
    };
  }

  if (type === "info") {
    return {
      ...base,
      background: "#ffedd5",
      border: "1px solid #fdba74",
      color: "#c2410c",
    };
  }

  return {
    ...base,
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
  };
}

function getRoleBadgeStyle(role) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid transparent",
  };

  if (role === "admin") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (role === "manager") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#a16207",
      border: "1px solid #fde68a",
    };
  }

  return {
    ...base,
    background: "#ecfccb",
    color: "#3f6212",
    border: "1px solid #d9f99d",
  };
}

function getStatusBadgeStyle(active) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 130,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    background: active ? "#dcfce7" : "#fff7ed",
    color: active ? "#166534" : "#c2410c",
    border: active ? "1px solid #bbf7d0" : "1px solid #fdba74",
  };
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  heroCard: {
    background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
    border: "1px solid #d1fae5",
    borderRadius: 20,
    padding: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },

  heroTitle: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#14532d",
  },

  heroDesc: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 15,
    lineHeight: 1.6,
    color: "#64748b",
    maxWidth: 780,
  },

  summaryGroup: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  summaryCard: {
    minWidth: 150,
    background: "#ffffff",
    border: "1px solid #d1fae5",
    borderRadius: 16,
    padding: "16px 18px",
    boxShadow: "0 8px 20px rgba(22,101,52,0.06)",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: 600,
  },

  summaryValue: {
    fontSize: 30,
    color: "#14532d",
    fontWeight: 800,
    lineHeight: 1,
  },

  noticeCloseButton: {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.45)",
    background: "rgba(255,255,255,0.35)",
    color: "inherit",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
  },

  cardHeader: {
    marginBottom: 18,
  },

  cardTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#14532d",
  },

  cardDesc: {
    margin: "8px 0 0",
    fontSize: 15,
    color: "#6b7280",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },

  formItem: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
  },

  label: {
    display: "block",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 700,
    color: "#14532d",
  },

  input: {
    width: "100%",
    height: 50,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 15,
    fontWeight: 400,
    color: "#111827",
    background: "#ffffff",
    boxSizing: "border-box",
    outline: "none",
  },

  helperRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },

  helperChipGreen: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #bbf7d0",
  },

  helperChipYellow: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fef9c3",
    color: "#a16207",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #fde68a",
  },

  helperChipOrange: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#ffedd5",
    color: "#c2410c",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #fdba74",
  },

  actionRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 20,
  },

  primaryButton: {
    height: 48,
    padding: "0 22px",
    borderRadius: 12,
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(22,163,74,0.18)",
  },

  secondaryButton: {
    height: 48,
    padding: "0 22px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#14532d",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },

  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
  },

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 1380,
  },

  th: {
    background: "#f0fdf4",
    textAlign: "left",
    padding: "15px 16px",
    fontSize: 14,
    fontWeight: 800,
    color: "#14532d",
    borderBottom: "1px solid #d1fae5",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px 16px",
    fontSize: 14,
    fontWeight: 400,
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    background: "#ffffff",
  },

  tdStrong: {
    padding: "15px 16px",
    fontSize: 14,
    fontWeight: 800,
    color: "#14532d",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    background: "#ffffff",
  },

  tdMono: {
    padding: "15px 16px",
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    background: "#ffffff",
  },

  personCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800,
    flexShrink: 0,
  },

  personName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.4,
  },

  personSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  permissionPreview: {
    display: "grid",
    gap: 8,
    lineHeight: 1.5,
    color: "#334155",
  },

  previewLabel: {
    fontWeight: 800,
    color: "#166534",
  },

  tableButtonWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  permissionButton: {
    height: 38,
    padding: "0 15px",
    borderRadius: 10,
    border: "1px solid #86efac",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  outlineButton: {
    height: 38,
    padding: "0 15px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#14532d",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerButton: {
    height: 38,
    padding: "0 15px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#be123c",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 999,
  },

  permissionModal: {
    width: "min(1200px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid #d1fae5",
    boxShadow: "0 30px 60px rgba(15,23,42,0.20)",
    padding: 22,
  },

  permissionModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  permissionModalTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#14532d",
  },

  permissionModalDesc: {
    margin: "8px 0 0",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#64748b",
  },

  closeButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#14532d",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  presetRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  presetGreenButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  presetYellowButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid #fde68a",
    background: "#fefce8",
    color: "#a16207",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  presetDarkButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid #14532d",
    background: "#166534",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  permissionSummaryBox: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 18,
  },

  permissionSummaryItem: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
  },

  permissionSummaryLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 8,
  },

  permissionSummaryText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#14532d",
    fontWeight: 700,
  },

  permissionBody: {
    display: "grid",
    gap: 16,
  },

  permissionCard: {
    border: "1px solid #d1fae5",
    borderRadius: 18,
    padding: 18,
    background: "#ffffff",
  },

  permissionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
    flexWrap: "wrap",
  },

  permissionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#14532d",
    marginBottom: 4,
  },

  permissionSub: {
    fontSize: 13,
    color: "#64748b",
  },

  permissionTopActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  topAction: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#14532d",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  topActionGreen: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  permissionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },

  permissionItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    border: "1px solid #d1d5db",
    borderRadius: 14,
    padding: "0 14px",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#16a34a",
    cursor: "pointer",
  },

  permissionItemText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#14532d",
  },

  permissionFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
  },

  footerHint: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#475569",
  },

  snapshotList: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },

  snapshotEmpty: {
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    padding: 14,
    color: "#64748b",
    fontSize: 14,
    fontWeight: 600,
    background: "#f8fafc",
  },

  snapshotItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    background: "#ffffff",
  },

  snapshotMeta: {
    display: "grid",
    gap: 4,
    color: "#334155",
    fontSize: 13,
  },
};