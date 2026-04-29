import { useEffect, useMemo, useState } from "react";
import ModuleShell from "../components/ModuleShell.jsx";
import { useMasterCatalogSnapshot } from "../systemCatalog/useMasterCatalogSnapshot.js";
import SOP1 from "../modules/safety/sop1";
import SOP2 from "../modules/safety/sop2";
import SOP3 from "../modules/safety/sop3";
import SOP4 from "../modules/safety/sop4";
import SOP5 from "../modules/safety/sop5";
import SOP6 from "../modules/safety/sop6";
import SOP7 from "../modules/safety/sop7";
import SOP8 from "../modules/safety/sop8";
import SOP9 from "../modules/safety/sop9";

const TABS = [
  { key: "incident", label: "Sự cố / vi phạm" },
  { key: "checklist", label: "Checklist SOP" },
  { key: "summary", label: "Tổng hợp" },
];

const SOP_OPTIONS = [
  { key: "sop1", label: "SOP1 - Nhập xuất hàng" },
  { key: "sop2", label: "SOP2 - Sơ chế / Chế biến" },
  { key: "sop3", label: "SOP3 - Chia hàng / Phục vụ" },
  { key: "sop4", label: "SOP4 - Nhân sự" },
  { key: "sop5", label: "SOP5 - An toàn cơ sở" },
  { key: "sop6", label: "SOP6 - Hạ tầng / Thiết bị" },
  { key: "sop7", label: "SOP7 - Phản hồi khách hàng" },
  { key: "sop8", label: "SOP8 - Hiện trường sản xuất" },
  { key: "sop9", label: "SOP9 - Hiện trường căn tin" },
];

const AREA_FALLBACK = [
  "Đồng Nai",
  "Long An",
  "Bình Dương",
  "Củ Chi",
  "Dầu Giây",
  "Nhơn Trạch",
];

const STATUS_OPTIONS = [
  "Chưa xử lý",
  "Đang xử lý",
  "Đã hoàn thành",
  "Tạm hoãn",
];

const LEVEL_OPTIONS = ["Cao", "Trung bình", "Thấp"];

const SOP_MAP = {
  sop1: SOP1,
  sop2: SOP2,
  sop3: SOP3,
  sop4: SOP4,
  sop5: SOP5,
  sop6: SOP6,
  sop7: SOP7,
  sop8: SOP8,
  sop9: SOP9,
};

const STORAGE_PREFIX = "safety_report_v4";

const GREEN = {
  primary: "#15803d",
  primaryDark: "#166534",
  primarySoft: "#f0fdf4",
  primaryBorder: "#bbf7d0",
  text: "#14532d",
  subtext: "#4b5563",
  amberBg: "#fef3c7",
  amberBorder: "#fcd34d",
  amberText: "#b45309",
  redBg: "#fee2e2",
  redBorder: "#fca5a5",
  redText: "#b91c1c",
};

const cardStyle = {
  background: "#fff",
  border: `1px solid ${GREEN.primaryBorder}`,
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(21,128,61,0.06)",
};

const tabButtonStyle = (active) => ({
  padding: "14px 24px",
  borderRadius: 18,
  border: "none",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  background: active ? GREEN.primary : "#ecfdf5",
  color: active ? "#fff" : GREEN.primaryDark,
  transition: "all 0.2s ease",
});

const statCardStyle = {
  background: "#f8fffb",
  border: `1px solid ${GREEN.primaryBorder}`,
  borderRadius: 18,
  padding: 18,
  minHeight: 110,
};

function SafetyPrintStyles() {
  return (
    <style>{`
      @page {
        size: A4 landscape;
        margin: 8mm;
      }

      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .no-print,
        .app-sidebar,
        .app-header {
          display: none !important;
        }

        .safety-page-root {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
        }

        .incident-print-root {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
        }

        .incident-print-card {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
        }

        .incident-print-header-card {
          border: none !important;
          box-shadow: none !important;
          padding: 0 0 8px 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
        }

        .incident-fit-screen {
          transform: scale(0.92);
          transform-origin: top left;
          width: 108.7%;
        }

        .incident-print-grid {
          display: grid !important;
          grid-template-columns: 40px 160px 220px 96px 128px 190px 116px 108px !important;
          gap: 6px !important;
        }

        .incident-print-grid > div {
          font-size: 10px !important;
          line-height: 1.2 !important;
        }

        .incident-print-grid input,
        .incident-print-grid select,
        .incident-print-grid textarea {
          font-size: 10px !important;
          min-height: auto !important;
          height: 30px !important;
          padding: 4px 6px !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }

        .incident-print-grid textarea {
          min-height: 46px !important;
          height: 46px !important;
          resize: none !important;
        }
      }
    `}</style>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 18,
        fontWeight: 800,
        marginBottom: 16,
        color: GREEN.primaryDark,
      }}
    >
      {children}
    </div>
  );
}

function InfoBox({ title, value, note }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 14, color: GREEN.subtext, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: GREEN.primaryDark, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: GREEN.subtext, marginTop: 10 }}>{note}</div>
    </div>
  );
}

function IconButton({ title, variant = "default", onClick, children }) {
  const isPrint = variant === "print";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        border: isPrint ? "none" : `1px solid ${GREEN.primaryBorder}`,
        background: isPrint ? GREEN.primary : GREEN.primarySoft,
        color: isPrint ? "#ffffff" : GREEN.primaryDark,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: isPrint ? "0 8px 18px rgba(21,128,61,0.22)" : "none",
        transition: "all 0.2s ease",
        fontSize: 20,
        fontWeight: 800,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getResultInfo(kpi) {
  if (kpi >= 90) {
    return {
      label: "Đạt",
      color: GREEN.primaryDark,
      bg: "#dcfce7",
      border: "#86efac",
    };
  }

  if (kpi >= 80) {
    return {
      label: "Không đạt",
      color: GREEN.amberText,
      bg: GREEN.amberBg,
      border: GREEN.amberBorder,
    };
  }

  return {
    label: "Nguy cơ cao",
    color: GREEN.redText,
    bg: GREEN.redBg,
    border: GREEN.redBorder,
  };
}

function getStatusStyle(status) {
  if (status === "Đã hoàn thành") {
    return {
      color: GREEN.primaryDark,
      background: "#dcfce7",
      border: "#86efac",
    };
  }

  if (status === "Đang xử lý") {
    return {
      color: GREEN.amberText,
      background: GREEN.amberBg,
      border: GREEN.amberBorder,
    };
  }

  if (status === "Chưa xử lý") {
    return {
      color: GREEN.redText,
      background: GREEN.redBg,
      border: GREEN.redBorder,
    };
  }

  return {
    color: GREEN.subtext,
    background: "#f1f5f9",
    border: "#cbd5e1",
  };
}

function getCompactLevelStyle(level) {
  if (level === "Cao") {
    return {
      color: GREEN.redText,
      background: GREEN.redBg,
      border: GREEN.redBorder,
    };
  }

  if (level === "Trung bình") {
    return {
      color: GREEN.amberText,
      background: GREEN.amberBg,
      border: GREEN.amberBorder,
    };
  }

  return {
    color: GREEN.primaryDark,
    background: "#dcfce7",
    border: "#86efac",
  };
}

function flattenChecklist(groups) {
  const rows = [];

  groups.forEach((group, groupIndex) => {
    const groupNumber = groupIndex + 1;

    group.items.forEach((item, itemIndex) => {
      const letter = String.fromCharCode(97 + itemIndex);
      rows.push({
        code: `${groupNumber}${letter}`,
        groupCode: `${groupNumber}`,
        groupTitle: group.group,
        text: item,
      });
    });
  });

  return rows;
}

function buildInitialChecklistValues(rows) {
  const result = {};
  rows.forEach((row) => {
    result[row.code] = {
      result: "1",
      note: "",
    };
  });
  return result;
}

function buildConclusion(rows, values) {
  const failedRows = rows.filter((row) => values[row.code]?.result === "0");

  if (failedRows.length === 0) {
    return "Kết quả kiểm tra đạt yêu cầu. Không ghi nhận nội dung không đạt.";
  }

  return failedRows
    .map((row, index) => {
      const note = values[row.code]?.note?.trim();
      return `${index + 1}. ${row.code}. ${row.text}${note ? ` - ${note}` : ""}`;
    })
    .join("\n");
}

function normalizeLevelFromNote(note = "") {
  const text = note.toLowerCase();

  if (
    text.includes("nghiêm trọng") ||
    text.includes("nguy cơ cao") ||
    text.includes("mất an toàn") ||
    text.includes("dị vật") ||
    text.includes("ngộ độc") ||
    text.includes("côn trùng")
  ) {
    return "Cao";
  }

  if (
    text.includes("lặp lại") ||
    text.includes("không đạt") ||
    text.includes("thiếu") ||
    text.includes("sai") ||
    text.includes("chậm")
  ) {
    return "Trung bình";
  }

  return "Thấp";
}

function buildIncidentsFromChecklist({
  inspectionDate,
  inspectionArea,
  inspector,
  sopKey,
  sopLabel,
  rows,
  values,
  oldIncidents = [],
}) {
  const oldMap = new Map(oldIncidents.map((item) => [item.id, item]));

  return rows
    .filter((row) => values[row.code]?.result === "0")
    .map((row) => {
      const note = values[row.code]?.note?.trim() || "";
      const id = `${inspectionDate}_${inspectionArea}_${sopKey}_${row.code}`;
      const old = oldMap.get(id);

      return {
        id,
        source: "Checklist",
        date: inspectionDate,
        area: inspectionArea,
        inspector,
        sopKey,
        sopLabel,
        itemCode: row.code,
        itemText: row.text,
        itemGroup: row.groupTitle || "",
        note,
        level: old?.level || normalizeLevelFromNote(note),
        assignee: old?.assignee || inspector || "",
        solution: old?.solution || "",
        status: old?.status || "Chưa xử lý",
        deadline: old?.deadline || "",
        createdAt: old?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
}

function getAllStoredReports() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .map((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return { ...parsed, _storageKey: key };
        } catch (error) {
          console.error("Parse stored report error:", error);
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Read stored reports error:", error);
    return [];
  }
}

function updateIncidentInStoredReport(targetIncidentId, updater) {
  const reports = getAllStoredReports();

  reports.forEach((report) => {
    const incidents = report.incidents || [];
    const hasTarget = incidents.some((item) => item.id === targetIncidentId);

    if (!hasTarget) return;

    const nextIncidents = incidents.map((item) => {
      if (item.id !== targetIncidentId) return item;
      return {
        ...item,
        ...updater(item),
        updatedAt: new Date().toISOString(),
      };
    });

    const payload = {
      ...report,
      incidents: nextIncidents,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(report._storageKey, JSON.stringify(payload));
  });
}

function ChecklistTab() {
  const masterCatalog = useMasterCatalogSnapshot();
  const areaOptions = useMemo(() => {
    const names = masterCatalog.regions.filter((r) => !r.isDeleted).map((r) => r.name);
    return names.length ? names : AREA_FALLBACK;
  }, [masterCatalog]);

  const [selectedSop, setSelectedSop] = useState("sop1");
  const [inspectionDate, setInspectionDate] = useState(getTodayString());
  const [inspectionArea, setInspectionArea] = useState(() => areaOptions[0] || "Đồng Nai");
  const [inspector, setInspector] = useState("");
  const [started, setStarted] = useState(false);
  const [checklistValues, setChecklistValues] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (areaOptions.length && !areaOptions.includes(inspectionArea)) {
      setInspectionArea(areaOptions[0]);
    }
  }, [areaOptions, inspectionArea]);

  const currentOption = useMemo(
    () => SOP_OPTIONS.find((item) => item.key === selectedSop),
    [selectedSop]
  );

  const currentChecklist = SOP_MAP[selectedSop] || [];
  const flatRows = useMemo(() => flattenChecklist(currentChecklist), [currentChecklist]);

  const totalItems = flatRows.length;
  const passedItems = flatRows.filter(
    (row) => checklistValues[row.code]?.result === "1"
  ).length;

  const kpi = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
  const resultInfo = getResultInfo(kpi);
  const conclusionText = buildConclusion(flatRows, checklistValues);

  const failedRows = flatRows.filter((row) => checklistValues[row.code]?.result === "0");

  const dailyIssues =
    failedRows.length === 0
      ? ["Không phát sinh vấn đề."]
      : failedRows.map((row) => {
          const note = checklistValues[row.code]?.note?.trim();
          return `${row.code}. ${row.text}${note ? ` - ${note}` : ""}`;
        });

  const groupedRows = currentChecklist.map((group, groupIndex) => {
    const groupNumber = groupIndex + 1;
    const rows = group.items.map((item, itemIndex) => {
      const letter = String.fromCharCode(97 + itemIndex);
      return {
        code: `${groupNumber}${letter}`,
        text: item,
      };
    });

    return {
      code: `${groupNumber}`,
      title: group.group,
      rows,
    };
  });

  const buildStorageKey = () => {
    return `${STORAGE_PREFIX}_${selectedSop}_${inspectionDate}_${inspectionArea}`;
  };

  const refreshHistory = () => {
    const rows = getAllStoredReports()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map((item) => ({
        key: item._storageKey,
        inspectionDate: item.inspectionDate,
        inspectionArea: item.inspectionArea,
        inspector: item.inspector,
        sopLabel: item.sopLabel,
        kpi: item.kpi,
        resultLabel: item.resultLabel,
        updatedAt: item.updatedAt,
      }));

    setHistory(rows);
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!started) return;

    const key = buildStorageKey();
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setChecklistValues(parsed.checklistValues || buildInitialChecklistValues(flatRows));
        setInspector(parsed.inspector || "");
        setSubmitMessage(`Đã tải dữ liệu ngày ${inspectionDate} - ${inspectionArea}.`);
      } catch (error) {
        console.error("Load safety report error:", error);
        setChecklistValues(buildInitialChecklistValues(flatRows));
        setSubmitMessage("Không đọc được dữ liệu cũ, đã tạo biểu mẫu mới.");
      }
    } else {
      setChecklistValues(buildInitialChecklistValues(flatRows));
      setSubmitMessage(`Chưa có dữ liệu cho ngày ${inspectionDate} - ${inspectionArea}.`);
    }
  }, [inspectionDate, inspectionArea, selectedSop, started, flatRows]);

  const handleStart = () => {
    const key = buildStorageKey();
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setChecklistValues(parsed.checklistValues || buildInitialChecklistValues(flatRows));
        setInspector(parsed.inspector || inspector);
        setSubmitMessage(`Đã tải dữ liệu ngày ${inspectionDate} - ${inspectionArea}.`);
      } catch (error) {
        console.error("Load safety report error:", error);
        setChecklistValues(buildInitialChecklistValues(flatRows));
        setSubmitMessage("Không đọc được dữ liệu cũ, đã tạo biểu mẫu mới.");
      }
    } else {
      setChecklistValues(buildInitialChecklistValues(flatRows));
      setSubmitMessage(`Đã tạo biểu mẫu mới cho ngày ${inspectionDate} - ${inspectionArea}.`);
    }

    setStarted(true);
  };

  const handleResultChange = (code, nextValue) => {
    setChecklistValues((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        result: nextValue,
      },
    }));
    setSubmitMessage("");
  };

  const handleNoteChange = (code, nextValue) => {
    setChecklistValues((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        note: nextValue,
      },
    }));
    setSubmitMessage("");
  };

  const validateForm = () => {
    if (!inspectionDate || !inspectionArea || !inspector.trim()) {
      return "Vui lòng nhập đủ Ngày kiểm tra, Khu vực và Người phụ trách.";
    }

    const missingFailedNotes = flatRows.filter((row) => {
      const rowValue = checklistValues[row.code];
      return rowValue?.result === "0" && !rowValue?.note?.trim();
    });

    if (missingFailedNotes.length > 0) {
      return `Có ${missingFailedNotes.length} mục Không đạt chưa nhập ghi chú.`;
    }

    return "";
  };

  const handleSaveReport = () => {
    const validationError = validateForm();
    if (validationError) {
      setSubmitMessage(validationError);
      return;
    }

    const key = buildStorageKey();
    const raw = localStorage.getItem(key);

    let oldIncidents = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        oldIncidents = parsed.incidents || [];
      } catch (error) {
        console.error("Read old incidents error:", error);
      }
    }

    const incidents = buildIncidentsFromChecklist({
      inspectionDate,
      inspectionArea,
      inspector,
      sopKey: selectedSop,
      sopLabel: currentOption?.label || "",
      rows: flatRows,
      values: checklistValues,
      oldIncidents,
    });

    const payload = {
      inspectionDate,
      inspectionArea,
      inspector,
      selectedSop,
      sopLabel: currentOption?.label || "",
      checklistValues,
      conclusionText,
      kpi,
      resultLabel: resultInfo.label,
      incidents,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(payload));
    setSubmitMessage("Đã lưu báo cáo đúng theo ngày kiểm tra.");
    refreshHistory();
  };

  const handleResetForm = () => {
    const key = buildStorageKey();
    localStorage.removeItem(key);
    setChecklistValues(buildInitialChecklistValues(flatRows));
    setSubmitMessage("Đã làm mới dữ liệu của đúng ngày đang chọn.");
    refreshHistory();
  };

  const handlePrint = () => {
    const validationError = validateForm();
    if (validationError) {
      setSubmitMessage(validationError);
      return;
    }
    window.print();
  };

  const isSuccessMessage =
    submitMessage.includes("Đã") ||
    submitMessage.includes("Biểu mẫu hợp lệ") ||
    submitMessage.includes("Chưa có dữ liệu");

  return (
    <div className="print-area" style={styles.container}>
      <div className="no-print" style={cardStyle}>
        <SectionTitle>Thiết lập kiểm tra</SectionTitle>

        <div style={styles.topFormGrid}>
          <div>
            <div style={styles.label}>Ngày kiểm tra</div>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => {
                setInspectionDate(e.target.value);
                setSubmitMessage("");
              }}
              style={styles.input}
            />
          </div>

          <div>
            <div style={styles.label}>Khu vực</div>
            <select
              value={inspectionArea}
              onChange={(e) => {
                setInspectionArea(e.target.value);
                setSubmitMessage("");
              }}
              style={styles.input}
            >
              {areaOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Người phụ trách</div>
            <input
              value={inspector}
              onChange={(e) => {
                setInspector(e.target.value);
                setSubmitMessage("");
              }}
              placeholder="Nhập tên người phụ trách"
              style={styles.input}
            />
          </div>

          <div>
            <div style={styles.label}>Danh mục SOP</div>
            <select
              value={selectedSop}
              onChange={(e) => {
                setSelectedSop(e.target.value);
                setStarted(false);
                setChecklistValues({});
                setSubmitMessage("");
              }}
              style={styles.input}
            >
              {SOP_OPTIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button style={styles.primaryButton} onClick={handleStart}>
            Bắt đầu kiểm tra
          </button>
        </div>
      </div>

      {started && (
        <div style={styles.printInfoCard}>
          <div style={styles.printInfoGrid}>
            <div>
              <div style={styles.printInfoLabel}>Ngày kiểm tra</div>
              <div style={styles.printInfoValue}>{inspectionDate}</div>
            </div>
            <div>
              <div style={styles.printInfoLabel}>Khu vực</div>
              <div style={styles.printInfoValue}>{inspectionArea}</div>
            </div>
            <div>
              <div style={styles.printInfoLabel}>Người phụ trách</div>
              <div style={styles.printInfoValue}>{inspector || "Chưa nhập"}</div>
            </div>
            <div>
              <div style={styles.printInfoLabel}>Danh mục SOP</div>
              <div style={styles.printInfoValue}>{currentOption?.label}</div>
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <SectionTitle>Nội dung kiểm tra</SectionTitle>

        <div style={{ color: GREEN.subtext, fontSize: 15, marginBottom: 14 }}>
          SOP đang chọn: <b style={{ color: GREEN.primaryDark }}>{currentOption?.label}</b>
        </div>

        {!started && (
          <div style={styles.placeholderBox}>
            Chọn thông tin đầu trang và bấm <b>Bắt đầu kiểm tra</b> để hiển thị checklist.
          </div>
        )}

        {started && currentChecklist.length === 0 && (
          <div style={styles.placeholderBox}>
            SOP này chưa có dữ liệu. Tạo thêm file riêng trong
            <b> src/modules/safety/</b> rồi nối vào <b>SOP_MAP</b>.
          </div>
        )}

        {started && currentChecklist.length > 0 && (
          <>
            <div style={styles.kpiBar}>
              <div style={styles.kpiBox}>
                <span style={styles.kpiLabel}>Tổng mục kiểm tra</span>
                <b style={styles.kpiValue}>{totalItems}</b>
              </div>

              <div style={styles.kpiBox}>
                <span style={styles.kpiLabel}>Mục đạt</span>
                <b style={styles.kpiValue}>{passedItems}</b>
              </div>

              <div style={styles.kpiBox}>
                <span style={styles.kpiLabel}>KPI tạm tính</span>
                <b style={styles.kpiValue}>{kpi}%</b>
              </div>

              <div
                style={{
                  ...styles.kpiBox,
                  background: resultInfo.bg,
                  border: `1px solid ${resultInfo.border}`,
                }}
              >
                <span style={styles.kpiLabel}>Kết quả</span>
                <b style={{ ...styles.kpiValue, color: resultInfo.color }}>
                  {resultInfo.label}
                </b>
              </div>
            </div>

            <div style={styles.tableHeader}>
              <div>STT</div>
              <div>Nội dung kiểm tra</div>
              <div>Kết quả</div>
              <div>Ghi chú / mô tả</div>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {groupedRows.map((group) => (
                <div key={group.code} style={styles.groupCard}>
                  <div style={styles.groupHeaderRow}>
                    <div style={styles.groupCode}>{group.code}</div>
                    <div style={styles.groupTitle}>{group.title}</div>
                    <div />
                    <div />
                  </div>

                  {group.rows.map((row) => {
                    const rowValue = checklistValues[row.code] || { result: "1", note: "" };
                    const isFailed = rowValue.result === "0";

                    return (
                      <div key={row.code} style={styles.checklistRow}>
                        <div style={styles.sttCell}>{row.code}</div>

                        <div style={styles.checklistText}>{row.text}</div>

                        <select
                          value={rowValue.result}
                          onChange={(e) => handleResultChange(row.code, e.target.value)}
                          style={styles.resultSelect}
                        >
                          <option value="1">Đạt</option>
                          <option value="0">Không đạt</option>
                        </select>

                        <textarea
                          rows={2}
                          value={rowValue.note}
                          onChange={(e) => handleNoteChange(row.code, e.target.value)}
                          placeholder={
                            isFailed
                              ? "Bắt buộc ghi rõ nguyên nhân / mô tả không đạt"
                              : "Ghi chú thêm nếu cần"
                          }
                          style={{
                            ...styles.noteTextarea,
                            borderColor: isFailed && !rowValue.note.trim() ? "#ef4444" : GREEN.primaryBorder,
                            background: isFailed && !rowValue.note.trim() ? "#fef2f2" : "#fff",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 22 }}>
              <SectionTitle>Kết luận</SectionTitle>

              <textarea
                rows={8}
                value={conclusionText}
                readOnly
                style={{
                  ...styles.textarea,
                  background: GREEN.primarySoft,
                  color: GREEN.text,
                }}
              />
            </div>

            <div style={{ marginTop: 22 }}>
              <SectionTitle>Danh sách vấn đề trong ngày</SectionTitle>

              <div
                style={{
                  ...styles.issueBox,
                  background: failedRows.length === 0 ? "#ecfdf5" : GREEN.redBg,
                  border: `1px solid ${failedRows.length === 0 ? "#86efac" : GREEN.redBorder}`,
                  color: failedRows.length === 0 ? GREEN.primaryDark : GREEN.redText,
                }}
              >
                {dailyIssues.map((issue, index) => (
                  <div
                    key={`${issue}-${index}`}
                    style={{ marginBottom: index < dailyIssues.length - 1 ? 8 : 0 }}
                  >
                    {issue}
                  </div>
                ))}
              </div>
            </div>

            <div className="no-print" style={styles.actionRow}>
              <button style={styles.primaryButton} onClick={handleSaveReport}>
                Lưu báo cáo
              </button>

              <button style={styles.secondaryButton} onClick={handleResetForm}>
                Làm mới form
              </button>

              <button style={styles.printButton} onClick={handlePrint}>
                In / Xuất PDF
              </button>
            </div>

            {submitMessage && (
              <div
                className="no-print"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isSuccessMessage ? GREEN.primaryDark : GREEN.redText,
                }}
              >
                {submitMessage}
              </div>
            )}

            <div className="no-print" style={{ marginTop: 22 }}>
              <SectionTitle>Lịch sử báo cáo gần nhất</SectionTitle>

              <div style={styles.historyBox}>
                {history.length === 0 ? (
                  "Chưa có dữ liệu báo cáo."
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {history.map((item) => (
                      <div key={item.key} style={styles.historyItem}>
                        <div>
                          <b>{item.inspectionDate}</b> | {item.inspectionArea}
                        </div>
                        <div>{item.sopLabel}</div>
                        <div>
                          Người phụ trách: <b>{item.inspector || "Chưa nhập"}</b>
                        </div>
                        <div>
                          KPI: <b>{item.kpi}%</b> | Kết quả: <b>{item.resultLabel}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IncidentTab() {
  const today = getTodayString();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [incidentRows, setIncidentRows] = useState([]);

  const refreshIncidents = () => {
    const rows = getAllStoredReports()
      .flatMap((report) => report.incidents || [])
      .filter((item) => {
        if (fromDate && toDate) {
          return item.date >= fromDate && item.date <= toDate;
        }
        return item.date === today;
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });

    setIncidentRows(rows);
  };

  useEffect(() => {
    refreshIncidents();
  }, [fromDate, toDate]);

  const handleRowChange = (incidentId, field, value) => {
    updateIncidentInStoredReport(incidentId, (old) => ({
      ...old,
      [field]: value,
    }));
    refreshIncidents();
  };

  const clearFilter = () => {
    setFromDate("");
    setToDate("");
  };

  const handlePrintIncidentTable = () => {
    window.print();
  };

  return (
    <div className="incident-print-root" style={{ display: "grid", gap: 16 }}>
      <div className="no-print" style={{ ...cardStyle, padding: 20 }}>
        <SectionTitle>Bộ lọc sự cố / vi phạm</SectionTitle>

        <div style={styles.filterGridCompact}>
          <div>
            <div style={styles.label}>Từ ngày</div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <div style={styles.label}>Đến ngày</div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inlineIconWrap}>
            <IconButton title="Xóa lọc" onClick={clearFilter}>✕</IconButton>
            <IconButton title="In PDF" variant="print" onClick={handlePrintIncidentTable}>⎙</IconButton>
          </div>
        </div>

        <div style={{ marginTop: 10, color: GREEN.subtext, fontSize: 14 }}>
          {fromDate && toDate
            ? `Đang hiển thị dữ liệu từ ${fromDate} đến ${toDate}.`
            : `Chưa chọn khoảng ngày, hệ thống chỉ hiển thị dữ liệu của ngày đang thao tác: ${today}.`}
        </div>
      </div>

      <div className="incident-print-header-card" style={{ ...styles.incidentPrintHeader, padding: 18 }}>
        <div style={{ ...styles.title, fontSize: 24, marginBottom: 4 }}>
          Bảng quản lý sự cố / vi phạm
        </div>
        <div style={styles.subTitle}>
          {fromDate && toDate
            ? `Khoảng lọc: ${fromDate} đến ${toDate}`
            : `Ngày hiển thị: ${today}`}
        </div>
      </div>

      <div className="incident-print-card" style={{ ...cardStyle, padding: 16 }}>
        {incidentRows.length === 0 ? (
          <div style={styles.placeholderBox}>
            Không có dữ liệu sự cố trong phạm vi ngày đang hiển thị.
          </div>
        ) : (
          <div className="incident-fit-screen" style={styles.incidentCompactWrap}>
            <div className="incident-print-grid" style={styles.incidentCompactHeader}>
              <div>STT</div>
              <div>SOP / Hạng mục</div>
              <div>Nội dung lỗi</div>
              <div>Mức độ</div>
              <div>Người xử lý</div>
              <div>Giải pháp</div>
              <div>Trạng thái</div>
              <div>Deadline</div>
            </div>

            {incidentRows.map((item, index) => {
              const levelStyle = getCompactLevelStyle(item.level);
              const statusStyle = getStatusStyle(item.status || "Chưa xử lý");

              return (
                <div key={item.id} className="incident-print-grid" style={styles.incidentCompactRow}>
                  <div style={styles.incidentCellStrong}>{index + 1}</div>

                  <div style={styles.incidentCell}>
                    <div style={styles.incidentMiniText}>{item.sopLabel}</div>
                    <div style={styles.incidentSubText}>
                      {item.itemCode} | {item.date} | {item.area}
                    </div>
                  </div>

                  <div style={styles.incidentCell}>
                    <div style={{ fontWeight: 700 }}>{item.itemText}</div>
                    <div style={styles.incidentSubText}>{item.note || "Không có ghi chú."}</div>
                  </div>

                  <div style={styles.incidentCell}>
                    <select
                      value={item.level}
                      onChange={(e) => handleRowChange(item.id, "level", e.target.value)}
                      style={{
                        ...styles.compactSelect,
                        color: levelStyle.color,
                        background: levelStyle.background,
                        border: `1px solid ${levelStyle.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.incidentCell}>
                    <input
                      value={item.assignee || ""}
                      onChange={(e) => handleRowChange(item.id, "assignee", e.target.value)}
                      placeholder="Người xử lý"
                      style={styles.compactInput}
                    />
                  </div>

                  <div style={styles.incidentCell}>
                    <textarea
                      rows={2}
                      value={item.solution || ""}
                      onChange={(e) => handleRowChange(item.id, "solution", e.target.value)}
                      placeholder="Nhập giải pháp"
                      style={styles.compactTextarea}
                    />
                  </div>

                  <div style={styles.incidentCell}>
                    <select
                      value={item.status || "Chưa xử lý"}
                      onChange={(e) => handleRowChange(item.id, "status", e.target.value)}
                      style={{
                        ...styles.compactSelect,
                        color: statusStyle.color,
                        background: statusStyle.background,
                        border: `1px solid ${statusStyle.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.incidentCell}>
                    <input
                      type="date"
                      value={item.deadline || ""}
                      onChange={(e) => handleRowChange(item.id, "deadline", e.target.value)}
                      style={styles.compactInput}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTab() {
  const [summaryRows, setSummaryRows] = useState([]);

  useEffect(() => {
    const rows = getAllStoredReports().sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    setSummaryRows(rows);
  }, []);

  const totalReports = summaryRows.length;
  const highRiskReports = summaryRows.filter((item) => item.kpi < 80).length;
  const averageKpi =
    totalReports > 0
      ? Math.round(
          summaryRows.reduce((sum, item) => sum + (Number(item.kpi) || 0), 0) / totalReports
        )
      : 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <InfoBox title="Tổng SOP kiểm tra" value="9" note="Toàn bộ danh mục SOP an toàn" />
        <InfoBox title="Số báo cáo đã lưu" value={String(totalReports)} note="Dữ liệu thực tế đã lưu" />
        <InfoBox title="Báo cáo nguy cơ cao" value={String(highRiskReports)} note="KPI dưới 80%" />
        <InfoBox title="KPI trung bình" value={totalReports > 0 ? `${averageKpi}%` : "--"} note="Từ các báo cáo đã lưu" />
      </div>

      <div style={cardStyle}>
        <SectionTitle>Tổng quan an toàn</SectionTitle>

        {summaryRows.length === 0 ? (
          <div style={styles.placeholderBox}>Chưa có dữ liệu báo cáo an toàn để tổng hợp.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {summaryRows.slice(0, 10).map((item, index) => (
              <div key={`${item.updatedAt}-${index}`} style={styles.summaryItem}>
                <div>
                  <b>{item.inspectionDate}</b> | {item.inspectionArea} | {item.sopLabel}
                </div>
                <div>Người phụ trách: <b>{item.inspector || "Chưa nhập"}</b></div>
                <div>KPI: <b>{item.kpi}%</b> | Kết quả: <b>{item.resultLabel}</b></div>
                <div>Số lỗi: <b>{(item.incidents || []).length}</b></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnToan({ initialTab = "incident", onTabChange = null }) {
  const getSafeTab = (targetTab) =>
    TABS.some((item) => item.key === targetTab) ? targetTab : "incident";
  const [activeTab, setActiveTab] = useState(getSafeTab(initialTab));

  useEffect(() => {
    setActiveTab(getSafeTab(initialTab));
  }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof onTabChange === "function") {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  return (
    <div className="safety-page-root ops-standard-page" style={styles.page}>
      <SafetyPrintStyles />

      <div className="no-print">
        <ModuleShell
          title="Quản lý An toàn"
          subtitle="Theo dõi checklist SOP, sự cố / vi phạm và tổng hợp KPI an toàn."
        />
      </div>

      {activeTab === "summary" && <SummaryTab />}
      {activeTab === "checklist" && <ChecklistTab />}
      {activeTab === "incident" && <IncidentTab />}
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    display: "grid",
    gap: 20,
    color: GREEN.text,
  },
  headerCard: {
    background: "#ffffff",
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 24,
    padding: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: GREEN.primaryDark,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    color: GREEN.subtext,
    lineHeight: 1.6,
  },
  container: {
    display: "grid",
    gap: 20,
  },
  tabRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  topFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  filterGridCompact: {
    display: "grid",
    gridTemplateColumns: "220px 220px auto",
    gap: 14,
    alignItems: "end",
    justifyContent: "start",
  },
  inlineIconWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingBottom: 2,
  },
  printInfoCard: {
    background: "#ffffff",
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 20,
    padding: 20,
  },
  printInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  printInfoLabel: {
    fontSize: 13,
    color: GREEN.subtext,
    marginBottom: 6,
    fontWeight: 700,
  },
  printInfoValue: {
    fontSize: 16,
    color: GREEN.primaryDark,
    fontWeight: 700,
    wordBreak: "break-word",
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: GREEN.primaryDark,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: "0 14px",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: GREEN.text,
  },
  textarea: {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: 14,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    background: "#fff",
    color: GREEN.text,
  },
  primaryButton: {
    height: 52,
    padding: "0 18px",
    borderRadius: 14,
    border: "none",
    background: GREEN.primary,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    height: 52,
    padding: "0 24px",
    borderRadius: 14,
    border: `1px solid ${GREEN.primaryBorder}`,
    background: "#ffffff",
    color: GREEN.primaryDark,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  printButton: {
    height: 52,
    padding: "0 24px",
    borderRadius: 14,
    border: "none",
    background: GREEN.primary,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  placeholderBox: {
    border: `1px dashed ${GREEN.primaryBorder}`,
    borderRadius: 16,
    padding: 20,
    background: GREEN.primarySoft,
    color: GREEN.subtext,
    lineHeight: 1.7,
  },
  kpiBar: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  kpiBox: {
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 16,
    background: "#f8fffb",
    padding: 16,
    display: "grid",
    gap: 8,
  },
  kpiLabel: {
    fontSize: 13,
    color: GREEN.subtext,
  },
  kpiValue: {
    fontSize: 24,
    color: GREEN.primaryDark,
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "110px 1.4fr 180px 1fr",
    gap: 16,
    padding: "12px 14px",
    borderRadius: 14,
    background: "#ecfdf5",
    color: GREEN.primaryDark,
    fontWeight: 800,
    fontSize: 14,
    marginBottom: 16,
  },
  groupCard: {
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 18,
    padding: 18,
    background: "#ffffff",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
  groupHeaderRow: {
    display: "grid",
    gridTemplateColumns: "110px 1.4fr 180px 1fr",
    gap: 16,
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottom: `1px solid ${GREEN.primaryBorder}`,
  },
  groupCode: {
    fontSize: 20,
    fontWeight: 800,
    color: GREEN.primaryDark,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: GREEN.primaryDark,
    wordBreak: "break-word",
  },
  checklistRow: {
    display: "grid",
    gridTemplateColumns: "110px 1.4fr 180px 1fr",
    gap: 16,
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${GREEN.primaryBorder}`,
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
  sttCell: {
    fontSize: 16,
    fontWeight: 700,
    color: GREEN.text,
  },
  checklistText: {
    fontSize: 15,
    color: GREEN.primaryDark,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  resultSelect: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
    color: GREEN.text,
  },
  noteTextarea: {
    width: "100%",
    minHeight: 64,
    borderRadius: 12,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: 12,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    background: "#fff",
    color: GREEN.text,
  },
  issueBox: {
    borderRadius: 18,
    padding: 22,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.6,
  },
  actionRow: {
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
    marginTop: 22,
    alignItems: "center",
  },
  historyBox: {
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 18,
    padding: 22,
    background: GREEN.primarySoft,
    color: GREEN.subtext,
    fontSize: 16,
    fontWeight: 600,
  },
  historyItem: {
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 14,
    padding: 14,
    background: "#ffffff",
    color: GREEN.text,
    fontSize: 14,
    lineHeight: 1.6,
  },
  summaryItem: {
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 14,
    padding: 16,
    background: "#ffffff",
    color: GREEN.text,
    fontSize: 14,
    lineHeight: 1.7,
  },
  incidentPrintHeader: {
    background: "#ffffff",
    border: `1px solid ${GREEN.primaryBorder}`,
    borderRadius: 18,
    padding: 20,
  },
  incidentCompactWrap: {
    display: "grid",
    gap: 6,
  },
  incidentCompactHeader: {
    display: "grid",
    gridTemplateColumns: "40px 160px 220px 96px 128px 190px 116px 108px",
    gap: 6,
    padding: "9px 8px",
    borderRadius: 12,
    background: "#ecfdf5",
    color: GREEN.primaryDark,
    fontWeight: 800,
    fontSize: 12,
    alignItems: "center",
  },
  incidentCompactRow: {
    display: "grid",
    gridTemplateColumns: "40px 160px 220px 96px 128px 190px 116px 108px",
    gap: 6,
    padding: "8px",
    borderRadius: 12,
    border: `1px solid ${GREEN.primaryBorder}`,
    background: "#ffffff",
    alignItems: "start",
  },
  incidentCell: {
    fontSize: 12,
    color: GREEN.text,
    lineHeight: 1.3,
  },
  incidentCellStrong: {
    fontSize: 12,
    color: GREEN.primaryDark,
    lineHeight: 1.3,
    fontWeight: 800,
  },
  incidentMiniText: {
    fontSize: 12,
    color: GREEN.primaryDark,
    lineHeight: 1.3,
    fontWeight: 700,
    wordBreak: "break-word",
  },
  incidentSubText: {
    fontSize: 10,
    color: GREEN.subtext,
    marginTop: 3,
    lineHeight: 1.3,
    wordBreak: "break-word",
  },
  compactInput: {
    width: "100%",
    height: 34,
    borderRadius: 8,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: "0 8px",
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: GREEN.text,
  },
  compactSelect: {
    width: "100%",
    height: 34,
    borderRadius: 8,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: "0 8px",
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  },
  compactTextarea: {
    width: "100%",
    minHeight: 52,
    borderRadius: 8,
    border: `1px solid ${GREEN.primaryBorder}`,
    padding: 8,
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    background: "#fff",
    color: GREEN.text,
  },
};
