import { useMemo, useState } from "react";

function money(v) {
  return Number(v || 0).toLocaleString("vi-VN");
}

function normalizeNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

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

const STATUSES = [
  "Hoạt động tốt",
  "Cần theo dõi",
  "Cần bảo trì",
  "Đang hỏng",
  "Đang sửa",
  "Ngưng sử dụng",
  "Đề xuất thay thế",
];

export default function EquipmentLogs({ logs, equipmentById, regions, locations, onSaveLogs, onSyncEquipmentStatus }) {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    regionId: "",
    locationId: "",
    equipmentId: "",
    processType: "",
    afterStatus: "",
  });
  const [editingId, setEditingId] = useState("");

  const activeLogs = logs.filter((x) => !x.isDeleted);
  const equipmentOptions = Object.values(equipmentById).filter((x) => !x.isDeleted);
  const locationMap = Object.fromEntries(locations.map((x) => [x.id, x]));
  const regionMap = Object.fromEntries(regions.map((x) => [x.id, x]));

  const filtered = useMemo(() => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) return [];
    return activeLogs
      .filter((log) => {
      const asset = equipmentById[log.assetId];
      if (!asset || asset.isDeleted) return false;
      if (filters.fromDate && String(log.logDate) < filters.fromDate) return false;
      if (filters.toDate && String(log.logDate) > filters.toDate) return false;
      if (filters.regionId && asset.regionId !== filters.regionId) return false;
      if (filters.locationId && asset.locationId !== filters.locationId) return false;
      if (filters.equipmentId && log.assetId !== filters.equipmentId) return false;
      if (filters.processType && log.processType !== filters.processType) return false;
      if (filters.afterStatus && log.afterStatus !== filters.afterStatus) return false;
      return true;
      })
      .slice()
      .sort((a, b) => {
        const byDate = String(b.logDate || "").localeCompare(String(a.logDate || ""));
        if (byDate !== 0) return byDate;
        return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
      });
  }, [activeLogs, filters, equipmentById]);

  function patchFilter(key, value) {
    setFilters((v) => ({ ...v, [key]: value }));
  }

  function softDelete(id) {
    const ok = window.confirm("Xoá bản ghi sửa chữa này?");
    if (!ok) return;
    onSaveLogs(logs.map((x) => (x.id === id ? { ...x, isDeleted: true, updatedAt: new Date().toISOString() } : x)));
  }

  function patchLog(id, key, value) {
    const now = new Date().toISOString();
    const target = logs.find((x) => x.id === id);
    const normalizedValue = key === "unitPrice" || key === "qty" ? normalizeNonNegativeNumber(value) : value;
    const nextLogs = logs.map((x) =>
      x.id === id
        ? {
            ...x,
            [key]: normalizedValue,
            totalCost:
              key === "unitPrice" || key === "qty"
                ? normalizeNonNegativeNumber(key === "unitPrice" ? normalizedValue : x.unitPrice || 0) *
                  normalizeNonNegativeNumber(key === "qty" ? normalizedValue : x.qty || 0)
                : x.totalCost,
            updatedAt: now,
          }
        : x
    );
    onSaveLogs(nextLogs);
    if (key === "afterStatus" && target?.assetId && typeof onSyncEquipmentStatus === "function") {
      onSyncEquipmentStatus(target.assetId, String(normalizedValue || ""), now);
    }
  }

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Lịch sử sửa chữa</h2>
      <div className="equipment-form-grid equipment-form-grid--7">
        <label className="equipment-field"><span>Từ ngày</span><input type="date" value={filters.fromDate} onChange={(e) => patchFilter("fromDate", e.target.value)} /></label>
        <label className="equipment-field"><span>Đến ngày</span><input type="date" value={filters.toDate} onChange={(e) => patchFilter("toDate", e.target.value)} /></label>
        <label className="equipment-field"><span>Khu vực</span><select value={filters.regionId} onChange={(e) => patchFilter("regionId", e.target.value)}><option value="">Tất cả</option>{regions.filter((x) => !x.isDeleted).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="equipment-field"><span>Bếp/Site</span><select value={filters.locationId} onChange={(e) => patchFilter("locationId", e.target.value)}><option value="">Tất cả</option>{locations.filter((x) => !x.isDeleted).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="equipment-field"><span>Thiết bị</span><select value={filters.equipmentId} onChange={(e) => patchFilter("equipmentId", e.target.value)}><option value="">Tất cả</option>{equipmentOptions.map((x) => <option key={x.id} value={x.id}>{x.name || x.code}</option>)}</select></label>
        <label className="equipment-field"><span>Loại xử lý</span><select value={filters.processType} onChange={(e) => patchFilter("processType", e.target.value)}><option value="">Tất cả</option>{PROCESS_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label className="equipment-field"><span>Trạng thái sau xử lý</span><select value={filters.afterStatus} onChange={(e) => patchFilter("afterStatus", e.target.value)}><option value="">Tất cả</option>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
      </div>

      <div className="equipment-card">
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact">
            <thead>
              <tr>
                <th>Ngày</th><th>Mã thiết bị</th><th>Tên thiết bị</th><th>Khu vực</th><th>Bếp/Site</th><th>Loại xử lý</th><th>Lỗi</th><th>Nguyên nhân</th><th>Cách xử lý</th><th>Vật tư</th><th>Chi phí</th><th>Người xử lý</th><th>Trạng thái sau xử lý</th><th>Ghi chú</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const asset = equipmentById[log.assetId] || {};
                const editing = editingId === log.id;
                return (
                  <tr key={log.id}>
                    <td>{editing ? <input type="date" value={log.logDate || ""} onChange={(e) => patchLog(log.id, "logDate", e.target.value)} /> : log.logDate || "—"}</td>
                    <td>{asset.code || "—"}</td>
                    <td>{asset.name || "—"}</td>
                    <td>{regionMap[asset.regionId]?.name || "—"}</td>
                    <td>{locationMap[asset.locationId]?.name || "—"}</td>
                    <td>{editing ? <select value={log.processType || ""} onChange={(e) => patchLog(log.id, "processType", e.target.value)}>{PROCESS_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select> : log.processType || "—"}</td>
                    <td>{editing ? <input value={log.issue || ""} onChange={(e) => patchLog(log.id, "issue", e.target.value)} /> : log.issue || "—"}</td>
                    <td>{editing ? <input value={log.cause || ""} onChange={(e) => patchLog(log.id, "cause", e.target.value)} /> : log.cause || "—"}</td>
                    <td>{editing ? <input value={log.solution || ""} onChange={(e) => patchLog(log.id, "solution", e.target.value)} /> : log.solution || "—"}</td>
                    <td>{editing ? <input value={log.material || ""} onChange={(e) => patchLog(log.id, "material", e.target.value)} /> : log.material || "—"}</td>
                    <td>{editing ? <div className="equipment-inline-cost"><input type="number" min="0" value={log.unitPrice || 0} onChange={(e) => patchLog(log.id, "unitPrice", e.target.value)} /><input type="number" min="0" value={log.qty || 0} onChange={(e) => patchLog(log.id, "qty", e.target.value)} /></div> : `${money(log.totalCost)}đ`}</td>
                    <td>{editing ? <input value={log.technician || ""} onChange={(e) => patchLog(log.id, "technician", e.target.value)} /> : log.technician || "—"}</td>
                    <td>{editing ? <select value={log.afterStatus || ""} onChange={(e) => patchLog(log.id, "afterStatus", e.target.value)}>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select> : log.afterStatus || "—"}</td>
                    <td>{editing ? <input value={log.note || ""} onChange={(e) => patchLog(log.id, "note", e.target.value)} /> : log.note || "—"}</td>
                    <td>
                      <button className="equipment-btn equipment-btn--icon" title={editing ? "Hoàn tất" : "Sửa"} onClick={() => setEditingId(editing ? "" : log.id)}>{editing ? "✓" : "✎"}</button>
                      <button className="equipment-btn equipment-btn--icon danger" title="Xoá" onClick={() => softDelete(log.id)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={15} className="equipment-empty">Không có dữ liệu theo bộ lọc hiện tại.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
