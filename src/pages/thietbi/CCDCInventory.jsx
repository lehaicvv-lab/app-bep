import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconChartLine,
  IconCheckLine,
  IconEditLine,
  IconPlusLine,
  IconPrintLine,
  IconRotateLine,
  IconSaveLine,
} from "../../components/icons/AppLineIcons.jsx";
import IconTrash2D from "../../components/icons/IconTrash2D.jsx";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function monthKey(dateStr) {
  return String(dateStr || "").slice(0, 7);
}

function previousMonthKey(month) {
  const [y, m] = String(month || "").split("-");
  if (!y || !m) return "";
  const d = new Date(Number(y), Number(m) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** yyyy-mm-dd → dd/mm/yyyy */
function formatDateVi(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s || "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function moneyVi(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

/** Thành tiền dòng nhập (tương thích bản ghi cũ không có đơn giá) */
function receiptLineTotal(rec) {
  const qty = Number(rec.qty || 0);
  const unit = Number(rec.unitPrice ?? rec.unit_price ?? 0);
  if (rec.totalCost != null && rec.totalCost !== "") {
    const t = Number(rec.totalCost);
    if (!Number.isNaN(t)) return t;
  }
  return qty * unit;
}

const NAV_FIELDS = ["itemName", "unit", "receipt", "actualQty", "note"];

function cellId(rowId, field) {
  return `ccdc-cell-${rowId}-${field}`;
}

function focusCcdcCell(rowId, field) {
  const id = cellId(rowId, field);
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (el && typeof el.focus === "function") el.focus();
}

function TrashIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M9 2.5h6c.83 0 1.5.67 1.5 1.5V6H20a1 1 0 1 1 0 2h-1.22l-.91 12.1A2.5 2.5 0 0 1 15.38 22H8.62a2.5 2.5 0 0 1-2.49-1.9L5.22 8H4a1 1 0 1 1 0-2h3.5V4c0-.83.67-1.5 1.5-1.5Zm.5 3.5h5V4.5h-5V6Zm.1 4.25a1 1 0 0 1 1 1V17a1 1 0 1 1-2 0v-5.75a1 1 0 0 1 1-1Zm4.8 0a1 1 0 0 1 1 1V17a1 1 0 1 1-2 0v-5.75a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function rateSeverityClass(rate) {
  if (!Number.isFinite(rate)) return "rate-safe";
  const absRate = Math.abs(rate);
  if (absRate < 5) return "rate-safe";
  if (absRate < 15) return "rate-warn";
  return "rate-danger";
}

function normalizeNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export default function CCDCInventory({
  regions,
  locations,
  rows,
  monthly,
  receipts,
  onSaveRows,
  onSaveMonthly,
  onSaveReceipts,
}) {
  const [regionId, setRegionId] = useState(regions.find((x) => !x.isDeleted)?.id || "");
  const [locationId, setLocationId] = useState("");
  const [inventoryDate, setInventoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("Ca sáng");
  const [department, setDepartment] = useState("");
  const [owner, setOwner] = useState("");
  const [receiptPanelRowId, setReceiptPanelRowId] = useState(null);
  const [receiptDraft, setReceiptDraft] = useState({
    receiptDate: "",
    qty: "",
    unitPrice: "",
    note: "",
  });
  const [editingBlockName, setEditingBlockName] = useState("");
  const [editingBlockValue, setEditingBlockValue] = useState("");
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const savingReceiptRef = useRef(false);

  const currentMonth = monthKey(inventoryDate);
  const prevMonth = previousMonthKey(currentMonth);
  const activeLocations = useMemo(
    () => locations.filter((x) => !x.isDeleted && (!regionId || x.regionId === regionId)),
    [locations, regionId]
  );
  const visibleRows = rows.filter((x) => !x.isDeleted && (!regionId || x.regionId === regionId) && (!locationId || x.locationId === locationId));
  const blocks = Array.from(new Set(visibleRows.map((x) => x.blockName || "Khu chung")));

  useEffect(() => {
    if (receiptPanelRowId) {
      setReceiptDraft({ receiptDate: inventoryDate, qty: "", unitPrice: "", note: "" });
    }
  }, [receiptPanelRowId, inventoryDate]);

  useEffect(() => {
    if (!receiptPanelRowId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setReceiptPanelRowId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receiptPanelRowId]);

  /**
   * Chỉ focus ô tiếp theo — không setValue / không copy dòng.
   * Gắn trực tiếp trên ô (target) + chặn IME Enter + defer focus để tránh autofill/copy khi gõ tiếng Việt.
   */
  const handleNavKeyDown = useCallback((e, blockRows, rowId, field) => {
    if (e.target.closest?.(".ccdc-receipt-panel")) return;
    if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;

    if (!["Enter", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

    const rowIdx = blockRows.findIndex((r) => r.id === rowId);
    const colIdx = NAV_FIELDS.indexOf(field);
    if (rowIdx < 0 || colIdx < 0) return;

    e.preventDefault();
    e.stopPropagation();

    const go = (rid, f) => {
      queueMicrotask(() => focusCcdcCell(rid, f));
    };

    if (e.key === "Enter" && !e.shiftKey) {
      if (rowIdx < blockRows.length - 1) go(blockRows[rowIdx + 1].id, field);
      return;
    }
    if (e.key === "ArrowDown") {
      if (rowIdx < blockRows.length - 1) go(blockRows[rowIdx + 1].id, field);
      return;
    }
    if (e.key === "ArrowUp") {
      if (rowIdx > 0) go(blockRows[rowIdx - 1].id, field);
      return;
    }
    if (e.key === "ArrowRight") {
      const next = NAV_FIELDS[colIdx + 1];
      if (next) go(rowId, next);
      return;
    }
    if (e.key === "ArrowLeft") {
      const prev = NAV_FIELDS[colIdx - 1];
      if (prev) go(rowId, prev);
    }
  }, []);

  function addBlock() {
    const existingBlocks = Array.from(new Set(rows.filter((x) => !x.isDeleted).map((x) => (x.blockName || "").trim()).filter(Boolean)));
    const suggested = `Khối mới ${existingBlocks.length + 1}`;
    const blockInput = window.prompt("Tên khối khu vực (ví dụ: Khu sơ chế)", suggested);
    if (blockInput === null) return;
    const blockName = blockInput.trim() || suggested;

    const fallbackRegionId = regionId || regions.find((x) => !x.isDeleted)?.id || "";
    const fallbackLocationId =
      locationId ||
      activeLocations.find((x) => !x.isDeleted)?.id ||
      locations.find((x) => !x.isDeleted && x.regionId === fallbackRegionId)?.id ||
      "";

    if (!fallbackRegionId || !fallbackLocationId) {
      window.alert("Vui lòng tạo/chọn Khu vực và Bếp/Site trước khi thêm khối khu vực.");
      return;
    }

    const now = new Date().toISOString();
    const row = {
      id: uid(),
      regionId: fallbackRegionId,
      locationId: fallbackLocationId,
      blockName,
      itemName: "",
      unit: "Cái",
      note: "",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    onSaveRows([row, ...rows]);
  }

  function addRow(blockName) {
    const now = new Date().toISOString();
    const row = {
      id: uid(),
      regionId,
      locationId,
      blockName,
      itemName: "",
      unit: "Cái",
      note: "",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    onSaveRows([row, ...rows]);
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

  function toggleCollapseBlock(blockName) {
    const key = String(blockName || "").trim();
    if (!key) return;
    setCollapsedBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renameBlock(blockName, blockRows) {
    const current = String(blockName || "").trim();
    if (!current) return;
    const targetIds = new Set((blockRows || []).map((x) => x.id));
    if (!targetIds.size) return;
    const next = String(editingBlockValue || "").trim();
    if (!next || next === current) {
      cancelRenameBlock();
      return;
    }

    const now = new Date().toISOString();
    onSaveRows(
      rows.map((x) => (targetIds.has(x.id) ? { ...x, blockName: next, updatedAt: now } : x))
    );
    cancelRenameBlock();
  }

  function removeBlock(blockName, blockRows) {
    const current = String(blockName || "").trim();
    if (!current) return;
    const ok = window.confirm(`Xoá khối "${current}"? Toàn bộ dòng trong khối sẽ bị xoá.`);
    if (!ok) return;

    const now = new Date().toISOString();
    const targetIds = new Set((blockRows || []).map((x) => x.id));
    if (!targetIds.size) return;

    if (receiptPanelRowId && targetIds.has(receiptPanelRowId)) {
      setReceiptPanelRowId(null);
    }

    onSaveRows(
      rows.map((x) => (targetIds.has(x.id) ? { ...x, isDeleted: true, updatedAt: now } : x))
    );
  }

  function patchRow(id, patch) {
    onSaveRows(rows.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)));
  }

  function removeRow(id) {
    onSaveRows(rows.map((x) => (x.id === id ? { ...x, isDeleted: true, updatedAt: new Date().toISOString() } : x)));
  }

  function getMonthly(rowId) {
    return monthly.find((x) => x.rowId === rowId && x.monthKey === currentMonth && !x.isDeleted);
  }

  function upsertMonthly(rowId, actualQty, note) {
    const safeQty = normalizeNonNegativeNumber(actualQty);
    const old = getMonthly(rowId);
    const now = new Date().toISOString();
    if (old) {
      onSaveMonthly(monthly.map((x) => (x.id === old.id ? { ...x, actualQty: safeQty, note, updatedAt: now } : x)));
      return;
    }
    onSaveMonthly([
      {
        id: uid(),
        rowId,
        monthKey: currentMonth,
        actualQty: safeQty,
        note: note || "",
        checkDate: inventoryDate,
        shift,
        department,
        owner,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      },
      ...monthly,
    ]);
  }

  function toggleReceiptPanel(rowId) {
    setReceiptPanelRowId((cur) => (cur === rowId ? null : rowId));
  }

  function saveReceiptDraft(rowId) {
    if (receiptPanelRowId !== rowId || savingReceiptRef.current) return;
    const raw = String(receiptDraft.qty ?? "").trim();
    if (raw === "") return;
    const qty = Number(raw.replace(",", "."));
    if (Number.isNaN(qty) || qty <= 0) return;
    const rawPrice = String(receiptDraft.unitPrice ?? "").trim();
    const unitPrice = rawPrice === "" ? 0 : Number(rawPrice.replace(",", "."));
    if (Number.isNaN(unitPrice) || unitPrice < 0) return;
    const totalCost = qty * unitPrice;
    savingReceiptRef.current = true;
    try {
      const now = new Date().toISOString();
      onSaveReceipts([
        {
          id: uid(),
          rowId,
          receiptDate: receiptDraft.receiptDate || inventoryDate,
          qty,
          unitPrice,
          totalCost,
          note: (receiptDraft.note || "").trim(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
        },
        ...receipts,
      ]);
      setReceiptPanelRowId(null);
    } finally {
      savingReceiptRef.current = false;
    }
  }

  function softDeleteReceipt(recId) {
    const t = new Date().toISOString();
    onSaveReceipts(receipts.map((x) => (x.id === recId ? { ...x, isDeleted: true, updatedAt: t } : x)));
  }

  function receiptHistoryForRow(rowId) {
    return receipts
      .filter((x) => x.rowId === rowId && monthKey(x.receiptDate) === currentMonth && !x.isDeleted)
      .slice()
      .sort((a, b) => String(b.receiptDate).localeCompare(String(a.receiptDate)));
  }

  const draftTotal = useMemo(() => {
    const q = Number(String(receiptDraft.qty).replace(",", "."));
    const p = Number(String(receiptDraft.unitPrice).replace(",", "."));
    if (Number.isNaN(q) || Number.isNaN(p)) return 0;
    return q * p;
  }, [receiptDraft.qty, receiptDraft.unitPrice]);

  return (
    <section className="equipment-section ccdc-inventory">
      <h2 className="equipment-title">CCDC</h2>
      <div className="equipment-form-grid equipment-form-grid--6">
        <label className="equipment-field">
          <span>Khu vực</span>
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setLocationId("");
            }}
          >
            {regions.filter((x) => !x.isDeleted).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field">
          <span>Bếp/Site</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Chọn</option>
            {activeLocations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
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
      <div className="equipment-actions equipment-actions--toolbar">
        <button type="button" className="equipment-btn equipment-btn--with-icon" onClick={addBlock}>
          <IconPlusLine />
          <span>Thêm khối khu vực</span>
        </button>
        <button type="button" className="equipment-btn equipment-btn--icon" onClick={() => window.alert("Dữ liệu đã được lưu tự động theo localStorage.")} title="Lưu">
          <IconSaveLine />
        </button>
        <button type="button" className="equipment-btn equipment-btn--icon" onClick={() => window.alert("Chức năng Xuất Excel đang liên kết sau.")} title="Xuất Excel">
          <IconChartLine />
        </button>
        <button type="button" className="equipment-btn equipment-btn--icon" onClick={() => window.alert("Chức năng In PDF đang liên kết sau.")} title="In PDF">
          <IconPrintLine />
        </button>
      </div>

      {blocks.map((blockName) => {
        const blockRows = visibleRows.filter((x) => (x.blockName || "Khu chung") === blockName);
        const isCollapsed = Boolean(collapsedBlocks[String(blockName || "").trim()]);
        return (
          <div className="equipment-card ccdc-block-card" key={blockName}>
            <div className="equipment-card-head ccdc-block-head">
              <div className="ccdc-block-title-wrap">
                {editingBlockName === blockName ? (
                  <input
                    className="ccdc-block-title-input"
                    value={editingBlockValue}
                    onChange={(e) => setEditingBlockValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renameBlock(blockName, blockRows);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRenameBlock();
                      }
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
                  {isCollapsed ? "▶" : "▼"}
                </button>
              </div>
              <div className="ccdc-block-actions">
                {editingBlockName === blockName ? (
                  <>
                    <button
                      type="button"
                      className="equipment-btn equipment-btn--icon"
                      title="Lưu tên khối"
                      onClick={() => renameBlock(blockName, blockRows)}
                    >
                      <IconCheckLine />
                    </button>
                    <button
                      type="button"
                      className="equipment-btn equipment-btn--icon"
                      title="Huỷ"
                      onClick={cancelRenameBlock}
                    >
                      <IconRotateLine />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="equipment-btn equipment-btn--icon"
                    title="Đổi tên khối"
                    onClick={() => startRenameBlock(blockName)}
                  >
                    <IconEditLine />
                  </button>
                )}
                <button
                  type="button"
                  className="equipment-btn equipment-btn--icon danger"
                  title="Xoá khối"
                  onClick={() => removeBlock(blockName, blockRows)}
                >
                  <IconTrash2D />
                </button>
                <button type="button" className="equipment-btn equipment-btn--icon" onClick={() => addRow(blockName)} title="Thêm dòng">
                  <IconPlusLine />
                </button>
              </div>
            </div>
            {!isCollapsed && (
              <div className="equipment-table-wrap ccdc-sheet-wrap">
                <table className="equipment-table ccdc-sheet-table">
                <thead>
                  <tr>
                    <th className="ccdc-col-stt">STT</th>
                    <th className="ccdc-col-name">Tên CCDC / thiết bị nhỏ</th>
                    <th className="ccdc-col-unit">ĐVT</th>
                    <th className="ccdc-col-receipt">Nhập trong tháng</th>
                    <th className="ccdc-col-qty">Kiểm kê</th>
                    <th className="ccdc-col-diff">Hao hụt / Chênh lệch</th>
                    <th className="ccdc-col-rate">Tỷ lệ %</th>
                    <th className="ccdc-col-status">Trạng thái</th>
                    <th className="ccdc-col-note">Ghi chú</th>
                    <th className="ccdc-col-action">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {blockRows.map((row, idx) => {
                    const prevActual = Number(monthly.find((x) => x.rowId === row.id && x.monthKey === prevMonth && !x.isDeleted)?.actualQty || 0);
                    const prevReceipts = receipts
                      .filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === prevMonth && !x.isDeleted)
                      .reduce((sum, x) => sum + Number(x.qty || 0), 0);
                    const expected = prevActual + prevReceipts;
                    const cur = getMonthly(row.id);
                    const actual = Number(cur?.actualQty || 0);
                    const diff = actual - expected;
                    const rate = expected > 0 ? (diff / expected) * 100 : 0;
                    const thisMonthReceipts = receipts.filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === currentMonth && !x.isDeleted);
                    const thisQty = thisMonthReceipts.reduce((sum, x) => sum + Number(x.qty || 0), 0);
                    const thisMoney = thisMonthReceipts.reduce((sum, x) => sum + receiptLineTotal(x), 0);
                    const status = !cur ? "Chưa kiểm kê" : diff < 0 ? "Thiếu" : diff > 0 ? "Dư" : "Bình thường";
                    const history = receiptHistoryForRow(row.id);
                    const panelOpen = receiptPanelRowId === row.id;

                    return (
                      <Fragment key={row.id}>
                        <tr className="ccdc-data-row">
                          <td className="ccdc-col-stt ccdc-cell-readonly">{idx + 1}</td>
                          <td className="ccdc-col-name">
                            <input
                              id={cellId(row.id, "itemName")}
                              className="ccdc-cell-input"
                              type="text"
                              name={`ccdc-item-${row.id}`}
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-ccdc-nav-field="itemName"
                              data-ccdc-row-id={row.id}
                              data-ccdc-block-name={blockName}
                              value={row.itemName || ""}
                              onChange={(e) => patchRow(row.id, { itemName: e.target.value })}
                              onKeyDown={(e) => handleNavKeyDown(e, blockRows, row.id, "itemName")}
                            />
                          </td>
                          <td className="ccdc-col-unit">
                            <input
                              id={cellId(row.id, "unit")}
                              className="ccdc-cell-input"
                              type="text"
                              name={`ccdc-unit-${row.id}`}
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-ccdc-nav-field="unit"
                              data-ccdc-row-id={row.id}
                              data-ccdc-block-name={blockName}
                              value={row.unit || ""}
                              onChange={(e) => patchRow(row.id, { unit: e.target.value })}
                              onKeyDown={(e) => handleNavKeyDown(e, blockRows, row.id, "unit")}
                            />
                          </td>
                          <td className="ccdc-col-receipt">
                            <div className="ccdc-receipt-cell">
                              <button
                                type="button"
                                className="ccdc-receipt-summary-inline"
                                title="Mở lịch sử nhập"
                                onClick={() => toggleReceiptPanel(row.id)}
                              >
                                {thisMonthReceipts.length > 0
                                  ? `${thisMonthReceipts.length} | ${moneyVi(thisQty)} | ${moneyVi(thisMoney)}đ`
                                  : "- | - | -"}
                              </button>
                              <button
                                type="button"
                                id={cellId(row.id, "receipt")}
                                className="ccdc-add-receipt-btn"
                                title="Nhập thêm"
                                aria-expanded={panelOpen}
                                data-ccdc-nav-field="receipt"
                                data-ccdc-row-id={row.id}
                                data-ccdc-block-name={blockName}
                                onClick={() => toggleReceiptPanel(row.id)}
                                onKeyDown={(e) => handleNavKeyDown(e, blockRows, row.id, "receipt")}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    d="M12 5v14M5 12h14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="ccdc-col-qty">
                            <input
                              id={cellId(row.id, "actualQty")}
                              className="ccdc-cell-input"
                              type="text"
                              inputMode="decimal"
                              name={`ccdc-actual-${row.id}`}
                              autoComplete="off"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-ccdc-nav-field="actualQty"
                              data-ccdc-row-id={row.id}
                              data-ccdc-block-name={blockName}
                              value={cur?.actualQty ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                upsertMonthly(row.id, v === "" ? 0 : Number(v.replace(",", ".")), cur?.note ?? row.note ?? "");
                              }}
                              onKeyDown={(e) => handleNavKeyDown(e, blockRows, row.id, "actualQty")}
                            />
                          </td>
                          <td className="ccdc-col-diff ccdc-cell-readonly">{diff}</td>
                          <td className={`ccdc-col-rate ccdc-cell-readonly ${rateSeverityClass(rate)}`}>
                            {Number.isFinite(rate) ? `${rate.toFixed(1)}%` : "0%"}
                          </td>
                          <td className="ccdc-col-status">
                            <span
                              className={`equipment-status ${
                                status === "Thiếu"
                                  ? "danger"
                                  : status === "Dư"
                                    ? "surplus"
                                    : status === "Chưa kiểm kê"
                                      ? "warn"
                                      : "ok"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="ccdc-col-note">
                            <input
                              id={cellId(row.id, "note")}
                              className="ccdc-cell-input"
                              type="text"
                              name={`ccdc-note-${row.id}`}
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-ccdc-nav-field="note"
                              data-ccdc-row-id={row.id}
                              data-ccdc-block-name={blockName}
                              value={cur?.note ?? row.note ?? ""}
                              onChange={(e) => upsertMonthly(row.id, cur?.actualQty ?? 0, e.target.value)}
                              onKeyDown={(e) => handleNavKeyDown(e, blockRows, row.id, "note")}
                            />
                          </td>
                          <td className="ccdc-col-action">
                            <button type="button" className="ccdc-row-delete" title="Xoá dòng" onClick={() => removeRow(row.id)}>
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                        {panelOpen && (
                          <tr className="ccdc-receipt-panel-row">
                            <td colSpan={10}>
                              <div className="ccdc-receipt-panel">
                                <div className="ccdc-receipt-panel-title">Lịch sử nhập trong tháng</div>
                                <div className="ccdc-receipt-panel-scroll">
                                  <table className="ccdc-receipt-inner-table">
                                    <thead>
                                      <tr>
                                        <th>Ngày</th>
                                        <th>Số lượng</th>
                                        <th>Đơn giá</th>
                                        <th>Thành tiền</th>
                                        <th>Ghi chú</th>
                                        <th className="ccdc-receipt-col-del">Xoá</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {history.map((rec) => (
                                        <tr key={rec.id}>
                                          <td>{formatDateVi(rec.receiptDate)}</td>
                                          <td>{moneyVi(rec.qty)}</td>
                                          <td>{moneyVi(rec.unitPrice ?? rec.unit_price ?? 0)}</td>
                                          <td>{moneyVi(receiptLineTotal(rec))}</td>
                                          <td>{rec.note || "—"}</td>
                                          <td>
                                            <button type="button" className="ccdc-receipt-del" title="Xoá" onClick={() => softDeleteReceipt(rec.id)}>
                                              <TrashIcon />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      {!history.length && (
                                        <tr>
                                          <td colSpan={6} className="ccdc-receipt-empty">
                                            Chưa có lần nhập trong tháng này.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="ccdc-receipt-new-row">
                                  <input
                                    type="date"
                                    className="ccdc-cell-input ccdc-receipt-new-input"
                                    value={receiptDraft.receiptDate || ""}
                                    onChange={(e) => setReceiptDraft((d) => ({ ...d, receiptDate: e.target.value }))}
                                  />
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="ccdc-cell-input ccdc-receipt-new-input"
                                    placeholder="Số lượng"
                                    name={`ccdc-rcpt-qty-${row.id}`}
                                    autoComplete="off"
                                    value={receiptDraft.qty}
                                    onChange={(e) => setReceiptDraft((d) => ({ ...d, qty: e.target.value }))}
                                  />
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="ccdc-cell-input ccdc-receipt-new-input"
                                    placeholder="Đơn giá"
                                    name={`ccdc-rcpt-price-${row.id}`}
                                    autoComplete="off"
                                    value={receiptDraft.unitPrice}
                                    onChange={(e) => setReceiptDraft((d) => ({ ...d, unitPrice: e.target.value }))}
                                  />
                                  <span className="ccdc-receipt-draft-total" title="Thành tiền = SL × Đơn giá">
                                    {moneyVi(draftTotal)}đ
                                  </span>
                                  <input
                                    type="text"
                                    className="ccdc-cell-input ccdc-receipt-new-input ccdc-receipt-new-grow"
                                    placeholder="Ghi chú"
                                    name={`ccdc-rcpt-note-${row.id}`}
                                    autoComplete="off"
                                    value={receiptDraft.note}
                                    onChange={(e) => setReceiptDraft((d) => ({ ...d, note: e.target.value }))}
                                  />
                                  <button
                                    type="button"
                                    className="ccdc-save-receipt-btn"
                                    title="Lưu"
                                    onClick={() => saveReceiptDraft(row.id)}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="M20 6L9 17l-5-5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {!blocks.length && <p className="equipment-empty">Chưa có khối khu vực. Chọn khu vực/site rồi bấm &quot;Thêm khối khu vực&quot;.</p>}
    </section>
  );
}
