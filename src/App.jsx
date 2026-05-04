import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "./styles/ops-standard.css";

import {
  clearAuthSession,
  getCurrentUser,
  isAuthSessionValid,
  login,
  notifyAuthChanged,
} from "./utils/accountAuth.js";
import Dashboard from "./pages/Dashboard";
import BaoCaoVanHanhBepForm from "./pages/BaoCaoVanHanhBepForm";
import AnToan from "./pages/AnToan";
import TaiKhoan from "./pages/TaiKhoan";
import Nhansu from "./pages/Nhansu";
import Doixe from "./pages/Doixe";
import Thietbi from "./pages/Thietbi";
import SystemCatalog from "./pages/SystemCatalog.jsx";
import Bieumau from "./pages/Bieumau";
import {
  IconChevronsLeft,
  IconChevronsRight,
  IconSidebarDashboard,
  IconSidebarForm,
  IconSidebarReport,
  IconSidebarSettings,
  IconSidebarShield,
  IconSidebarTruck,
  IconSidebarUsers,
  IconSidebarWrench,
} from "./components/SidebarIcons.jsx";

function fullAccessPermissions() {
  return {
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
  };
}

function getPermissionContext() {
  const current = getCurrentUser();
  if (!current?.permissions) return fullAccessPermissions();
  if (current.role === "admin") return fullAccessPermissions();
  const pages = { ...fullAccessPermissions().pages };
  Object.entries(current.permissions.pages || {}).forEach(([key, value]) => {
    if (key in pages) pages[key] = Boolean(value);
  });
  const reportTabs = { ...fullAccessPermissions().reportTabs };
  Object.entries(current.permissions.reportTabs || {}).forEach(([key, value]) => {
    if (key in reportTabs) reportTabs[key] = Boolean(value);
  });
  return { pages, reportTabs };
}

function App() {
  const [authTick, setAuthTick] = useState(0);
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportTab, setReportTab] = useState("summary");
  const [fleetMenuOpen, setFleetMenuOpen] = useState(false);
  const [fleetTab, setFleetTab] = useState("nhatky");
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const [assetTab, setAssetTab] = useState("overview");
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [safetyTab, setSafetyTab] = useState("incident");
  const [nhansuMenuOpen, setNhansuMenuOpen] = useState(false);
  const [nhansuTab, setNhansuTab] = useState("overview");
  const [bieumauMenuOpen, setBieumauMenuOpen] = useState(false);
  const [activeFormGroup, setActiveFormGroup] = useState("bien-ban");
  const [activeFormType, setActiveFormType] = useState("bien-ban-vi-pham");
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    if (assetTab === "catalog") setAssetTab("overview");
  }, [assetTab]);

  useEffect(() => {
    const bump = () => setAuthTick((t) => t + 1);
    window.addEventListener("app-bep-auth-changed", bump);
    return () => window.removeEventListener("app-bep-auth-changed", bump);
  }, []);

  const permissionCtx = useMemo(() => {
    void authTick;
    return getPermissionContext();
  }, [authTick]);
  const currentUser = useMemo(() => {
    void authTick;
    return getCurrentUser();
  }, [authTick]);
  const canAccessPage = (pageKey) => Boolean(permissionCtx.pages?.[pageKey]);
  const canAccessReportTab = (tabKey) => Boolean(permissionCtx.reportTabs?.[tabKey]);

  const mainMenu = [
    { key: "dashboard", label: "Dashboard", Icon: IconSidebarDashboard },
    { key: "baocaongay", label: "Báo cáo", Icon: IconSidebarReport },
    { key: "doixe", label: "Đội xe", Icon: IconSidebarTruck },
    { key: "thietbi", label: "Thiết bị", Icon: IconSidebarWrench },
    { key: "antoan", label: "An toàn", Icon: IconSidebarShield },
    { key: "nhansu", label: "Nhân sự", Icon: IconSidebarUsers },
    { key: "bieumau", label: "Biểu mẫu", Icon: IconSidebarForm },
  ];

  const settingsMenu = [
    { key: "danhmuc", label: "Danh mục hệ thống" },
    { key: "taikhoan", label: "Tài khoản" },
  ];
  const reportSubmenu = [
    { key: "summary", label: "Tổng hợp ngày" },
    { key: "management", label: "Quản lý" },
    { key: "service", label: "Giám sát dịch vụ" },
    { key: "accounting", label: "Kế toán kho" },
    { key: "warehouse", label: "Kế toán sản xuất" },
    { key: "bep", label: "Bếp" },
  ];
  const fleetSubmenu = [
    { key: "nhatky", label: "Nhật ký xe" },
    { key: "lichtuan", label: "Lịch trình tuần" },
    { key: "kiemtra", label: "Kiểm tra xe" },
    { key: "tonghop", label: "Tổng hợp tháng" },
  ];
  const safetySubmenu = [
    { key: "incident", label: "Sự cố / vi phạm" },
    { key: "checklist", label: "Checklist SOP" },
    { key: "summary", label: "Tổng hợp" },
  ];
  const nhansuSubmenu = [
    { key: "overview", label: "Tổng quan", page: "nhansu" },
    { key: "attendance", label: "Điểm danh ngày", page: "nhansu" },
    { key: "timesheet", label: "Chấm công", page: "nhansu" },
    { key: "evaluation", label: "Đánh giá", page: "nhansu" },
  ];
  const bieumauSubmenu = [
    { key: "bien-ban", label: "Biên bản" },
    { key: "giai-trinh", label: "Giải trình" },
    { key: "thong-bao", label: "Thông báo" },
    { key: "tai-chinh", label: "Tài chính" },
  ];
  const formTypeByGroup = {
    "bien-ban": [
      { key: "bien-ban-vi-pham", label: "Biên bản vi phạm" },
      { key: "bien-ban-lam-viec", label: "Biên bản làm việc" },
      { key: "bien-ban-cuoc-hop", label: "Biên bản cuộc họp" },
    ],
    "giai-trinh": [
      { key: "van-ban-giai-trinh", label: "Văn bản giải trình" },
      { key: "to-tuong-trinh", label: "Tờ tường trình" },
    ],
    "thong-bao": [
      { key: "thong-bao-noi-bo", label: "Thông báo nội bộ" },
      { key: "thong-bao-xu-ly-vi-pham", label: "Thông báo xử lý vi phạm" },
    ],
    "tai-chinh": [
      { key: "de-nghi-thanh-toan", label: "Đề nghị thanh toán" },
      { key: "de-nghi-mua-hang", label: "Đề nghị mua hàng" },
      { key: "chi-phi-phat-sinh", label: "Xác nhận chi phí phát sinh" },
    ],
  };
  const assetSubmenu = [
    { key: "overview", label: "Tổng quan" },
    { key: "equipment", label: "Thiết bị lớn" },
    { key: "ccdc", label: "CCDC" },
    { key: "repairs", label: "Lịch sử sửa chữa" },
    { key: "transfers", label: "Cấp phát / điều chuyển" },
    { key: "alerts", label: "Cảnh báo" },
  ];

  const isSettingsActive = settingsMenu.some((item) => item.key === page);

  const resetManagementReportStorage = () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("sky-catering-ops-report:management:") || k.includes("::management")) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
      if (keys.length) {
        console.log("[REPORT] reset management keys:", keys);
      }
    } catch (error) {
      console.error("[REPORT] reset management storage failed:", error);
    }
  };

  const handleSelectPage = (nextPage) => {
    if (!canAccessPage(nextPage)) return;
    setPage(nextPage);
    setSettingsOpen(false);
    if (nextPage !== "baocaongay") {
      setReportMenuOpen(false);
    }
    if (nextPage !== "doixe") {
      setFleetMenuOpen(false);
    }
    if (nextPage !== "antoan") {
      setSafetyMenuOpen(false);
    }
    if (nextPage !== "thietbi") {
      setAssetMenuOpen(false);
    }
    if (nextPage !== "nhansu") {
      setNhansuMenuOpen(false);
    }
    if (nextPage !== "bieumau") {
      setBieumauMenuOpen(false);
    }
  };

  const handleSelectReportTab = (tabKey) => {
    if (!canAccessPage("baocaongay") || !canAccessReportTab(tabKey)) return;
    setPage("baocaongay");
    setReportTab(tabKey);
    setReportMenuOpen(true);
    setSettingsOpen(false);
    setNhansuMenuOpen(false);
    setBieumauMenuOpen(false);
  };
  const handleSelectFleetTab = (tabKey) => {
    if (!canAccessPage("doixe")) return;
    setFleetTab(tabKey);
    setPage("doixe");
    setFleetMenuOpen(true);
    setSettingsOpen(false);
    setNhansuMenuOpen(false);
    setBieumauMenuOpen(false);
  };
  const handleSelectSafetyTab = (tabKey) => {
    if (!canAccessPage("antoan")) return;
    setSafetyTab(tabKey);
    setPage("antoan");
    setSafetyMenuOpen(true);
    setSettingsOpen(false);
    setNhansuMenuOpen(false);
    setBieumauMenuOpen(false);
  };
  const handleSelectAssetTab = (tabKey) => {
    if (!canAccessPage("thietbi")) return;
    setAssetTab(tabKey);
    setPage("thietbi");
    setAssetMenuOpen(true);
    setSettingsOpen(false);
    setNhansuMenuOpen(false);
    setBieumauMenuOpen(false);
  };

  const handleSelectNhansuSub = (sub) => {
    if (sub.page && !canAccessPage(sub.page)) return;
    setPage(sub.page);
    if (sub.page === "nhansu") {
      setNhansuTab(sub.key);
    }
    setNhansuMenuOpen(true);
    setSettingsOpen(false);
    setReportMenuOpen(false);
    setFleetMenuOpen(false);
    setAssetMenuOpen(false);
    setSafetyMenuOpen(false);
    setBieumauMenuOpen(false);
  };

  const defaultTypeByGroup = {
    "bien-ban": "bien-ban-vi-pham",
    "giai-trinh": "van-ban-giai-trinh",
    "thong-bao": "thong-bao-noi-bo",
    "tai-chinh": "de-nghi-thanh-toan",
  };

  const handleSelectBieumauGroup = (groupKey) => {
    if (!canAccessPage("bieumau")) return;
    setPage("bieumau");
    setActiveFormGroup(groupKey);
    setActiveFormType(defaultTypeByGroup[groupKey] || "");
    setBieumauMenuOpen(true);
    setSettingsOpen(false);
    setReportMenuOpen(false);
    setFleetMenuOpen(false);
    setAssetMenuOpen(false);
    setSafetyMenuOpen(false);
    setNhansuMenuOpen(false);
  };

  const handleSelectBieumauType = (typeKey) => {
    if (!canAccessPage("bieumau")) return;
    setPage("bieumau");
    setActiveFormType(typeKey);
    setBieumauMenuOpen(true);
    setSettingsOpen(false);
    setReportMenuOpen(false);
    setFleetMenuOpen(false);
    setAssetMenuOpen(false);
    setSafetyMenuOpen(false);
    setNhansuMenuOpen(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
    setSettingsOpen(false);
    setReportMenuOpen(false);
    setFleetMenuOpen(false);
    setAssetMenuOpen(false);
    setSafetyMenuOpen(false);
    setNhansuMenuOpen(false);
    setBieumauMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!settingsMenuRef.current) return;
      if (!settingsMenuRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const sessionOk = isAuthSessionValid();

  useEffect(() => {
    if (!sessionOk) return;
    if (page === "taikhoan" && currentUser?.role !== "admin") {
      setPage("dashboard");
      return;
    }
    if (!canAccessPage(page)) {
      setPage("dashboard");
      return;
    }
    if (page === "baocaongay" && !canAccessReportTab(reportTab)) {
      const fallbackTab = reportSubmenu.find((item) => canAccessReportTab(item.key))?.key || "summary";
      setReportTab(fallbackTab);
    }
  }, [sessionOk, page, reportTab, currentUser, permissionCtx]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    console.log("[login] input:", {
      username,
      passwordLength: password.length,
    });
    if (!username || !password) {
      setLoginError("Nhập đủ tài khoản và mật khẩu.");
      return;
    }
    const ok = await login(username, password);
    const current = getCurrentUser();
    console.log("[login] auth result:", {
      ok,
      username: current?.username || "",
      role: current?.role || "",
    });
    if (!ok) {
      setLoginError("Sai tài khoản hoặc mật khẩu");
      return;
    }
    setLoginError("");
    setPage("dashboard");
    window.history.replaceState({}, "", "/dashboard");
    notifyAuthChanged();
  };

  const handleLogoutClick = () => {
    clearAuthSession();
    setLoginError("");
    notifyAuthChanged();
    setPage("dashboard");
    setSettingsOpen(false);
  };

  const renderPage = () => {
    if (!canAccessPage(page)) {
      return <Dashboard />;
    }
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "baocaongay":
        console.log("TAB:", reportTab);
        switch (reportTab) {
          case "summary":
            return <BaoCaoVanHanhBepForm initialTab="summary" onTabChange={setReportTab} />;
          case "management":
            return <BaoCaoVanHanhBepForm initialTab="management" onTabChange={setReportTab} />;
          case "service":
            return <BaoCaoVanHanhBepForm initialTab="service" onTabChange={setReportTab} />;
          case "warehouse":
            return <BaoCaoVanHanhBepForm initialTab="warehouse" onTabChange={setReportTab} />;
          case "accounting":
            return <BaoCaoVanHanhBepForm initialTab="accounting" onTabChange={setReportTab} />;
          case "bep":
            return <BaoCaoVanHanhBepForm initialTab="bep" onTabChange={setReportTab} />;
          default:
            return <BaoCaoVanHanhBepForm initialTab="summary" onTabChange={setReportTab} />;
        }
      case "antoan":
        return <AnToan initialTab={safetyTab} onTabChange={setSafetyTab} />;
      case "danhmuc":
        return <SystemCatalog />;
      case "taikhoan":
        return <TaiKhoan />;
      case "nhansu":
        return <Nhansu initialTab={nhansuTab} />;
      case "doixe":
        return <Doixe initialTab={fleetTab} onTabChange={setFleetTab} />;
      case "thietbi":
        return (
          <Thietbi
            initialTab={
              assetTab === "monthly" || assetTab === "catalog" ? "overview" : assetTab
            }
          />
        );
      case "bieumau":
        return (
          <Bieumau
            initialType={activeFormType}
            activeFormGroup={activeFormGroup}
            activeFormType={activeFormType}
            onSelectFormType={handleSelectBieumauType}
            formTypeOptions={formTypeByGroup[activeFormGroup] || []}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  if (!sessionOk) {
    return (
      <div className="app-login-screen">
        <form className="app-login-card" onSubmit={handleLoginSubmit}>
          <div className="app-login-brand">Sky Catering Operations</div>
          <p className="app-login-lead">Đăng nhập để tiếp tục.</p>
          <label className="app-login-label">
            Tài khoản
            <input className="app-login-input" name="username" autoComplete="username" />
          </label>
          <label className="app-login-label">
            Mật khẩu
            <input
              className="app-login-input"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
            />
          </label>
          {loginError ? <div className="app-login-error">{loginError}</div> : null}
          <button type="submit" className="app-login-submit">
            Đăng nhập
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`left-sidebar no-print ${isCollapsed ? "collapsed" : ""}`}>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          title={isCollapsed ? "Mở rộng" : "Thu gọn"}
        >
          {isCollapsed ? <IconChevronsRight /> : <IconChevronsLeft />}
        </button>
        <div className="sidebar-brand">
          <div className="sidebar-title">{isCollapsed ? "SCO" : "Sky Catering Operations"}</div>
          {!isCollapsed ? (
            <div className="sidebar-subtitle">Hệ thống quản lý vận hành suất ăn công nghiệp</div>
          ) : null}
          <button type="button" className="sidebar-logout-btn no-print" onClick={handleLogoutClick} title="Đăng xuất">
            {isCollapsed ? "⎋" : `Đăng xuất (${currentUser?.username || "—"})`}
          </button>
        </div>

        <nav className="sidebar-menu">
          {mainMenu.map((item) => {
            if (!canAccessPage(item.key)) return null;
            const ItemIcon = item.Icon;
            if (item.key === "baocaongay") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${
                      page === item.key ? "active" : ""
                    }`}
                    onClick={() => {
                      setPage("baocaongay");
                      setReportTab("summary");
                      setReportMenuOpen((prev) => (page === "baocaongay" ? !prev : true));
                      setSettingsOpen(false);
                    }}
                    aria-expanded={reportMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? (
                      <span className="sidebar-menu-caret">{reportMenuOpen ? "▾" : "▸"}</span>
                    ) : null}
                  </button>

                  {!isCollapsed && reportMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {reportSubmenu.filter((sub) => canAccessReportTab(sub.key)).map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${
                            page === "baocaongay" && reportTab === sub.key ? "active" : ""
                          }`}
                          onClick={() => handleSelectReportTab(sub.key)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.key === "doixe") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${
                      page === item.key ? "active" : ""
                    }`}
                    onClick={() => {
                      setPage("doixe");
                      setFleetMenuOpen((prev) => !prev);
                      setSettingsOpen(false);
                    }}
                    aria-expanded={fleetMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? (
                      <span className="sidebar-menu-caret">{fleetMenuOpen ? "▾" : "▸"}</span>
                    ) : null}
                  </button>
                  {!isCollapsed && fleetMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {fleetSubmenu.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${
                            page === "doixe" && fleetTab === sub.key ? "active" : ""
                          }`}
                          onClick={() => handleSelectFleetTab(sub.key)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.key === "antoan") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${
                      page === item.key ? "active" : ""
                    }`}
                    onClick={() => {
                      setPage("antoan");
                      setSafetyMenuOpen((prev) => !prev);
                      setSettingsOpen(false);
                    }}
                    aria-expanded={safetyMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? (
                      <span className="sidebar-menu-caret">{safetyMenuOpen ? "▾" : "▸"}</span>
                    ) : null}
                  </button>
                  {!isCollapsed && safetyMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {safetySubmenu.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${
                            page === "antoan" && safetyTab === sub.key ? "active" : ""
                          }`}
                          onClick={() => handleSelectSafetyTab(sub.key)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.key === "nhansu") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${page === "nhansu" ? "active" : ""}`}
                    onClick={() => {
                      setPage("nhansu");
                      setNhansuMenuOpen((prev) => !prev);
                      setSettingsOpen(false);
                    }}
                    aria-expanded={nhansuMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? (
                      <span className="sidebar-menu-caret">{nhansuMenuOpen ? "▾" : "▸"}</span>
                    ) : null}
                  </button>
                  {!isCollapsed && nhansuMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {nhansuSubmenu.filter((sub) => canAccessPage(sub.page)).map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${page === "nhansu" && nhansuTab === sub.key ? "active" : ""}`}
                          onClick={() => handleSelectNhansuSub(sub)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.key === "bieumau") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${page === "bieumau" ? "active" : ""}`}
                    onClick={() => {
                      setPage("bieumau");
                      setBieumauMenuOpen((prev) => !prev);
                      setSettingsOpen(false);
                    }}
                    aria-expanded={bieumauMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? <span className="sidebar-menu-caret">{bieumauMenuOpen ? "▾" : "▸"}</span> : null}
                  </button>
                  {!isCollapsed && bieumauMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {bieumauSubmenu.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${page === "bieumau" && activeFormGroup === sub.key ? "active" : ""}`}
                          onClick={() => handleSelectBieumauGroup(sub.key)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (item.key === "thietbi") {
              return (
                <div className="sidebar-menu-group" key={item.key}>
                  <button
                    type="button"
                    className={`sidebar-menu-item sidebar-menu-item-expand ${
                      page === item.key ? "active" : ""
                    }`}
                    onClick={() => {
                      setPage("thietbi");
                      setAssetMenuOpen((prev) => !prev);
                      setSettingsOpen(false);
                    }}
                    aria-expanded={assetMenuOpen}
                  >
                    <span className="sidebar-menu-item-inner">
                      <span className="sidebar-item-icon" aria-hidden>
                        <ItemIcon />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!isCollapsed ? (
                      <span className="sidebar-menu-caret">{assetMenuOpen ? "▾" : "▸"}</span>
                    ) : null}
                  </button>
                  {!isCollapsed && assetMenuOpen && (
                    <div className="sidebar-submenu" role="menu">
                      {assetSubmenu.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className={`sidebar-submenu-item ${
                            page === "thietbi" && assetTab === sub.key ? "active" : ""
                          }`}
                          onClick={() => handleSelectAssetTab(sub.key)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-menu-item ${page === item.key ? "active" : ""}`}
                onClick={() => handleSelectPage(item.key)}
              >
                <span className="sidebar-menu-item-inner">
                  <span className="sidebar-item-icon" aria-hidden>
                    <ItemIcon />
                  </span>
                  {!isCollapsed ? <span>{item.label}</span> : null}
                </span>
              </button>
            );
          })}

          <div className="sidebar-menu-group" ref={settingsMenuRef}>
            <button
              type="button"
              className={`sidebar-menu-item sidebar-menu-item-expand ${isSettingsActive ? "active" : ""}`}
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              aria-controls="settings-sidebar-panel"
            >
              <span className="sidebar-menu-item-inner">
                <span className="sidebar-item-icon" aria-hidden>
                  <IconSidebarSettings />
                </span>
                {!isCollapsed ? <span>Cài đặt</span> : null}
              </span>
              {!isCollapsed ? <span className="sidebar-menu-caret">{settingsOpen ? "▾" : "▸"}</span> : null}
            </button>

            {!isCollapsed && settingsOpen && (
              <div id="settings-sidebar-panel" className="sidebar-submenu" role="menu">
                {settingsMenu.filter((item) => canAccessPage(item.key)).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`sidebar-submenu-item ${page === item.key ? "active" : ""}`}
                    onClick={() => handleSelectPage(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>

      <main className="app-main">
        <div className={`app-content print-scope page-${page}`}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
