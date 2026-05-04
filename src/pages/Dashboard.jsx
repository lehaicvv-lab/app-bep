import { useEffect, useMemo, useState } from "react";
import { getDailyReportsByRange } from "../services/dailyReportsService.js";

const REPORT_FORM_TABS = ["management", "service", "accounting", "warehouse", "bep"];
const REPORT_TAB_META = {
  management: { label: "Quản lý" },
  service: { label: "Giám sát dịch vụ" },
  accounting: { label: "Kế toán kho" },
  warehouse: { label: "Kế toán sản xuất" },
  bep: { label: "Bếp" },
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeReportTabKey(tabKey) {
  return REPORT_TAB_META[tabKey] ? tabKey : "management";
}

function parseReportStorageDescriptor(key) {
  const nextKeyMatch = String(key).match(/^report_([^_]+)_(.+)_(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (nextKeyMatch) {
    return {
      tabKey: normalizeReportTabKey(nextKeyMatch[1]),
      site: nextKeyMatch[2] || "",
      reportDate: nextKeyMatch[3] || "",
      shift: nextKeyMatch[4] || "",
    };
  }

  if (!String(key || "").startsWith("sky-catering-ops-report:")) return null;

  const legacyMatch = String(key).match(
    /^sky-catering-ops-report:(\d{4}-\d{2}-\d{2}):(.*?):(.*?):(.*?)::([a-z]+)$/
  );
  if (legacyMatch) {
    return {
      reportDate: legacyMatch[1] || "",
      site: legacyMatch[2] || "",
      shift: legacyMatch[4] || "",
      tabKey: normalizeReportTabKey(legacyMatch[5] === "summary" ? "management" : legacyMatch[5]),
    };
  }

  const parts = String(key).split(":");
  if (parts.length < 5) return null;
  return {
    tabKey: normalizeReportTabKey(parts[1] === "summary" ? "management" : parts[1]),
    reportDate: parts[2] || "",
    site: parts[3] || "",
    shift: parts[4] || "",
  };
}

function extractScore(payload) {
  const direct = Number(payload?.metrics?.operationalScore);
  if (Number.isFinite(direct)) return direct;
  const text = String(payload?.managerSummary?.generalComment || "");
  const match = text.match(/Chấm điểm tự động:\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}

function getRelevantSections(tabKey, sections) {
  const entries = Object.entries(isRecord(sections) ? sections : {});
  if (tabKey === "accounting") return entries.filter(([key]) => key.startsWith("wh")).map(([, section]) => section);
  if (tabKey === "warehouse") return entries.filter(([key]) => key.startsWith("pm")).map(([, section]) => section);
  if (tabKey === "bep") return entries.filter(([key]) => key.startsWith("bep")).map(([, section]) => section);
  return entries
    .filter(([key]) => !key.startsWith("wh") && !key.startsWith("pm") && !key.startsWith("bep"))
    .map(([, section]) => section);
}

function scanStoredReports() {
  const rows = [];
  const deduped = new Map();

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    const descriptor = parseReportStorageDescriptor(key);
    if (!descriptor || !REPORT_FORM_TABS.includes(descriptor.tabKey)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const payload = JSON.parse(raw);
      if (!isRecord(payload)) continue;

      const header = isRecord(payload.header) ? payload.header : {};
      const sections = isRecord(payload.sections) ? payload.sections : {};
      const relevantSections = getRelevantSections(descriptor.tabKey, sections);
      const issueCount = relevantSections.filter((section) => section?.hasIssue).length;
      const warningCount =
        relevantSections.filter((section) => section?.status === "warning" || section?.status === "bad").length +
        Math.max(0, Number(payload?.metrics?.complaintCount || 0));
      const score = extractScore(payload);
      const reportDate = String(header.reportDate || descriptor.reportDate || "").trim();
      const site = String(header.site || descriptor.site || "").trim();
      const shift = String(header.shift || descriptor.shift || "").trim();
      const manager = String(header.manager || "").trim();
      const department = String(header.kitchen || REPORT_TAB_META[descriptor.tabKey]?.label || descriptor.tabKey).trim();
      const savedAt = String(payload?.meta?.savedAt || "").trim();
      const row = {
        key,
        tabKey: descriptor.tabKey,
        label: REPORT_TAB_META[descriptor.tabKey]?.label || descriptor.tabKey,
        department,
        reportDate,
        site,
        shift,
        manager,
        issueCount,
        warningCount,
        score,
        savedAt,
      };

      const dedupeKey = [row.tabKey, row.reportDate, row.site, row.shift].join("::");
      const prev = deduped.get(dedupeKey);
      const prevTime = prev?.savedAt ? Date.parse(prev.savedAt) : 0;
      const nextTime = row.savedAt ? Date.parse(row.savedAt) : 0;
      if (!prev || nextTime >= prevTime) deduped.set(dedupeKey, row);
    } catch {
      // Ignore broken payloads on dashboard; report module handles targeted resets.
    }
  }

  deduped.forEach((value) => rows.push(value));
  rows.sort((a, b) => {
    const byDate = String(b.reportDate || "").localeCompare(String(a.reportDate || ""));
    if (byDate !== 0) return byDate;
    return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
  });
  return rows;
}

function buildRemoteRow(record) {
  const payload = isRecord(record?.data) ? record.data : {};
  const header = isRecord(payload.header) ? payload.header : {};
  const sections = isRecord(payload.sections) ? payload.sections : {};
  const tabKey = normalizeReportTabKey(record?.module || "");
  const relevantSections = getRelevantSections(tabKey, sections);
  const issueCount = relevantSections.filter((section) => section?.hasIssue).length;
  const warningCount =
    relevantSections.filter((section) => section?.status === "warning" || section?.status === "bad").length +
    Math.max(0, Number(payload?.metrics?.complaintCount || 0));
  return {
    key: String(record?.id || `${record?.report_date}-${record?.username}-${tabKey}`),
    tabKey,
    label: REPORT_TAB_META[tabKey]?.label || tabKey,
    department: String(record?.department || header.kitchen || REPORT_TAB_META[tabKey]?.label || tabKey).trim(),
    reportDate: String(record?.report_date || header.reportDate || "").trim(),
    site: String(record?.site || header.site || "").trim(),
    shift: String(header.shift || "").trim(),
    manager: String(record?.full_name || header.manager || "").trim(),
    issueCount,
    warningCount,
    score: extractScore(payload),
    savedAt: String(record?.updated_at || payload?.meta?.savedAt || "").trim(),
  };
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [site, setSite] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const sync = () => setRefreshKey((value) => value + 1);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const [allRows, setAllRows] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadRows = async () => {
      try {
        const remoteRows = await getDailyReportsByRange(fromDate || "2000-01-01", toDate || "2100-12-31", {
          site: site || undefined,
          module: department || undefined,
        });
        if (ignore) return;
        setAllRows(remoteRows.map(buildRemoteRow));
      } catch (error) {
        console.error("[Dashboard] load daily reports failed:", error);
        if (ignore) return;
        setAllRows(scanStoredReports());
      }
    };

    loadRows();

    return () => {
      ignore = true;
    };
  }, [refreshKey, fromDate, toDate, site, department]);

  const siteOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.site).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allRows]
  );

  const departmentOptions = useMemo(
    () =>
      REPORT_FORM_TABS.map((tabKey) => ({
        value: tabKey,
        label: REPORT_TAB_META[tabKey]?.label || tabKey,
      })),
    []
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      return true;
    });
  }, [allRows, fromDate, toDate, site, department]);

  const kpis = useMemo(() => {
    const totalReports = filteredRows.length;
    const todayReports = filteredRows.filter((row) => row.reportDate === today);
    const totalIssues = filteredRows.reduce((sum, row) => sum + Number(row.issueCount || 0), 0);
    const totalWarnings = filteredRows.reduce((sum, row) => sum + Number(row.warningCount || 0), 0);
    const averageScore = totalReports
      ? (filteredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / totalReports).toFixed(1)
      : "0.0";
    const departmentScope = department ? [department] : REPORT_FORM_TABS;
    const missingToday = departmentScope.filter((tabKey) => !todayReports.some((row) => row.tabKey === tabKey)).length;

    return {
      totalReports,
      todayReports: todayReports.length,
      totalIssues,
      totalWarnings,
      averageScore,
      missingToday,
    };
  }, [filteredRows, department, today]);

  const recentRows = filteredRows.slice(0, 20);

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSite("");
    setDepartment("");
  };

  return (
    <div className="report-summary-page dashboard-overview-page">
      <div className="report-dash-shell report-summary-shell">
        <div className="report-dash-hero">
          <div className="report-dash-hero-grid">
            <div className="report-dash-hero-left">
              <div className="report-dash-eyebrow">Sky Catering · Dashboard tổng quan</div>
              <h1 className="report-dash-title">Dashboard báo cáo ngày</h1>
              <p className="report-summary-lead">
                Theo dõi nhanh báo cáo bộ phận theo ngày, khu vực và mức độ phát sinh từ dữ liệu đã lưu.
              </p>

              <div className="dashboard-filter-grid">
                <div className="report-dash-field">
                  <span className="report-dash-field-label">Từ ngày</span>
                  <input className="report-dash-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="report-dash-field">
                  <span className="report-dash-field-label">Đến ngày</span>
                  <input className="report-dash-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="report-dash-field">
                  <span className="report-dash-field-label">Khu vực</span>
                  <select className="report-dash-select" value={site} onChange={(e) => setSite(e.target.value)}>
                    <option value="">Tất cả khu vực</option>
                    {siteOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="report-dash-field">
                  <span className="report-dash-field-label">Bộ phận</span>
                  <select className="report-dash-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">Tất cả bộ phận</option>
                    {departmentOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dashboard-filter-actions">
                  <button type="button" className="report-summary-open-btn" onClick={resetFilters}>
                    Reset lọc
                  </button>
                </div>
              </div>
            </div>

            <aside className="report-dash-kpi" aria-label="KPI tổng quan">
              <table className="report-ds-kpi-table">
                <tbody>
                  <tr>
                    <th scope="row">Tổng báo cáo</th>
                    <td>{kpis.totalReports}</td>
                  </tr>
                  <tr>
                    <th scope="row">Báo cáo hôm nay</th>
                    <td>{kpis.todayReports}</td>
                  </tr>
                  <tr>
                    <th scope="row">Tổng phát sinh</th>
                    <td>{kpis.totalIssues}</td>
                  </tr>
                  <tr>
                    <th scope="row">Tổng cảnh báo</th>
                    <td>{kpis.totalWarnings}</td>
                  </tr>
                  <tr>
                    <th scope="row">Điểm trung bình</th>
                    <td>{kpis.averageScore}</td>
                  </tr>
                  <tr>
                    <th scope="row">Chưa báo cáo hôm nay</th>
                    <td>{kpis.missingToday}</td>
                  </tr>
                </tbody>
              </table>
            </aside>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        <div className="report-premium-card">
          <div className="report-premium-card-label">Tổng báo cáo</div>
          <div className="dashboard-kpi-value">{kpis.totalReports}</div>
          <p className="report-premium-card-meta">Tổng số báo cáo phù hợp bộ lọc hiện tại.</p>
        </div>
        <div className="report-premium-card">
          <div className="report-premium-card-label">Báo cáo hôm nay</div>
          <div className="dashboard-kpi-value">{kpis.todayReports}</div>
          <p className="report-premium-card-meta">Số báo cáo đã lưu trong ngày {today}.</p>
        </div>
        <div className="report-premium-card">
          <div className="report-premium-card-label">Tổng phát sinh</div>
          <div className="dashboard-kpi-value">{kpis.totalIssues}</div>
          <p className="report-premium-card-meta">Tổng hạng mục có phát sinh theo dữ liệu đã lưu.</p>
        </div>
        <div className="report-premium-card">
          <div className="report-premium-card-label">Điểm trung bình</div>
          <div className="dashboard-kpi-value">{kpis.averageScore}</div>
          <p className="report-premium-card-meta">Điểm tự động trung bình của các báo cáo trong bộ lọc.</p>
        </div>
      </div>

      <div className="report-ds-stack">
        <div className="report-ds-group-head">
          <div>
            <div className="report-ds-group-code">BÁO CÁO GẦN ĐÂY</div>
            <div className="report-ds-group-title">Danh sách báo cáo đã lưu</div>
          </div>
        </div>

        <div className="report-master-table-wrap report-day-erp">
          <table className="report-master-table report-summary-table dashboard-recent-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Bộ phận</th>
                <th>Khu vực</th>
                <th>Ca</th>
                <th>Người lập</th>
                <th>Phát sinh</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.length ? (
                recentRows.map((row) => (
                  <tr key={`${row.tabKey}-${row.reportDate}-${row.site}-${row.shift}`}>
                    <td>{row.reportDate || "—"}</td>
                    <td>{row.label}</td>
                    <td>{row.site || "—"}</td>
                    <td>{row.shift || "—"}</td>
                    <td>{row.manager || "—"}</td>
                    <td>{row.issueCount}</td>
                    <td>{row.score}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="report-summary-empty">
                    Chưa có dữ liệu báo cáo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
