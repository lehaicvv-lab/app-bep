import { Fragment, useEffect, useMemo, useState } from "react";
import {
  IconChartLine,
  IconEditLine,
  IconPlusLine,
  IconPrintLine,
  IconSaveLine,
} from "../../components/icons/AppLineIcons.jsx";
import IconTrash2D from "../../components/icons/IconTrash2D.jsx";

const STATUSES = [
  "Hoạt động tốt",
  "Cần theo dõi",
  "Cần bảo trì",
  "Đang hỏng",
  "Đang sửa",
  "Ngưng sử dụng",
  "Đề xuất thay thế",
];

const PROCESS_TYPES = [
  "Kiểm tra định kỳ",
  "Bảo trì",
  "Sửa chữa",
  "Thay linh kiện",
  "Vệ sinh thiết bị",
  "Báo hỏng",
  "Đề xuất thay thế",
  "Ngưng sử dụng",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function regionCode(name) {
  return (name || "R").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).map((x) => x[0] || "").join("").toUpperCase().slice(0, 3) || "R";
}

function nextCode(rows, regionName, locationName) {
  const prefix = `${regionCode(regionName)}-${regionCode(locationName)}-TB-`;
  const maxNo = rows
    .filter((x) => (x.code || "").startsWith(prefix))
    .map((x) => Number((x.code || "").split("-").pop()) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(maxNo + 1).padStart(3, "0")}`;
}

function money(v) {
  return Number(v || 0).toLocaleString("vi-VN");
}

function normalizeNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

function getAlertMeta(status) {
  if (["Đang hỏng", "Đang sửa"].includes(status)) return { label: "Nghiêm trọng", className: "danger" };
  if (status === "Đề xuất thay thế") return { label: "Cảnh báo", className: "warn" };
  if (["Cần theo dõi", "Cần bảo trì", "Ngưng sử dụng"].includes(status)) return { label: "Theo dõi", className: "warn" };
  return { label: "Ổn định", className: "ok" };
}

function focusByGridPosition(group, row, col) {
  if (!group) return false;
  const selector = `[data-nav-group="${group}"][data-nav-row="${row}"][data-nav-col="${col}"]`;
  const next = typeof document !== "undefined" ? document.querySelector(selector) : null;
  if (next && typeof next.focus === "function") {
    next.focus();
    return true;
  }
  return false;
}

function handleExcelNavKeyDown(e) {
  if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;
  if (!["Enter", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const target = e.currentTarget;
  const group = target?.dataset?.navGroup;
  const row = Number(target?.dataset?.navRow);
  const col = Number(target?.dataset?.navCol);
  if (!group || Number.isNaN(row) || Number.isNaN(col)) return;

  let moved = false;
  if (e.key === "Enter" || e.key === "ArrowDown") moved = focusByGridPosition(group, row + 1, col);
  if (e.key === "ArrowUp") moved = focusByGridPosition(group, row - 1, col);
  if (e.key === "ArrowRight") moved = focusByGridPosition(group, row, col + 1);
  if (e.key === "ArrowLeft") moved = focusByGridPosition(group, row, col - 1);

  if (moved) {
    e.preventDefault();
    e.stopPropagation();
  }
}

export default function EquipmentLarge({
  equipmentRows,
  equipmentSummary,
  equipmentLogs,
  regions,
  locations,
  onSaveEquipments,
  onSaveLogs,
}) {
  const [regionId, setRegionId] = useState(regions.find((x) => !x.isDeleted)?.id || "");
  const [locationId, setLocationId] = useState("");
  const [inventoryDate, setInventoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("Ca sáng");
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");
  const [activeEquipmentId, setActiveEquipmentId] = useState("");
  const [startCreateForActive, setStartCreateForActive] = useState(false);
  const [editingBlockName, setEditingBlockName] = useState("");
  const [editingBlockValue, setEditingBlockValue] = useState("");
  const [nextBlockNo, setNextBlockNo] = useState(1);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});

  const activeLocations = useMemo(
    () => locations.filter((x) => !x.isDeleted && (!regionId || x.regionId === regionId)),
    [locations, regionId]
  );

  function addEquipmentInline(blockName = "Khối mới 1") {
    const fallbackRegionId = regionId || regions.find((x) => !x.isDeleted)?.id || "";
    const fallbackLocationId =
      locationId ||
      locations.find((x) => !x.isDeleted && x.regionId === fallbackRegionId)?.id ||
      locations.find((x) => !x.isDeleted)?.id ||
      "";
    if (!fallbackRegionId || !fallbackLocationId) {
      window.alert("Chưa có dữ liệu Khu vực/Bếp. Vui lòng tạo danh mục trước khi thêm.");
      return;
    }
    const region = regions.find((x) => x.id === fallbackRegionId);
    const location = locations.find((x) => x.id === fallbackLocationId);
    const now = new Date().toISOString();
    const row = {
      id: uid(),
      regionId: fallbackRegionId,
      locationId: fallbackLocationId,
      code: nextCode(equipmentRows.filter((x) => !x.isDeleted), region?.name, location?.name),
      name: "",
      blockName,
      startDate: "",
      owner: "",
      currentStatus: "Hoạt động tốt",
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    onSaveEquipments([...equipmentRows, row]);
  }

  function patchRow(id, patch) {
    onSaveEquipments(
      equipmentRows.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x))
    );
  }

  function removeRow(id) {
    const row = equipmentRows.find((x) => x.id === id);
    const name = row?.name || row?.code || "thiết bị này";
    const ok = window.confirm(`Xoá ${name}?`);
    if (!ok) return;
    onSaveEquipments(
      equipmentRows.map((x) => (x.id === id ? { ...x, isDeleted: true, updatedAt: new Date().toISOString() } : x))
    );
  }

  function addBlockSection() {
    const suggested = `Khối mới ${nextBlockNo}`;
    const input = window.prompt("Tên khối khu vực", suggested);
    if (input === null) return;
    const next = String(input || "").trim() || suggested;
    addEquipmentInline(next);
    setNextBlockNo((n) => n + 1);
  }

  function startRenameBlock(blockName) {
    const current = String(blockName || "").trim();
    if (!current) return;
    setEditingBlockName(current);
    setEditingBlockValue(current);
  }

  function cancelRenameBlock() {
    setEditingBlockName("");
    setEditingBlockValue("");
  }

  function renameBlock(blockName, blockRows) {
    const current = String(blockName || "").trim();
    const next = String(editingBlockValue || "").trim();
    if (!current || !next || current === next) {
      cancelRenameBlock();
      return;
    }
    const ids = new Set((blockRows || []).map((x) => x.id));
    const now = new Date().toISOString();
    onSaveEquipments(equipmentRows.map((x) => (ids.has(x.id) ? { ...x, blockName: next, updatedAt: now } : x)));
    cancelRenameBlock();
  }

  function removeBlock(blockName, blockRows) {
    const ids = new Set((blockRows || []).map((x) => x.id));
    if (!ids.size) return;
    const ok = window.confirm(`Xoá khối "${blockName}"?`);
    if (!ok) return;
    const now = new Date().toISOString();
    onSaveEquipments(equipmentRows.map((x) => (ids.has(x.id) ? { ...x, isDeleted: true, updatedAt: now } : x)));
  }

  function toggleCollapseBlock(blockName) {
    const key = String(blockName || "").trim();
    if (!key) return;
    setCollapsedBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addLog(assetId, payload) {
    const now = new Date().toISOString();
    const unitPrice = normalizeNonNegativeNumber(payload.unitPrice);
    const qty = normalizeNonNegativeNumber(payload.qty);
    const nextStatus = payload.afterStatus || "Hoạt động tốt";
    const row = {
      id: uid(),
      assetId,
      logDate: payload.logDate || now.slice(0, 10),
      processType: payload.processType || "Sửa chữa",
      issue: payload.issue || "",
      cause: payload.cause || "",
      solution: payload.solution || "",
      material: payload.material || "",
      unitPrice,
      qty,
      totalCost: unitPrice * qty,
      technician: payload.technician || "",
      afterStatus: nextStatus,
      note: payload.note || "",
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    onSaveLogs([row, ...equipmentLogs]);
    onSaveEquipments(
      equipmentRows.map((x) =>
        x.id === assetId
          ? {
              ...x,
              currentStatus: nextStatus,
              updatedAt: now,
            }
          : x
      )
    );
  }

  function softDeleteLog(logId) {
    const ok = window.confirm("Xoá nhật ký xử lý này?");
    if (!ok) return;
    onSaveLogs(equipmentLogs.map((x) => (x.id === logId ? { ...x, isDeleted: true, updatedAt: new Date().toISOString() } : x)));
  }

  const visibleRows = equipmentRows.filter(
    (x) => !x.isDeleted && (!regionId || x.regionId === regionId) && (!locationId || x.locationId === locationId)
  );
  const blocks = Array.from(new Set(visibleRows.map((x) => x.blockName || "Khối mới 1")));

  useEffect(() => {
    if (activeEquipmentId && !visibleRows.some((x) => x.id === activeEquipmentId)) {
      setActiveEquipmentId("");
      setStartCreateForActive(false);
    }
  }, [activeEquipmentId, visibleRows]);

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Thiết bị lớn</h2>
      <div className="equipment-form-grid equipment-form-grid--6">
        <label className="equipment-field">
          <span>Khu vực</span>
          <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setLocationId(""); }}>
            <option value="">Tất cả</option>
            {regions.filter((x) => !x.isDeleted).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="equipment-field">
          <span>Bếp/Site</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Tất cả</option>
            {activeLocations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="equipment-field">
          <span>Ngày kiểm kê</span>
          <input type="date" value={inventoryDate} onChange={(e) => setInventoryDate(e.target.value)} />
        </label>
        <label className="equipment-field">
          <span>Ca kiểm kê</span>
          <input value={shift} onChange={(e) => setShift(e.target.value)} />
        </label>
        <label className="equipment-field">
          <span>Bộ phận</span>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} />
        </label>
        <label className="equipment-field">
          <span>Người phụ trách</span>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </label>
      </div>

      <div className="equipment-actions equipment-actions--toolbar equipment-actions--report-like report-toolbar-saas-even">
        <button type="button" className="report-toolbar-saas-primary equipment-toolbar-main" onClick={addBlockSection}>
          <span className="report-toolbar-saas-primary-main">
            <span className="report-toolbar-saas-primary-icon" aria-hidden>
              <IconPlusLine />
            </span>
            <span className="report-toolbar-saas-primary-text">Thêm khối khu vực</span>
          </span>
        </button>
        <button
          type="button"
          className="report-toolbar-saas-ghost equipment-toolbar-ghost"
          onClick={() => window.alert("Dữ liệu đã được lưu tự động theo localStorage.")}
          title="Lưu"
        >
          <span className="report-toolbar-saas-ghost-icon" aria-hidden>
            <IconSaveLine />
          </span>
          <span>Lưu nháp</span>
        </button>
        <button
          type="button"
          className="report-toolbar-saas-ghost equipment-toolbar-ghost"
          onClick={() => window.alert("Chức năng Xuất Excel đang liên kết sau.")}
          title="Xuất Excel"
        >
          <span className="report-toolbar-saas-ghost-icon" aria-hidden>
            <IconChartLine />
          </span>
          <span>Xuất Excel</span>
        </button>
        <button
          type="button"
          className="report-toolbar-saas-ghost equipment-toolbar-ghost"
          onClick={() => window.alert("Chức năng In PDF đang liên kết sau.")}
          title="In PDF"
        >
          <span className="report-toolbar-saas-ghost-icon" aria-hidden>
            <IconPrintLine />
          </span>
          <span>In PDF</span>
        </button>
      </div>

      {blocks.map((blockName) => {
        const blockRows = visibleRows.filter((x) => (x.blockName || "Khối mới 1") === blockName);
        const activeRowInBlock = blockRows.find((x) => x.id === activeEquipmentId) || null;
        const rowsToShow = activeRowInBlock ? [activeRowInBlock] : blockRows;
        const isCollapsed = Boolean(collapsedBlocks[String(blockName || "").trim()]);
        return (
          <div className="equipment-card" key={blockName}>
            <div className="equipment-card-head ccdc-block-head">
              <div className="ccdc-block-title-wrap">
                {editingBlockName === blockName ? (
                  <input
                    className="ccdc-block-title-input"
                    value={editingBlockValue}
                    onChange={(e) => setEditingBlockValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameBlock(blockName, blockRows);
                      if (e.key === "Escape") cancelRenameBlock();
                    }}
                    autoFocus
                  />
                ) : (
                  <h3>{blockName}</h3>
                )}
                <button
                  type="button"
                  className="ccdc-collapse-btn"
                  title={isCollapsed ? "Mở rộng khối" : "Thu gọn khối"}
                  onClick={() => toggleCollapseBlock(blockName)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? "▾" : "▴"}
                </button>
              </div>
              <div className="ccdc-block-actions">
                <button type="button" className="equipment-btn equipment-btn--icon equipment-flat-btn equipment-flat-btn--edit" title="Đổi tên khối" onClick={() => startRenameBlock(blockName)}>
                  <IconEditLine />
                </button>
                <button type="button" className="equipment-btn equipment-btn--icon equipment-flat-btn equipment-flat-btn--danger" title="Xoá khối" onClick={() => removeBlock(blockName, blockRows)}>
                  <IconTrash2D />
                </button>
                <button type="button" className="equipment-btn equipment-btn--icon equipment-flat-btn equipment-flat-btn--add" onClick={() => addEquipmentInline(blockName)} title="Thêm dòng">
                  <IconPlusLine />
                </button>
              </div>
            </div>
            {!isCollapsed && (
              <>
                <div className="equipment-table-wrap">
                  <table className="equipment-table equipment-table--flat-input">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã thiết bị</th>
                        <th className="name-col">Tên thiết bị</th>
                        <th>Ngày đưa vào sử dụng</th>
                        <th>Người phụ trách</th>
                        <th>Trạng thái hiện tại</th>
                        <th>Ngày kiểm gần nhất</th>
                        <th>Nhật ký xử lý</th>
                        <th>Cảnh báo</th>
                        <th>Xoá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsToShow.map((row, idx) => {
                        const s = equipmentSummary[row.id] || {};
                        const logs = s.logs || [];
                        const effectiveStatus = row.currentStatus || s.currentStatus || "Hoạt động tốt";
                        const navGroup = `equip-grid-${blockName}`;
                        return (
                          <Fragment key={row.id}>
                            <tr>
                              <td>{idx + 1}</td>
                              <td><input value={row.code || ""} readOnly /></td>
                              <td className="name-col">
                                <textarea
                                  value={row.name || ""}
                                  rows={2}
                                  data-nav-group={navGroup}
                                  data-nav-row={idx}
                                  data-nav-col={0}
                                  onKeyDown={handleExcelNavKeyDown}
                                  onChange={(e) => patchRow(row.id, { name: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  value={row.startDate || ""}
                                  data-nav-group={navGroup}
                                  data-nav-row={idx}
                                  data-nav-col={1}
                                  onKeyDown={handleExcelNavKeyDown}
                                  onChange={(e) => patchRow(row.id, { startDate: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  value={row.owner || ""}
                                  data-nav-group={navGroup}
                                  data-nav-row={idx}
                                  data-nav-col={2}
                                  onKeyDown={handleExcelNavKeyDown}
                                  onChange={(e) => patchRow(row.id, { owner: e.target.value })}
                                />
                              </td>
                              <td>
                                <select
                                  value={effectiveStatus}
                                  data-nav-group={navGroup}
                                  data-nav-row={idx}
                                  data-nav-col={3}
                                  onKeyDown={handleExcelNavKeyDown}
                                  onChange={(e) => patchRow(row.id, { currentStatus: e.target.value })}
                                >
                                  {STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>{s.lastCheckDate || "—"}</td>
                              <td>
                                <div className="equipment-log-cell">
                                  {!logs.length ? (
                                    <button
                                      type="button"
                                      className="equipment-link-btn equipment-log-summary-empty-text"
                                      onClick={() => {
                                        setActiveEquipmentId(row.id);
                                        setStartCreateForActive(false);
                                      }}
                                    >
                                      Chưa có lịch sử xử lý
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="equipment-link-btn equipment-log-summary"
                                      onClick={() => {
                                        setActiveEquipmentId(row.id);
                                        setStartCreateForActive(false);
                                      }}
                                    >
                                      <span>{`${logs.length} lần · ${money(s.totalCost)}đ`}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="equipment-btn equipment-btn--icon equipment-flat-btn equipment-flat-btn--add"
                                    title="Thêm xử lý"
                                    onClick={() => {
                                      setActiveEquipmentId(row.id);
                                      setStartCreateForActive(true);
                                    }}
                                  >
                                    <IconPlusLine />
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span className={`equipment-status ${getAlertMeta(effectiveStatus).className}`}>
                                  {getAlertMeta(effectiveStatus).label}
                                </span>
                              </td>
                              <td><button className="equipment-btn equipment-btn--icon equipment-flat-btn equipment-flat-btn--danger" title="Xoá" onClick={() => removeRow(row.id)}><IconTrash2D /></button></td>
                            </tr>
                          </Fragment>
                        );
                      })}
                      {!blockRows.length && (
                        <tr><td colSpan={10} className="equipment-empty">Chưa có thiết bị trong khối này.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {activeRowInBlock && (
                  <div className="equipment-log-panel">
                    <div className="equipment-focus-panel-head">
                      <div className="equipment-expand-head">
                        <strong>{`Nhật ký xử lý thiết bị: ${activeRowInBlock.code || "—"} - ${activeRowInBlock.name || "Chưa đặt tên"}`}</strong>
                      </div>
                      <button
                        type="button"
                        className="equipment-btn"
                        onClick={() => {
                          setActiveEquipmentId("");
                          setStartCreateForActive(false);
                        }}
                      >
                        Đóng / Quay lại danh sách
                      </button>
                    </div>
                    <div className="equipment-focus-device-meta">
                      <div className="equipment-focus-meta-item">
                        <span className="equipment-focus-meta-label">Mã thiết bị</span>
                        <strong>{activeRowInBlock.code || "—"}</strong>
                      </div>
                      <div className="equipment-focus-meta-item">
                        <span className="equipment-focus-meta-label">Tên thiết bị</span>
                        <strong>{activeRowInBlock.name || "—"}</strong>
                      </div>
                      <div className="equipment-focus-meta-item">
                        <span className="equipment-focus-meta-label">Trạng thái hiện tại</span>
                        <strong>{activeRowInBlock.currentStatus || (equipmentSummary[activeRowInBlock.id] || {}).currentStatus || "Hoạt động tốt"}</strong>
                      </div>
                      <div className="equipment-focus-meta-item">
                        <span className="equipment-focus-meta-label">Ngày kiểm gần nhất</span>
                        <strong>{(equipmentSummary[activeRowInBlock.id] || {}).lastCheckDate || "—"}</strong>
                      </div>
                    </div>
                    <LogEditor
                      rows={(equipmentSummary[activeRowInBlock.id] || {}).logs || []}
                      startCreate={startCreateForActive}
                      navGroup={`log-form-${activeRowInBlock.id}`}
                      defaultAfterStatus={activeRowInBlock.currentStatus || (equipmentSummary[activeRowInBlock.id] || {}).currentStatus || "Hoạt động tốt"}
                      onCreateModeUsed={() => setStartCreateForActive(false)}
                      onAdd={(payload) => {
                        addLog(activeRowInBlock.id, payload);
                        setStartCreateForActive(false);
                      }}
                      onCancel={() => setStartCreateForActive(false)}
                      onDelete={softDeleteLog}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {!blocks.length && (
        <div className="equipment-card">
          <p className="equipment-empty">Chưa có khối nào. Bấm "Thêm khối khu vực" để tạo khối mới.</p>
        </div>
      )}
    </section>
  );
}

function LogEditor({ rows, startCreate, navGroup, defaultAfterStatus, onCreateModeUsed, onAdd, onCancel, onDelete }) {
  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    processType: "Sửa chữa",
    issue: "",
    cause: "",
    solution: "",
    material: "",
    qty: 1,
    unitPrice: 0,
    totalCost: 0,
    afterStatus: defaultAfterStatus || "Hoạt động tốt",
    technician: "",
    note: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});

  const patch = (key, value) => setForm((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    const qty = normalizeNonNegativeNumber(form.qty);
    const unitPrice = normalizeNonNegativeNumber(form.unitPrice);
    const total = qty * unitPrice;
    if (total !== form.totalCost) {
      setForm((v) => ({ ...v, totalCost: total }));
    }
  }, [form.qty, form.unitPrice, form.totalCost]);

  const resetForm = () =>
    setForm({
      logDate: new Date().toISOString().slice(0, 10),
      processType: "Sửa chữa",
      issue: "",
      cause: "",
      solution: "",
      material: "",
      qty: 1,
      unitPrice: 0,
      totalCost: 0,
      afterStatus: defaultAfterStatus || "Hoạt động tốt",
      technician: "",
      note: "",
    });

  useEffect(() => {
    if (startCreate) {
      setForm((v) => ({ ...v, afterStatus: defaultAfterStatus || "Hoạt động tốt" }));
      setIsAdding(true);
      if (typeof onCreateModeUsed === "function") onCreateModeUsed();
    }
  }, [startCreate, defaultAfterStatus, onCreateModeUsed]);

  function handleAddLog() {
    const qty = normalizeNonNegativeNumber(form.qty);
    const unitPrice = normalizeNonNegativeNumber(form.unitPrice);
    if (!form.logDate) {
      window.alert("Vui lòng chọn ngày xử lý.");
      return;
    }
    onAdd({
      ...form,
      qty,
      unitPrice,
      totalCost: qty * unitPrice,
    });
    resetForm();
    setIsAdding(false);
  }

  return (
    <>
      {!isAdding && (
        <div className="equipment-actions">
          <button type="button" className="equipment-btn" onClick={() => setIsAdding(true)}>
            + Thêm xử lý
          </button>
        </div>
      )}
      {isAdding && (
        <div className="equipment-log-entry-card">
          <div className="equipment-log-entry-title">Lịch sử bảo trì / sửa chữa</div>
          <table className="equipment-log-form-table">
            <tbody>
              <tr>
                <th>Ngày</th>
                <td><input type="date" value={form.logDate} data-nav-group={navGroup} data-nav-row={0} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("logDate", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Loại xử lý</th>
                <td><select value={form.processType} data-nav-group={navGroup} data-nav-row={1} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("processType", e.target.value)}>{PROCESS_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
              </tr>
              <tr>
                <th>Lỗi/Nội dung</th>
                <td><input value={form.issue} data-nav-group={navGroup} data-nav-row={2} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("issue", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Nguyên nhân</th>
                <td><input value={form.cause} data-nav-group={navGroup} data-nav-row={3} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("cause", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Cách xử lý</th>
                <td><input value={form.solution} data-nav-group={navGroup} data-nav-row={4} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("solution", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Vật tư thay thế</th>
                <td><input value={form.material} data-nav-group={navGroup} data-nav-row={5} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("material", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Số lượng</th>
                <td><input type="number" min="0" step="1" value={form.qty} data-nav-group={navGroup} data-nav-row={6} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("qty", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Đơn giá</th>
                <td><input type="number" min="0" step="1000" value={form.unitPrice} data-nav-group={navGroup} data-nav-row={7} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("unitPrice", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Thành tiền (Auto)</th>
                <td><div className="ccdc-receipt-draft-total equipment-log-total-readonly">{money(form.totalCost)}đ</div></td>
              </tr>
              <tr>
                <th>Trạng thái sau xử lý</th>
                <td><select value={form.afterStatus} data-nav-group={navGroup} data-nav-row={8} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("afterStatus", e.target.value)}>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
              </tr>
              <tr>
                <th>Người thực hiện</th>
                <td><input value={form.technician} data-nav-group={navGroup} data-nav-row={9} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("technician", e.target.value)} /></td>
              </tr>
              <tr>
                <th>Ghi chú</th>
                <td><input value={form.note} data-nav-group={navGroup} data-nav-row={10} data-nav-col={0} onKeyDown={handleExcelNavKeyDown} onChange={(e) => patch("note", e.target.value)} /></td>
              </tr>
            </tbody>
          </table>
          <div className="equipment-log-entry-actions">
            <button type="button" className="ccdc-save-receipt-btn" title="Lưu" onClick={handleAddLog}>Save</button>
            <button
              type="button"
              className="equipment-btn"
              title="Đóng"
              onClick={() => {
                setIsAdding(false);
                if (typeof onCancel === "function") onCancel();
              }}
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
      <div className="equipment-table-wrap">
        <table className="equipment-table equipment-table--compact">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại xử lý</th>
              <th>Lỗi/Nội dung</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Trạng thái</th>
              <th>Lưu ý</th>
              <th>Xoá</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const hasExtra = Boolean((x.cause || "").trim() || (x.note || "").trim());
              return (
                <Fragment key={x.id}>
                  <tr>
                    <td>{x.logDate || "—"}</td>
                    <td>{x.processType || "—"}</td>
                    <td>{x.issue || x.solution || "—"}</td>
                    <td>{x.qty || 0}</td>
                    <td>{money(x.unitPrice)}đ</td>
                    <td>{money(x.totalCost)}đ</td>
                    <td>{x.afterStatus || "—"}</td>
                    <td>
                      {hasExtra ? (
                        <button
                          type="button"
                          className="equipment-link-btn"
                          onClick={() => setExpandedDetails((v) => ({ ...v, [x.id]: !v[x.id] }))}
                        >
                          {expandedDetails[x.id] ? "Ẩn" : "Chi tiết"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td><button className="equipment-btn equipment-btn--icon danger" title="Xoá" onClick={() => onDelete(x.id)}><IconTrash2D /></button></td>
                  </tr>
                  {hasExtra && expandedDetails[x.id] && (
                    <tr>
                      <td colSpan={9} className="equipment-log-detail-row">
                        <strong>Nguyên nhân:</strong> {x.cause || "—"}{"  "}
                        <strong>Ghi chú:</strong> {x.note || "—"}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={9} className="equipment-empty">Chưa có nhật ký xử lý thiết bị.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
